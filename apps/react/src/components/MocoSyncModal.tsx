import { useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Checkbox } from "@horva/ui/Checkbox";
import { Dialog } from "@horva/ui/Dialog";
import { Loader } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";

import { FormattedMinutes } from "#/components/FormattedMinutes.js";
import { client } from "#/lib/orpc.js";

type PreviewLine = Awaited<
  ReturnType<typeof client.moco.preview>
>["lines"][number];

/** Stable per-row key matching the server's (date, taskId) aggregation. */
function rowKey(line: PreviewLine): string {
  return `${line.date}|${line.taskId === null ? "no_task" : String(line.taskId)}`;
}

interface ProjectGroup {
  key: string;
  projectName: string;
  mocoProjectId: number | undefined;
  lines: PreviewLine[];
}

export interface MocoSyncModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  from: Date;
  to: Date;
}

/**
 * The dialog that sends the logged time of a period to Moco. It lists the
 * rows that can be sent, grouped by project; the user picks which. Focus
 * goes back to the button that opened it.
 */
export function MocoSyncModal({
  isOpen,
  onOpenChange,
  from,
  to,
}: MocoSyncModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <MocoSyncDialog from={from} to={to} onClose={() => onOpenChange(false)} />
    </Modal>
  );
}

function MocoSyncDialog({
  from,
  to,
  onClose,
}: {
  from: Date;
  to: Date;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const titleId = useId();

  const {
    data: lines = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["moco", "preview", from.toISOString(), to.toISOString()],
    queryFn: async () => (await client.moco.preview({ from, to })).lines,
  });

  // Moco projects with their activities, to resolve target names.
  const { data: remoteProjects = [], isPending: remotePending } = useQuery({
    queryKey: ["moco", "remoteProjects"],
    queryFn: async () => (await client.moco.remoteProjects()).projects,
    staleTime: 60_000,
  });

  const mocoProjectNames = useMemo(
    () => new Map(remoteProjects.map((p) => [p.id, p.name])),
    [remoteProjects],
  );
  const mocoTaskNames = useMemo(
    () =>
      new Map(
        remoteProjects.flatMap((p) =>
          p.tasks.map((task) => [task.id, task.name] as const),
        ),
      ),
    [remoteProjects],
  );

  function mocoName(map: Map<number, string>, id: number | undefined): string {
    if (id === undefined) return "–";
    if (remotePending) return "…";
    return map.get(id) ?? `#${String(id)}`;
  }

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  // Selected row keys. Default: nothing selected (user opts in).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const syncMutation = useMutation({
    mutationFn: () =>
      client.moco.sync({
        from,
        to,
        select: lines.flatMap((l) =>
          l.status === "syncable" &&
          l.taskId !== null &&
          selected.has(rowKey(l))
            ? [{ date: l.date, taskId: l.taskId }]
            : [],
        ),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["moco", "preview"] });
    },
  });

  const syncable = useMemo(
    () => lines.filter((l) => l.status === "syncable"),
    [lines],
  );
  const skippedCount = lines.length - syncable.length;
  const selectedCount = syncable.filter((l) => selected.has(rowKey(l))).length;
  const allSelected = syncable.length > 0 && selectedCount === syncable.length;

  // Only syncable rows are shown, grouped by their Horva project.
  const projectGroups = useMemo(() => {
    const map = new Map<string, ProjectGroup>();
    for (const l of syncable) {
      const key = String(l.projectId ?? "none");
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          projectName: l.projectName,
          mocoProjectId: l.mocoProjectId,
          lines: [],
        };
        map.set(key, group);
      }
      group.lines.push(l);
    }
    return [...map.values()];
  }, [syncable]);

  function setMany(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  const result = syncMutation.data;
  const done = syncMutation.isSuccess;

  return (
    <Dialog
      aria-labelledby={titleId}
      className="flex max-h-[inherit] flex-col p-0"
    >
      <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 id={titleId} className="text-title">
          {t("reports.transfer")}
        </h2>
        <Button
          variant="quiet"
          size="sm"
          onPress={onClose}
          aria-label={t("moco.close")}
        >
          <X aria-hidden />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader size={32} label={t("loading")} />
          </div>
        )}

        {isError && (
          <p className="text-body text-destructive">
            {error instanceof Error ? error.message : t("moco.previewError")}
          </p>
        )}

        {!isLoading && !isError && lines.length === 0 && (
          <p className="text-body">{t("moco.noData")}</p>
        )}

        {!isLoading &&
          !isError &&
          lines.length > 0 &&
          syncable.length === 0 && (
            <p className="text-body">{t("moco.noSyncable")}</p>
          )}

        {syncable.length > 0 && (
          <>
            <Checkbox
              isSelected={allSelected}
              onChange={(on) =>
                setMany(
                  syncable.map((l) => rowKey(l)),
                  on,
                )
              }
            >
              {t("moco.selectAll")}
            </Checkbox>

            <ul className="mt-3 flex flex-col gap-3">
              {projectGroups.map((group) => {
                const groupKeys = group.lines.map((l) => rowKey(l));
                const groupOn = groupKeys.every((k) => selected.has(k));
                const groupSeconds = group.lines.reduce(
                  (s, l) => s + l.seconds,
                  0,
                );
                return (
                  <li key={group.key}>
                    <div className="border-border flex items-center gap-3 border-b pb-1.5">
                      <Checkbox
                        aria-label={group.projectName}
                        isSelected={groupOn}
                        onChange={(on) => setMany(groupKeys, on)}
                      />
                      <span className="text-body-strong flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                        <span className="truncate">{group.projectName}</span>
                        <ArrowRight
                          aria-label={t("reports.transferTo")}
                          className="text-muted-foreground size-3.5 shrink-0"
                        />
                        <span className="truncate font-normal">
                          {mocoName(mocoProjectNames, group.mocoProjectId)}
                        </span>
                      </span>
                      <span className="type-duration shrink-0">
                        <FormattedMinutes
                          minutes={Math.round(groupSeconds / 60)}
                        />
                      </span>
                    </div>
                    <ul>
                      {group.lines.map((line) => {
                        const key = rowKey(line);
                        return (
                          <li
                            key={key}
                            className="border-border flex items-center gap-3 border-b py-1.5"
                          >
                            <Checkbox
                              aria-label={`${line.date} ${line.taskName}`}
                              isSelected={selected.has(key)}
                              onChange={(on) => setMany([key], on)}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="text-body [overflow-wrap:anywhere]">
                                {line.taskName || "–"}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatDate(line.date)} ·{" "}
                                {mocoName(mocoTaskNames, line.mocoTaskId)}
                              </span>
                            </span>
                            <span className="type-duration-small shrink-0">
                              <FormattedMinutes
                                minutes={Math.round(line.seconds / 60)}
                              />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <p className="text-muted-foreground text-xs">
          {t("moco.selectionSummary", {
            selected: selectedCount,
            syncable: syncable.length,
            skipped: skippedCount,
          })}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {done && result && (
            <span role="status" className="text-small flex items-center gap-1">
              <Check aria-hidden className="size-4" />
              {t("moco.syncDone", {
                created: result.created,
                failed: result.failed.length,
              })}
            </span>
          )}
          {syncMutation.isError && (
            <span role="alert" className="text-small text-destructive">
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : t("moco.syncError")}
            </span>
          )}
          {done ? (
            <Button variant="primary" onPress={onClose}>
              {t("moco.close")}
            </Button>
          ) : (
            <Button
              variant="primary"
              isDisabled={selectedCount === 0}
              isPending={syncMutation.isPending}
              pendingLabel={t("loading")}
              onPress={() => syncMutation.mutate()}
            >
              {t("moco.confirmSync", { count: selectedCount })}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
