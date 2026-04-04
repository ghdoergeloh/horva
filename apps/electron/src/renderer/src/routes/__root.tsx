import type { ReactNode } from "react";
import { Component, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import {
  ChartBar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Plus,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@timetracker/ui/Button";
import { ColorPicker } from "@timetracker/ui/ColorPicker";
import { TextField } from "@timetracker/ui/TextField";

import { AppIcon } from "~/components/AppIcon.js";
import { SlotBar } from "~/components/SlotBar.js";
import { ActiveSlotProvider } from "~/contexts/ActiveSlotContext.js";
import { SettingsProvider } from "~/contexts/SettingsContext.js";
import i18n from "~/i18n/index.js";

interface ProjectRow {
  id: number;
  name: string;
  color: string;
}

const COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#64748b",
];

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const createProjectMutation = useMutation({
    mutationFn: ({ name: n, color: c }: { name: string; color: string }) =>
      window.api.projects.create({ name: n, color: c }) as Promise<ProjectRow>,
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      window.location.hash = `/tasks/${String(project.id)}`;
      onClose();
    },
  });

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProjectMutation.mutate({ name: trimmed, color });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-80 rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {t("project.new")}
          </h2>
          <Button
            variant="quiet"
            onPress={onClose}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600"
            aria-label={t("project.cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <TextField
            autoFocus
            value={name}
            onChange={setName}
            placeholder={t("project.namePlaceholder")}
            className="min-w-0 flex-1"
          />
        </div>
        <div className="mb-4">
          <span className="mb-1.5 block text-xs text-gray-500">
            {t("project.color")}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <Button
                key={c}
                variant="quiet"
                onPress={() => setColor(c)}
                className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                  color === c ? "ring-2 ring-gray-400 ring-offset-1" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={t("project.color")}
              />
            ))}
            <ColorPicker
              aria-label={t("project.customColor")}
              value={color}
              onChange={(val) => {
                setColor(val.toString());
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>
            {t("project.cancel")}
          </Button>
          <Button
            variant="primary"
            isDisabled={!name.trim() || createProjectMutation.isPending}
            onPress={handleSubmit}
          >
            {t("project.create")}
          </Button>
        </div>
      </div>
    </div>
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
          <p className="text-sm font-semibold text-red-600">
            {i18n.t("error.occurred")}
          </p>
          <p className="mt-1 text-xs text-gray-400">{this.state.message}</p>
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

function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const [tasksOpen, setTasksOpen] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => window.api.projects.list() as Promise<ProjectRow[]>,
  });

  const isTasksActive = location.pathname.startsWith("/tasks/");

  const topNavItems = [
    { to: "/", label: t("nav.today"), icon: LayoutDashboard },
    { to: "/timeline", label: t("nav.timeline"), icon: Clock },
    { to: "/reports", label: t("nav.reports"), icon: ChartBar },
  ] as const;

  return (
    <SettingsProvider>
      <ActiveSlotProvider>
        <div className="flex h-screen bg-gray-50">
          {showNewProject && (
            <NewProjectModal onClose={() => setShowNewProject(false)} />
          )}

          {/* Sidebar */}
          <aside className="flex w-48 flex-col border-r border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <AppIcon size={34} />
                <span className="text-sm font-semibold tracking-tight text-gray-900">
                  {t("app.title")}
                </span>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {/* Today */}
              {(() => {
                const { to, label, icon: Icon } = topNavItems[0];
                const isActive = location.pathname === "/";
                return (
                  <a
                    href={`#${to}`}
                    className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                );
              })()}

              {/* Tasks collapsible section */}
              <div className="mb-1">
                <div
                  className={`flex items-center rounded-md text-sm transition-colors ${
                    isTasksActive
                      ? "bg-indigo-50 font-medium text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="flex flex-1 items-center gap-3 px-3 py-2">
                    <CheckSquare className="h-4 w-4 flex-shrink-0" />
                    {t("nav.tasks")}
                  </span>
                  <Button
                    variant="quiet"
                    onPress={() => setTasksOpen((v) => !v)}
                    className="px-2 py-2 opacity-50 hover:opacity-100"
                    aria-label={
                      tasksOpen ? t("project.collapse") : t("project.expand")
                    }
                  >
                    {tasksOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {tasksOpen && (
                  <div className="mt-0.5 ml-3 space-y-0.5 border-l border-gray-100 pl-3">
                    {projects.map((project) => {
                      const isProjectActive =
                        location.pathname === `/tasks/${String(project.id)}`;
                      return (
                        <a
                          key={project.id}
                          href={`#/tasks/${String(project.id)}`}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                            isProjectActive
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                        </a>
                      );
                    })}
                    <Button
                      variant="quiet"
                      onPress={() => setShowNewProject(true)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        {t("nav.newProject")}
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Timeline + Reports */}
              {topNavItems.slice(1).map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to;
                return (
                  <a
                    key={to}
                    href={`#${to}`}
                    className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                );
              })}

              {/* Labels */}
              {(() => {
                const isActive = location.pathname === "/labels";
                return (
                  <a
                    href="#/labels"
                    className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Tag className="h-4 w-4" />
                    {t("nav.labels")}
                  </a>
                );
              })()}
            </nav>

            {/* Settings link */}
            <div className="border-t border-gray-100 p-2">
              {(() => {
                const isActive = location.pathname === "/settings";
                return (
                  <a
                    href="#/settings"
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    {t("nav.settings")}
                  </a>
                );
              })()}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <SlotBar />
            <main className="flex-1 overflow-auto p-6">
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
            </main>
          </div>
        </div>
      </ActiveSlotProvider>
    </SettingsProvider>
  );
}

export const Route = createRootRoute({ component: AppShell });
