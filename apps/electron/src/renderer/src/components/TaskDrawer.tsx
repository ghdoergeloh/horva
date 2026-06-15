import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Checkbox } from "@horva/ui/Checkbox";
import { Select, SelectItem } from "@horva/ui/Select";
import { TextField } from "@horva/ui/TextField";

import { RecurrenceRulePicker } from "~/components/RecurrenceRulePicker.js";
import { Sheet } from "~/components/Sheet.js";
import { PlanButton } from "~/components/TaskEditControls.js";
import { useMocoConfigured, useRemoteMocoProjects } from "~/lib/mocoQueries.js";
import { client } from "~/lib/orpc.js";

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
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
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

  const planMutation = useMutation({
    mutationFn: (date: string | null) =>
      client.task.plan({ id, date: date ? new Date(date) : null }),
    onSuccess: invalidate,
  });

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

  const assignedLabelIds = new Set(task.taskLabels.map((tl) => tl.label.id));
  const links = task.links;
  const isActivity = task.taskType === "activity";

  return (
    <>
      {/* Name */}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.name")}
        </p>
        <TextField
          aria-label={t("drawer.name")}
          value={name}
          onChange={setName}
          onBlur={commitName}
        />
      </div>

      {/* Project (read-only) */}
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 flex-shrink-0 rounded-sm"
          style={{ backgroundColor: task.project.color }}
        />
        <span className="text-muted-foreground text-sm">
          {task.project.name}
        </span>
      </div>

      {/* Labels */}
      {allLabels.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-foreground text-sm font-medium">
            {t("drawer.labels")}
          </p>
          <div className="space-y-1.5">
            {allLabels.map((label) => (
              <Checkbox
                key={label.id}
                isSelected={assignedLabelIds.has(label.id)}
                onChange={(selected) =>
                  updateMutation.mutate(
                    selected
                      ? { id, addLabelIds: [label.id] }
                      : { id, removeLabelIds: [label.id] },
                  )
                }
              >
                {label.name}
              </Checkbox>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled date */}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.scheduledAt")}
        </p>
        <PlanButton
          scheduledDate={task.scheduledAt}
          onPlan={(date) => planMutation.mutate(date)}
        />
      </div>

      {/* Recurrence (activities only) */}
      {isActivity && (
        <div className="space-y-1.5">
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

      {/* Notes */}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.notes")}
        </p>
        <textarea
          aria-label={t("drawer.notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commitNotes}
          rows={3}
          className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      </div>

      {/* Links */}
      <div className="space-y-1.5">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.links")}
        </p>
        {links.map((link) => (
          <div key={link} className="flex items-center gap-2">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-primary min-w-0 flex-1 truncate text-sm hover:underline"
            >
              {link}
            </a>
            <Button
              variant="quiet"
              onPress={() => updateMutation.mutate({ id, removeLinks: [link] })}
              className="text-muted-foreground hover:text-destructive rounded p-0.5"
              aria-label={t("drawer.removeLink")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <TextField
            aria-label={t("drawer.addLink")}
            value={newLink}
            onChange={setNewLink}
            placeholder="https://…"
            className="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            isDisabled={!newLink.trim()}
            onPress={() => {
              const v = newLink.trim();
              if (!v || links.includes(v)) return;
              updateMutation.mutate({ id, addLinks: [v] });
              setNewLink("");
            }}
          >
            {t("drawer.add")}
          </Button>
        </div>
      </div>

      {/* Moco activity override */}
      {mocoConfigured && (
        <MocoTaskOverride
          taskId={id}
          projectId={task.project.id}
          onSaved={invalidate}
        />
      )}

      {/* Status / actions */}
      <div className="border-border space-y-3 border-t pt-5">
        <div className="flex flex-wrap gap-2">
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
          {confirmDelete ? (
            <>
              <Button
                variant="destructive"
                isPending={deleteMutation.isPending}
                onPress={() => deleteMutation.mutate()}
              >
                {t("drawer.confirmDelete")}
              </Button>
              <Button variant="quiet" onPress={() => setConfirmDelete(false)}>
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <Button
              variant="quiet"
              className="text-destructive"
              onPress={() => setConfirmDelete(true)}
            >
              {t("drawer.delete")}
            </Button>
          )}
        </div>
      </div>
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
      <p className="text-foreground text-sm font-semibold">
        {t("drawer.mocoOverride")}
      </p>
      <p className="text-muted-foreground text-xs">
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
