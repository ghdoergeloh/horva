import { ProjectDrawer } from "~/components/ProjectDrawer.js";
import { TaskDrawer } from "~/components/TaskDrawer.js";
import { useDetailDrawer } from "~/contexts/DetailDrawerContext.js";

/**
 * Renders the right-hand property drawer for whatever entity is currently
 * selected via DetailDrawerContext. Mounted once in the AppShell.
 */
export function DetailDrawerHost() {
  const { detail, close } = useDetailDrawer();

  if (!detail) return null;
  if (detail.type === "project") {
    return <ProjectDrawer id={detail.id} onClose={close} />;
  }
  return <TaskDrawer id={detail.id} onClose={close} />;
}
