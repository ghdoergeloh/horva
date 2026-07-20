import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Checkbox } from "@horva/ui/Checkbox";

import { FormattedMinutes } from "~/components/FormattedMinutes.js";
import { client } from "~/lib/orpc.js";

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

export function MocoSyncModal({
  from,
  to,
  onClose,
}: {
  from: Date;
  to: Date;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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
    if (id === undefined) return "—";
    if (remotePending) return "…";
    return map.get(id) ?? `#${String(id)}`;
  }

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

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
    <div
      className="bg-foreground/30 fixed inset-0 z-50 flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-card flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border shadow-xl">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">
            {t("moco.syncTitle")}
          </h2>
          <Button
            variant="quiet"
            onPress={onClose}
            className="text-muted-foreground hover:text-foreground/80 rounded p-0.5"
            aria-label={t("moco.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {isLoading && (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          )}

          {isError && (
            <p className="text-destructive text-sm">
              {error instanceof Error ? error.message : t("moco.previewError")}
            </p>
          )}

          {!isLoading && !isError && lines.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("moco.noData")}</p>
          )}

          {!isLoading &&
            !isError &&
            lines.length > 0 &&
            syncable.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {t("moco.noSyncable")}
              </p>
            )}

          {syncable.length > 0 && (
            <>
              <div className="mb-3">
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
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-left text-xs">
                    <th className="w-6 py-1.5" />
                    <th className="py-1.5 pr-3 font-medium">
                      {t("moco.date")}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {t("moco.task")}
                    </th>
                    <th className="py-1.5 pr-3 font-medium">
                      {t("moco.mocoTask")}
                    </th>
                    <th className="py-1.5 text-right font-medium">
                      {t("moco.duration")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectGroups.map((group) => {
                    const groupKeys = group.lines.map((l) => rowKey(l));
                    const groupOn = groupKeys.every((k) => selected.has(k));
                    const groupSeconds = group.lines.reduce(
                      (s, l) => s + l.seconds,
                      0,
                    );
                    return (
                      <React.Fragment key={group.key}>
                        <tr className="border-border/50 border-b">
                          <td className="py-2">
                            <Checkbox
                              aria-label={group.projectName}
                              isSelected={groupOn}
                              onChange={(on) => setMany(groupKeys, on)}
                            />
                          </td>
                          <td colSpan={3} className="py-2 pr-3">
                            <span className="text-foreground inline-flex items-center gap-2 font-medium">
                              {group.projectName}
                              <ArrowRight
                                aria-hidden
                                className="text-muted-foreground h-3.5 w-3.5"
                              />
                              <span className="font-normal">
                                {mocoName(
                                  mocoProjectNames,
                                  group.mocoProjectId,
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="text-foreground py-2 text-right font-medium tabular-nums">
                            <FormattedMinutes
                              minutes={Math.round(groupSeconds / 60)}
                            />
                          </td>
                        </tr>
                        {group.lines.map((line) => {
                          const key = rowKey(line);
                          return (
                            <tr
                              key={key}
                              className="border-border/50 text-foreground border-b"
                            >
                              <td className="py-1.5">
                                <Checkbox
                                  aria-label={`${line.date} ${line.taskName}`}
                                  isSelected={selected.has(key)}
                                  onChange={() => toggleRow(key)}
                                />
                              </td>
                              <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                                {line.date}
                              </td>
                              <td className="py-1.5 pr-3">
                                {line.taskName || "—"}
                              </td>
                              <td className="text-muted-foreground py-1.5 pr-3">
                                {mocoName(mocoTaskNames, line.mocoTaskId)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                <FormattedMinutes
                                  minutes={Math.round(line.seconds / 60)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t px-5 py-4">
          <p className="text-muted-foreground text-xs">
            {t("moco.selectionSummary", {
              selected: selectedCount,
              syncable: syncable.length,
              skipped: skippedCount,
            })}
          </p>
          <div className="flex items-center gap-2">
            {done && result && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {t("moco.syncDone", {
                  created: result.created,
                  failed: result.failed.length,
                })}
              </span>
            )}
            {syncMutation.isError && (
              <span className="text-destructive text-xs">
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
                onPress={() => syncMutation.mutate()}
              >
                {t("moco.confirmSync", { count: selectedCount })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
