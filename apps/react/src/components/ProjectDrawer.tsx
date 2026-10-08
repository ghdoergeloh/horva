import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AlertDialog } from "@horva/ui/AlertDialog";
import { Button } from "@horva/ui/Button";
import { Loader } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";
import { ProjectColorPicker } from "@horva/ui/ProjectColorPicker";
import { TextField } from "@horva/ui/TextField";

import { MocoLinkFields, MocoLoadButton } from "#/components/MocoLinkFields.js";
import { Sheet } from "#/components/Sheet.js";
import { useMocoConfigured, useRemoteMocoProjects } from "#/lib/mocoQueries.js";
import { client } from "#/lib/orpc.js";
import { projectColorLabels } from "#/lib/projectColorLabels.js";

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
        <Loader size={24} label={t("loading")} />
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
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: () => setActionError(t("drawer.saveError")),
  });

  const archiveMutation = useMutation({
    mutationFn: () => client.project.archive({ id }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: () => setActionError(t("drawer.archiveError")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.project.delete({ id }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: () => setActionError(t("drawer.deleteError")),
  });

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) {
      updateMutation.mutate({ name: trimmed });
    }
  }

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

      <ProjectColorPicker
        value={project.color}
        onChange={(color) => updateMutation.mutate({ color })}
        label={t("project.color")}
        labels={projectColorLabels(t)}
      />

      {/* Moco linking */}
      {mocoConfigured && (
        <div className="border-border space-y-3 border-t pt-5">
          <h3 className="text-heading text-foreground">
            {t("moco.linkingTitle")}
          </h3>
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
        <p className="text-muted-foreground text-sm">
          {t(`drawer.status.${project.status}`)}
        </p>
        {actionError && (
          <p role="alert" className="text-destructive text-sm">
            {actionError}
          </p>
        )}
        {!project.isDefault && (
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
            <Button
              variant="quiet"
              className="text-destructive"
              isPending={deleteMutation.isPending}
              onPress={() => setConfirmDelete(true)}
            >
              {t("drawer.delete")}
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog
          variant="destructive"
          title={t("drawer.deleteProjectTitle")}
          actionLabel={t("drawer.delete")}
          cancelLabel={t("common.cancel")}
          onAction={() => {
            setActionError(null);
            deleteMutation.mutate();
          }}
        >
          {t("drawer.deleteProjectText")}
        </AlertDialog>
      </Modal>
    </>
  );
}
