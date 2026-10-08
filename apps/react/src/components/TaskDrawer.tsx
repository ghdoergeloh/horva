import type { CalendarDateTime } from "@internationalized/date";
import { useRef, useState } from "react";
import {
  fromDate,
  getLocalTimeZone,
  toCalendarDateTime,
  toZoned,
} from "@internationalized/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AlertDialog } from "@horva/ui/AlertDialog";
import { Button } from "@horva/ui/Button";
import { Checkbox } from "@horva/ui/Checkbox";
import { CheckboxGroup } from "@horva/ui/CheckboxGroup";
import { ProjectDot } from "@horva/ui/Chip";
import { DateTimePicker } from "@horva/ui/DateTimePicker";
import { Link } from "@horva/ui/Link";
import { Loader } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";
import { Select, SelectItem } from "@horva/ui/Select";
import { TextField } from "@horva/ui/TextField";

import { RecurrenceRulePicker } from "#/components/RecurrenceRulePicker.js";
import { Sheet } from "#/components/Sheet.js";
import { useMocoConfigured, useRemoteMocoProjects } from "#/lib/mocoQueries.js";
import { client } from "#/lib/orpc.js";
import { labelChanges } from "#/lib/taskUtils.js";

type Task = NonNullable<Awaited<ReturnType<typeof client.task.get>>["task"]>;

export function TaskDrawer({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const { data: task } = useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: async () => (await client.task.get({ id })).task,
  });

  return (
    <Sheet title={t("drawer.taskTitle")} onClose={onClose}>
      {task ? (
        // Keyed so local edit state re-initialises when switching tasks.
        <TaskDrawerBody key={task.id} task={task} onClose={onClose} />
      ) : (
        <Loader size={24} label={t("loading")} />
      )}
    </Sheet>
  );
}

function TaskDrawerBody({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const id = task.id;

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: async () => (await client.label.list()).labels,
  });

  // Same key/fn as the sidebar, so this shares its cache entry.
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await client.project.list({})).projects,
  });

  const mocoConfigured = useMocoConfigured();

  const [name, setName] = useState(task.name);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [newLink, setNewLink] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof client.task.update>[0]) =>
      client.task.update(input),
    onSuccess: invalidate,
  });

  const tz = getLocalTimeZone();
  const [scheduled, setScheduled] = useState<CalendarDateTime | null>(() =>
    task.scheduledAt
      ? toCalendarDateTime(fromDate(new Date(task.scheduledAt), tz))
      : null,
  );

  const draft = useRef(scheduled);
  const saved = useRef(scheduled?.toString() ?? null);

  const planMutation = useMutation({
    mutationFn: (date: Date | null) => client.task.plan({ id, date }),
    onSuccess: invalidate,
  });

  function commitScheduled() {
    const value = draft.current;
    const key = value?.toString() ?? null;
    if (key === saved.current) return;
    saved.current = key;
    planMutation.mutate(value ? toZoned(value, tz).toDate() : null);
  }

  const statusMutation = useMutation({
    mutationFn: (action: "done" | "reopen" | "archive") =>
      action === "done"
        ? client.task.done({ id })
        : action === "reopen"
          ? client.task.reopen({ id })
          : client.task.archive({ id }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.task.delete({ id }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== task.name) {
      updateMutation.mutate({ id, name: trimmed });
    }
  }

  function commitNotes() {
    if (notes !== (task.notes ?? "")) {
      updateMutation.mutate({ id, notes: notes.length ? notes : null });
    }
  }

  // project.list() omits archived projects; keep the task's current project in
  // the options so an archived one still renders instead of showing blank.
  const projectOptions = projects.some((p) => p.id === task.project.id)
    ? projects
    : [task.project, ...projects];

  const assignedLabelIds = new Set(task.taskLabels.map((tl) => tl.label.id));
  const links = task.links;
  const isActivity = task.taskType === "activity";

  return (
    <>
      <TextField
        label={t("drawer.name")}
        value={name}
        onChange={setName}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitName();
        }}
      />

      <Select
        label={t("drawer.project")}
        value={String(task.project.id)}
        onChange={(value) => {
          const projectId = Number(value);
          if (projectId !== task.project.id) {
            updateMutation.mutate({ id, projectId });
          }
        }}
      >
        {projectOptions.map((project) => (
          <SelectItem
            key={project.id}
            id={String(project.id)}
            textValue={project.name}
          >
            <ProjectDot color={project.color} />
            <span className="truncate">{project.name}</span>
          </SelectItem>
        ))}
      </Select>

      {allLabels.length > 0 && (
        <CheckboxGroup
          label={t("drawer.labels")}
          value={[...assignedLabelIds].map(String)}
          onChange={(values) =>
            updateMutation.mutate({
              id,
              ...labelChanges(assignedLabelIds, new Set(values.map(Number))),
            })
          }
        >
          {allLabels.map((label) => (
            <Checkbox key={label.id} value={String(label.id)}>
              {label.name}
            </Checkbox>
          ))}
        </CheckboxGroup>
      )}

      <DateTimePicker
        label={t("drawer.scheduledAt")}
        value={scheduled}
        onChange={(value) => {
          draft.current = value;
          setScheduled(value);
        }}
        // Typing changes the value per segment; it is saved once, when the
        // field loses the focus or the calendar closes.
        onBlur={commitScheduled}
        onOpenChange={(isOpen) => {
          if (!isOpen) commitScheduled();
        }}
      />

      {isActivity && (
        <div className="space-y-2">
          <p className="text-foreground text-sm font-medium">
            {t("drawer.recurrence")}
          </p>
          <RecurrenceRulePicker
            value={task.recurrenceRule}
            scheduledAt={task.scheduledAt ? new Date(task.scheduledAt) : null}
            onChange={(rule) =>
              updateMutation.mutate({ id, recurrenceRule: rule })
            }
          />
        </div>
      )}

      {/* No TextArea in @horva/ui yet; the styles follow its TextField. */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`task-notes-${String(id)}`}
          className="text-foreground text-sm font-medium"
        >
          {t("drawer.notes")}
        </label>
        <textarea
          id={`task-notes-${String(id)}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commitNotes}
          rows={4}
          placeholder={t("drawer.notesPlaceholder")}
          className="border-input-border bg-input text-foreground text-body placeholder:text-muted-foreground focus-visible:outline-ring min-h-20 w-full rounded-md border px-2.5 py-2 outline-offset-1 focus-visible:outline-2"
        />
      </div>

      <div className="space-y-2">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.links")}
        </p>
        {links.length > 0 && (
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link} className="flex items-center gap-2">
                <Link
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body min-w-0 flex-1 truncate"
                >
                  {link}
                </Link>
                <Button
                  variant="quiet"
                  size="sm"
                  onPress={() =>
                    updateMutation.mutate({ id, removeLinks: [link] })
                  }
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t("drawer.removeLink")}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newLink.trim();
            if (!v || links.includes(v)) return;
            updateMutation.mutate({ id, addLinks: [v] });
            setNewLink("");
          }}
        >
          <TextField
            aria-label={t("drawer.addLink")}
            value={newLink}
            onChange={setNewLink}
            placeholder="https://…"
            type="url"
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            isDisabled={!newLink.trim()}
          >
            {t("drawer.add")}
          </Button>
        </form>
      </div>

      {mocoConfigured && (
        <MocoTaskOverride
          taskId={id}
          projectId={task.project.id}
          onSaved={invalidate}
        />
      )}

      {(updateMutation.isError ||
        planMutation.isError ||
        statusMutation.isError ||
        deleteMutation.isError) && (
        <p role="alert" className="text-destructive text-sm">
          {deleteMutation.isError
            ? t("drawer.deleteError")
            : statusMutation.isError && statusMutation.variables === "archive"
              ? t("drawer.archiveError")
              : t("drawer.saveError")}
        </p>
      )}

      <div className="border-border flex flex-wrap gap-2 border-t pt-5">
        {!isActivity &&
          (task.status === "done" ? (
            <Button
              variant="secondary"
              onPress={() => statusMutation.mutate("reopen")}
            >
              {t("drawer.reopen")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onPress={() => statusMutation.mutate("done")}
            >
              {t("drawer.markDone")}
            </Button>
          ))}
        {task.status !== "archived" && (
          <Button
            variant="secondary"
            onPress={() => statusMutation.mutate("archive")}
          >
            {t("drawer.archive")}
          </Button>
        )}
        <Button
          variant="quiet"
          className="text-destructive"
          isPending={deleteMutation.isPending}
          onPress={() => setConfirmDelete(true)}
        >
          {t("drawer.delete")}
        </Button>
      </div>

      <Modal isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog
          variant="destructive"
          title={t("drawer.deleteTaskTitle")}
          actionLabel={t("drawer.delete")}
          cancelLabel={t("common.cancel")}
          onAction={() => deleteMutation.mutate()}
        >
          {t("drawer.deleteTaskText")}
        </AlertDialog>
      </Modal>
    </>
  );
}

/**
 * Per-task Moco activity override. Only renders the selector once the task's
 * project is linked to a Moco project.
 */
function MocoTaskOverride({
  taskId,
  projectId,
  onSaved,
}: {
  taskId: number;
  projectId: number;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => (await client.project.get({ id: projectId })).project,
  });

  const remoteQuery = useRemoteMocoProjects();

  const { data: mapping } = useQuery({
    queryKey: ["moco", "taskMapping", taskId],
    queryFn: () => client.moco.taskMapping.get({ taskId }),
  });

  const setMutation = useMutation({
    mutationFn: (mocoTaskId: number | null) =>
      client.moco.taskMapping.set({ taskId, mocoTaskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["moco", "taskMapping", taskId],
      });
      onSaved();
    },
  });

  const linkedMocoProjectId = project?.mocoProjectId ?? null;

  if (linkedMocoProjectId === null) return null;

  const mocoProject = remoteQuery.data?.find(
    (p) => p.id === linkedMocoProjectId,
  );
  const current = mapping?.mocoTaskId ?? null;

  return (
    <div className="border-border space-y-1.5 border-t pt-5">
      <h3 className="text-heading text-foreground">
        {t("drawer.mocoOverride")}
      </h3>
      <p className="text-muted-foreground text-sm">
        {t("drawer.mocoOverrideHint")}
      </p>
      {remoteQuery.data ? (
        <Select
          aria-label={t("drawer.mocoOverride")}
          value={current === null ? "" : String(current)}
          onChange={(value) => setMutation.mutate(value ? Number(value) : null)}
        >
          <SelectItem id="">{t("drawer.mocoUseDefault")}</SelectItem>
          {(mocoProject?.tasks ?? [])
            .filter((task) => task.active)
            .map((task) => (
              <SelectItem key={task.id} id={String(task.id)}>
                {task.name}
              </SelectItem>
            ))}
        </Select>
      ) : (
        <Button
          variant="secondary"
          isPending={remoteQuery.isFetching}
          onPress={() => void remoteQuery.refetch()}
        >
          {t("moco.loadProjects")}
        </Button>
      )}
    </div>
  );
}
