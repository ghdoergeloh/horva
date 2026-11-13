import {
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

/** Another running process has the PGlite folder open. */
export class DatabaseLockedError extends Error {
  readonly dataDir: string;
  readonly pid: number;

  constructor(dataDir: string, pid: number) {
    super(
      `The database ${dataDir} is in use by process ${pid}. ` +
        "Close the other Horva app or command and try again.",
    );
    this.name = "DatabaseLockedError";
    this.dataDir = dataDir;
    this.pid = pid;
  }
}

/** A held lock file. `release()` may be called more than once. */
export interface Lock {
  release(): void;
}

function isRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process runs, but belongs to another user.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readPid(path: string): number {
  try {
    return Number(readFileSync(path, "utf8").trim());
  } catch {
    return 0;
  }
}

/**
 * Takes the lock file `<dataDir>.lock` with the id of this process. PGlite
 * allows one process per folder; a second one can damage the data. A lock
 * of a process that no longer runs is taken over. Throws
 * {@link DatabaseLockedError} while another process holds it.
 */
export function acquireLock(dataDir: string): Lock {
  const path = `${dataDir.replace(/[/\\]+$/, "")}.lock`;
  mkdirSync(dirname(path), { recursive: true });
  const pid = String(process.pid);
  for (;;) {
    try {
      writeFileSync(path, pid, { flag: "wx" });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const holder = readPid(path);
      if (isRunning(holder)) throw new DatabaseLockedError(dataDir, holder);
      rmSync(path, { force: true });
    }
  }

  let held = true;
  const release = () => {
    if (!held) return;
    held = false;
    process.off("exit", release);
    if (readPid(path) === process.pid) {
      try {
        unlinkSync(path);
      } catch {
        // Already gone.
      }
    }
  };
  // A normal exit without close() must not leave the lock behind.
  process.on("exit", release);
  return { release };
}
