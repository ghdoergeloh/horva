import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Select, SelectItem } from "@horva/ui/Select";

import type {
  RemoteProject,
  useRemoteMocoProjects,
} from "~/lib/mocoQueries.js";
import { client } from "~/lib/orpc.js";

/**
 * The two linking dropdowns (Moco project + default activity) for a single
 * Horva project. Shared between the settings page and the project drawer.
 * Caller provides the loaded `remoteProjects`.
 */
export function MocoLinkFields({
  projectId,
  mocoProjectId,
  mocoDefaultTaskId,
  remoteProjects,
}: {
  projectId: number;
  mocoProjectId: number | null;
  mocoDefaultTaskId: number | null;
  remoteProjects: RemoteProject[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const linkMutation = useMutation({
    mutationFn: (input: {
      projectId: number;
      mocoProjectId: number | null;
      mocoDefaultTaskId: number | null;
    }) => client.moco.link.set(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const selectedMocoProject = remoteProjects.find(
    (p) => p.id === mocoProjectId,
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          {t("moco.mocoProject")}
        </p>
        <Select
          aria-label={t("moco.mocoProject")}
          value={mocoProjectId == null ? "" : String(mocoProjectId)}
          onChange={(value) => {
            // Changing the project resets the default activity.
            linkMutation.mutate({
              projectId,
              mocoProjectId: value ? Number(value) : null,
              mocoDefaultTaskId: null,
            });
          }}
        >
          <SelectItem id="">{t("moco.notLinked")}</SelectItem>
          {remoteProjects.map((p) => (
            <SelectItem key={p.id} id={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {selectedMocoProject && (
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">
            {t("moco.defaultTask")}
          </p>
          <Select
            aria-label={t("moco.defaultTask")}
            value={mocoDefaultTaskId == null ? "" : String(mocoDefaultTaskId)}
            onChange={(value) => {
              linkMutation.mutate({
                projectId,
                mocoProjectId,
                mocoDefaultTaskId: value ? Number(value) : null,
              });
            }}
          >
            <SelectItem id="">{t("moco.noDefaultTask")}</SelectItem>
            {selectedMocoProject.tasks
              .filter((task) => task.active)
              .map((task) => (
                <SelectItem key={task.id} id={String(task.id)}>
                  {task.name}
                </SelectItem>
              ))}
          </Select>
        </div>
      )}
    </div>
  );
}

/**
 * "Load Moco projects" button + error display, wired to a useRemoteMocoProjects
 * query. Shown when the remote list hasn't been loaded yet or to reload.
 */
export function MocoLoadButton({
  query,
}: {
  query: ReturnType<typeof useRemoteMocoProjects>;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        isPending={query.isFetching}
        onPress={() => void query.refetch()}
      >
        {query.data ? t("moco.reloadProjects") : t("moco.loadProjects")}
      </Button>
      {query.isError && (
        <p className="text-destructive text-xs">
          {query.error instanceof Error
            ? query.error.message
            : t("moco.loadError")}
        </p>
      )}
    </div>
  );
}
