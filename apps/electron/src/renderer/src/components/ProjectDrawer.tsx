import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { ColorPicker } from "@horva/ui/ColorPicker";
import { TextField } from "@horva/ui/TextField";

import { MocoLinkFields, MocoLoadButton } from "~/components/MocoLinkFields.js";
import { Sheet } from "~/components/Sheet.js";
import { useMocoConfigured, useRemoteMocoProjects } from "~/lib/mocoQueries.js";
import { client } from "~/lib/orpc.js";

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

type Project = NonNullable<
  Awaited<ReturnType<typeof client.project.get>>["project"]
>;

export function ProjectDrawer({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const { data: project } = useQuery({
    queryKey: ["projects", id],
    queryFn: async () => (await client.project.get({ id })).project,
  });

  return (
    <Sheet title={t("drawer.projectTitle")} onClose={onClose}>
      {project ? (
        // Keyed so local edit state re-initialises when switching projects.
        <ProjectDrawerBody
          key={project.id}
          project={project}
          onClose={onClose}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      )}
    </Sheet>
  );
}

function ProjectDrawerBody({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const id = project.id;

  const mocoConfigured = useMocoConfigured();
  const remoteQuery = useRemoteMocoProjects();

  const [name, setName] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; color?: string }) =>
      client.project.update({ id, ...input }),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: () => client.project.archive({ id }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e) =>
      setActionError(e instanceof Error ? e.message : t("drawer.actionError")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.project.delete({ id }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e) =>
      setActionError(e instanceof Error ? e.message : t("drawer.actionError")),
  });

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) {
      updateMutation.mutate({ name: trimmed });
    }
  }

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

      {/* Color */}
      <div className="space-y-1.5">
        <p className="text-foreground text-sm font-medium">
          {t("drawer.color")}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_PRESETS.map((c) => (
            <Button
              key={c}
              variant="quiet"
              onPress={() => updateMutation.mutate({ color: c })}
              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                project.color === c ? "ring-ring ring-2 ring-offset-1" : ""
              }`}
              style={{ backgroundColor: c }}
              aria-label={t("drawer.color")}
            />
          ))}
          <ColorPicker
            aria-label={t("drawer.customColor")}
            value={project.color}
            onChange={(val) => updateMutation.mutate({ color: val.toString() })}
          />
        </div>
      </div>

      {/* Moco linking */}
      {mocoConfigured && (
        <div className="border-border space-y-3 border-t pt-5">
          <p className="text-foreground text-sm font-semibold">
            {t("moco.linkingTitle")}
          </p>
          {remoteQuery.data ? (
            <MocoLinkFields
              projectId={project.id}
              mocoProjectId={project.mocoProjectId}
              mocoDefaultTaskId={project.mocoDefaultTaskId}
              remoteProjects={remoteQuery.data}
            />
          ) : (
            <MocoLoadButton query={remoteQuery} />
          )}
        </div>
      )}

      {/* Status / actions */}
      <div className="border-border space-y-3 border-t pt-5">
        <p className="text-muted-foreground text-xs">
          {t(`drawer.status.${project.status}`)}
        </p>
        {actionError && (
          <p className="text-destructive text-xs">{actionError}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {project.status === "active" && (
            <Button
              variant="secondary"
              isPending={archiveMutation.isPending}
              onPress={() => {
                setActionError(null);
                archiveMutation.mutate();
              }}
            >
              {t("drawer.archive")}
            </Button>
          )}
          {confirmDelete ? (
            <>
              <Button
                variant="destructive"
                isPending={deleteMutation.isPending}
                onPress={() => {
                  setActionError(null);
                  deleteMutation.mutate();
                }}
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
