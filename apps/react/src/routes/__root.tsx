import type { ReactNode } from "react";
import { Component, useEffect, useId, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  ChartBar,
  CheckSquare,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Menu as MenuIcon,
  Plus,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ProjectColor } from "@horva/ui/Chip";
import { Button } from "@horva/ui/Button";
import { ProjectDot } from "@horva/ui/Chip";
import { Dialog } from "@horva/ui/Dialog";
import { Form } from "@horva/ui/Form";
import { HorvaWordmark } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";
import { ProjectColorPicker } from "@horva/ui/ProjectColorPicker";
import { TextField } from "@horva/ui/TextField";

import { DetailDrawerHost } from "#/components/DetailDrawerHost.js";
import { SlotBar } from "#/components/SlotBar.js";
import { nextProjectColor } from "#/components/timerRules.js";
import { ActiveSlotProvider } from "#/contexts/ActiveSlotContext.js";
import { DetailDrawerProvider } from "#/contexts/DetailDrawerContext.js";
import { SettingsProvider } from "#/contexts/SettingsContext.js";
import {
  projectDropData,
  projectDroppableId,
  TaskDragProvider,
  useTaskDrag,
} from "#/contexts/TaskDragContext.js";
import i18n from "#/i18n/index.js";
import { client } from "#/lib/orpc.js";
import { useEscapeKey } from "#/lib/useEscapeKey.js";

/** The dialog "New project": a name and a color. */
function NewProjectModal({
  isOpen,
  projects,
  onClose,
}: {
  isOpen: boolean;
  /** The existing projects; the least used color is the default. */
  projects: readonly { color: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<ProjectColor | null>(null);
  const color = picked ?? nextProjectColor(projects);

  const createProjectMutation = useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const res = await client.project.create(input);
      return res.project;
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({
        to: "/tasks/$projectId",
        params: { projectId: String(project.id) },
      });
      close();
    },
  });

  function close() {
    setName("");
    setPicked(null);
    createProjectMutation.reset();
    onClose();
  }

  return (
    <Modal
      isDismissable
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog aria-labelledby={titleId}>
        <Form
          className="gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || createProjectMutation.isPending) return;
            createProjectMutation.mutate({ name: trimmed, color });
          }}
        >
          <h2 id={titleId} className="text-title text-foreground">
            {t("project.new")}
          </h2>
          <TextField
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- The dialog opens on a user action. Focus goes to the name.
            autoFocus
            label={t("project.name")}
            placeholder={t("project.namePlaceholder")}
            value={name}
            onChange={setName}
            isRequired
          />
          <ProjectColorPicker
            label={t("project.color")}
            value={color}
            onChange={setPicked}
            labels={{
              presets: t("projectColors.presets", {
                returnObjects: true,
              }) as string[],
              custom: t("projectColors.custom"),
              customPlaceholder: t("projectColors.customPlaceholder"),
              invalid: t("projectColors.invalid"),
            }}
          />
          {createProjectMutation.isError && (
            <p role="alert" className="text-destructive text-small">
              {t("error.occurred")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={close}>
              {t("project.cancel")}
            </Button>
            <Button
              type="submit"
              isDisabled={!name.trim()}
              isPending={createProjectMutation.isPending}
            >
              {t("project.create")}
            </Button>
          </div>
        </Form>
      </Dialog>
    </Modal>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : i18n.t("error.unknown");
    return { hasError: true, message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p role="alert" className="text-destructive text-body-strong">
            {i18n.t("error.occurred")}
          </p>
          <p className="text-muted-foreground text-small mt-1">
            {this.state.message}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onPress={() => this.setState({ hasError: false, message: "" })}
          >
            {i18n.t("error.retry")}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Classes of an entry in the sidebar. */
function navItemClass(isActive: boolean, extra = "") {
  return `outline-ring flex min-h-9 items-center gap-3 rounded-md px-3 text-body outline-offset-2 transition-colors focus-visible:outline-2 ${
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  } ${extra}`;
}

/**
 * A project entry in the sidebar, doubling as a drop target for tasks dragged
 * from any task list.
 */
function ProjectNavItem({
  project,
  isActive,
  onNavigate,
}: {
  project: { id: number; name: string; color: string };
  isActive: boolean;
  onNavigate: () => void;
}) {
  const { activeTask } = useTaskDrag();
  const { setNodeRef, isOver } = useDroppable({
    id: projectDroppableId(project.id),
    data: projectDropData(project.id),
  });

  // Only offer the project as a target while dragging a task that isn't
  // already in it.
  const isDropCandidate =
    activeTask !== null && activeTask.projectId !== project.id;
  const isDropTarget = isOver && isDropCandidate;

  return (
    <Link
      ref={setNodeRef}
      onClick={onNavigate}
      to="/tasks/$projectId"
      params={{ projectId: String(project.id) }}
      // Suppress the browser's native link dragging so it can't fight dnd-kit.
      draggable={false}
      className={navItemClass(
        isActive || isDropTarget,
        `min-h-8 gap-2 px-2 ${
          isDropTarget
            ? "ring-primary ring-2"
            : isDropCandidate
              ? "ring-primary/40 ring-dashed ring-1"
              : ""
        }`,
      )}
    >
      <ProjectDot color={project.color} />
      <span className="truncate">{project.name}</span>
    </Link>
  );
}

/** The navigation of the app: pages, projects and the settings. */
function Sidebar({
  id,
  isOpen,
  onClose,
  onNavigate,
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called on every link, also on the one to the page that is open. */
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [tasksOpen, setTasksOpen] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const projectsId = useId();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await client.project.list({});
      return res.projects;
    },
  });

  const path = location.pathname;

  return (
    <aside
      id={id}
      aria-label={t("nav.main")}
      className={`border-sidebar-border bg-sidebar text-sidebar-foreground flex w-60 shrink-0 flex-col border-r max-md:fixed max-md:inset-y-0 max-md:start-0 max-md:z-(--z-modal) max-md:max-w-[85vw] max-md:shadow-lg motion-safe:max-md:transition-[translate] motion-safe:max-md:duration-200 ${
        isOpen ? "" : "max-md:invisible max-md:-translate-x-full"
      }`}
    >
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <HorvaWordmark size={28} label={t("app.title")} />
        <Button
          variant="quiet"
          className="md:hidden"
          aria-label={t("nav.closeMenu")}
          onPress={onClose}
        >
          <X aria-hidden />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        <Link
          onClick={onNavigate}
          to="/"
          className={navItemClass(path === "/")}
        >
          <LayoutDashboard aria-hidden className="size-5" />
          {t("nav.today")}
        </Link>

        <div>
          <div className="flex items-center gap-1">
            <Link
              onClick={onNavigate}
              to="/tasks"
              className={navItemClass(path === "/tasks", "flex-1")}
            >
              <CheckSquare aria-hidden className="size-5" />
              {t("nav.tasks")}
            </Link>
            <Button
              variant="quiet"
              size="sm"
              aria-expanded={tasksOpen}
              aria-controls={projectsId}
              aria-label={t("nav.projects")}
              onPress={() => setTasksOpen((v) => !v)}
            >
              <ChevronRight
                aria-hidden
                className={`motion-safe:transition-transform ${tasksOpen ? "rotate-90" : ""}`}
              />
            </Button>
          </div>
          <div
            id={projectsId}
            hidden={!tasksOpen}
            className="border-sidebar-border ms-5 mt-1 space-y-0.5 border-s ps-2"
          >
            {projects.map((project) => (
              <ProjectNavItem
                key={project.id}
                project={project}
                isActive={path === `/tasks/${String(project.id)}`}
                onNavigate={onNavigate}
              />
            ))}
            <Button
              variant="quiet"
              size="sm"
              className="text-sidebar-foreground w-full justify-start px-2"
              onPress={() => setShowNewProject(true)}
            >
              <Plus aria-hidden />
              {t("nav.newProject")}
            </Button>
          </div>
        </div>

        <Link
          onClick={onNavigate}
          to="/timeline"
          className={navItemClass(path === "/timeline")}
        >
          <Clock aria-hidden className="size-5" />
          {t("nav.timeline")}
        </Link>
        <Link
          onClick={onNavigate}
          to="/reports"
          className={navItemClass(path === "/reports")}
        >
          <ChartBar aria-hidden className="size-5" />
          {t("nav.reports")}
        </Link>
        <Link
          onClick={onNavigate}
          to="/labels"
          className={navItemClass(path === "/labels")}
        >
          <Tag aria-hidden className="size-5" />
          {t("nav.labels")}
        </Link>
      </nav>

      <div className="border-sidebar-border border-t p-2">
        <Link
          onClick={onNavigate}
          to="/settings"
          className={navItemClass(path === "/settings")}
        >
          <Settings aria-hidden className="size-5" />
          {t("nav.settings")}
        </Link>
      </div>
      <NewProjectModal
        isOpen={showNewProject}
        projects={projects}
        onClose={() => setShowNewProject(false)}
      />
    </aside>
  );
}

/**
 * The frame of every page: the sidebar, the timer on top and the page. On a
 * phone the sidebar is an overlay that the menu button opens.
 */
function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarId = useId();
  const menuButtonId = useId();
  // The page on which the menu was opened; choosing another page closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.pathname;

  // Set when the menu closes by Escape or a button: the focus goes back to
  // the menu button once the page is no longer inert.
  const restoreFocus = useRef(false);

  function closeMenu() {
    restoreFocus.current = true;
    setMenuOpenOn(null);
  }

  useEffect(() => {
    if (menuOpen || !restoreFocus.current) return;
    restoreFocus.current = false;
    document.getElementById(menuButtonId)?.focus();
  }, [menuOpen, menuButtonId]);

  // The overlay takes the focus; a wider window shows the sidebar in place.
  useEffect(() => {
    if (!menuOpen) return;
    document
      .getElementById(sidebarId)
      ?.querySelector<HTMLElement>("nav a")
      ?.focus();
    const wide = window.matchMedia("(min-width: 48rem)");
    const onChange = () => {
      if (wide.matches) setMenuOpenOn(null);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [menuOpen, sidebarId]);

  useEscapeKey(menuOpen ? closeMenu : noop);

  return (
    <SettingsProvider>
      <ActiveSlotProvider>
        <DetailDrawerProvider>
          <TaskDragProvider>
            <div className="bg-background flex h-dvh">
              {menuOpen && (
                <div
                  // A click on the backdrop is a mouse shortcut. Keyboard
                  // users close the menu with Escape or the close button.
                  role="presentation"
                  className="bg-foreground/40 fixed inset-0 z-(--z-overlay) md:hidden"
                  onClick={closeMenu}
                />
              )}
              <Sidebar
                id={sidebarId}
                isOpen={menuOpen}
                onClose={closeMenu}
                onNavigate={() => setMenuOpenOn(null)}
              />

              <div
                className="flex min-w-0 flex-1 flex-col overflow-hidden"
                inert={menuOpen}
              >
                <header className="flex items-center gap-2 px-6 pt-4 max-md:px-3 max-md:pt-3">
                  <Button
                    id={menuButtonId}
                    variant="secondary"
                    className="md:hidden"
                    aria-label={t("nav.openMenu")}
                    aria-expanded={menuOpen}
                    aria-controls={sidebarId}
                    onPress={() => setMenuOpenOn(location.pathname)}
                  >
                    <MenuIcon aria-hidden />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <SlotBar />
                  </div>
                </header>
                <main className="relative flex-1 overflow-auto p-6 max-md:p-3 max-md:pt-6">
                  <RouteErrorBoundary>
                    <Outlet />
                  </RouteErrorBoundary>
                </main>
              </div>
              <DetailDrawerHost />
            </div>
          </TaskDragProvider>
        </DetailDrawerProvider>
      </ActiveSlotProvider>
    </SettingsProvider>
  );
}

function noop() {
  // Nothing to close.
}

export const Route = createRootRoute({ component: AppShell });
