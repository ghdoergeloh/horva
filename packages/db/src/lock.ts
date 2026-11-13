import {
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

/** Another running process has the PGlite folder open. */
export class DatabaseLockedError extends Error {
  readonly dataDir: string;
  /** The process id in the lock file; 0 if the file holds none. */
  readonly pid: number;

  constructor(dataDir: string, pid: number, lockPath: string) {
    super(
      `The database ${dataDir} is in use by ${pid ? `process ${pid}` : "another process"}. ` +
        "Close the other Horva app or command and try again. " +
        `If no Horva runs, delete ${lockPath}.`,
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
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process runs, but belongs to another user.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** The process id in a lock file, 0 if it holds none, null if it is gone. */
function readPid(path: string): number | null {
  let text: string;
  try {
    text = readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
  const pid = Number(text);
  return Number.isInteger(pid) && pid > 0 ? pid : 0;
}

function code(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code;
}

/** Creates `path` with `content` in one step; false if it exists. */
function createWithContent(path: string, content: string): boolean {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content);
  try {
    // A hard link makes the complete file appear at once, so no other
    // process ever reads an empty lock.
    linkSync(temporary, path);
    return true;
  } catch (error) {
    if (code(error) === "EEXIST") return false;
    throw error;
  } finally {
    rmSync(temporary, { force: true });
  }
}

/**
 * Removes the lock at `path` if it still belongs to the ended process
 * `pid`. Only one of several processes can move the file away, so a lock
 * that another process has just taken is never removed.
 */
function removeStale(path: string, pid: number): void {
  const moved = `${path}.${process.pid}.stale`;
  try {
    renameSync(path, moved);
  } catch (error) {
    if (code(error) === "ENOENT") return;
    throw error;
  }
  if (readPid(moved) === pid) {
    rmSync(moved, { force: true });
    return;
  }
  // Another process took the lock in the meantime: put it back.
  try {
    linkSync(moved, path);
  } catch (error) {
    if (code(error) !== "EEXIST") throw error;
  } finally {
    rmSync(moved, { force: true });
  }
}

/**
 * Takes the lock file `<dataDir>.lock` with the id of this process. PGlite
 * allows one process per folder; a second one can damage the data. A lock
 * of a process that no longer runs is taken over. Throws
 * {@link DatabaseLockedError} while another process holds it, or when the
 * file holds no process id.
 */
export function acquireLock(dataDir: string): Lock {
  const path = `${dataDir.replace(/[/\\]+$/, "")}.lock`;
  mkdirSync(dirname(path), { recursive: true });
  while (!createWithContent(path, String(process.pid))) {
    const holder = readPid(path);
    if (holder === null) continue;
    if (holder === 0 || isRunning(holder)) {
      throw new DatabaseLockedError(dataDir, holder, path);
    }
    removeStale(path, holder);
  }

  let held = true;
  const release = () => {
    if (!held) return;
    held = false;
    process.off("exit", release);
    if (readPid(path) === process.pid) rmSync(path, { force: true });
  };
  // A normal exit without close() must not leave the lock behind.
  process.on("exit", release);
  return { release };
}
