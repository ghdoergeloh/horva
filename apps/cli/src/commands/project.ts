import type { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";

import {
  archiveProject,
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@repo/core";

import { db } from "../lib/db.js";
import {
  colorProject,
  padVisible,
  printError,
  printSuccess,
  sym,
} from "../lib/display.js";
import { pickProject } from "../lib/pickers.js";

function parseId(ref: string): number {
  const id = parseInt(ref.replace(/^#/, ""), 10);
  if (isNaN(id)) throw new Error(`Invalid ID: ${ref}`);
  return id;
}

function resolveColor(color: string): string {
  const named: Record<string, string> = {
    red: "#e74c3c",
    green: "#2ecc71",
    blue: "#3498db",
    yellow: "#f1c40f",
    orange: "#e67e22",
    purple: "#9b59b6",
    pink: "#e91e63",
    cyan: "#1abc9c",
    grey: "#95a5a6",
    gray: "#95a5a6",
    white: "#ecf0f1",
    black: "#2c3e50",
    indigo: "#6366f1",
  };
  return named[color.toLowerCase()] ?? color;
}

export function registerProjectCommands(program: Command): void {
  const projectCmd = program
    .command("project")
    .alias("p")
    .description("Manage projects");

  // project new
  projectCmd
    .command("new [name]")
    .description("Create a new project")
    .option("-c, --color <color>", "Project color (name or hex)")
    .action(async (name: string | undefined, opts: { color?: string }) => {
      try {
        const projectName = name ?? (await input({ message: "Project name:" }));

        const color = opts.color ? resolveColor(opts.color) : "#6366f1";
        const p = await createProject(db, { name: projectName, color });
        printSuccess(
          `${sym.created} Project #${p.id} "${p.name}" created (${colorProject(color, color)})`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // project list
  projectCmd
    .command("list")
    .alias("ls")
    .description("List projects")
    .option("--all", "Include archived projects")
    .action(async (opts: { all?: boolean }) => {
      try {
        const projects = await listProjects(db, opts.all);
        if (projects.length === 0) {
          console.log("  No projects found.");
          return;
        }

        console.log(
          chalk.dim(
            `  ${"#".padEnd(5)} ${"Project".padEnd(20)} ${"Color".padEnd(10)} Status`,
          ),
        );
        for (const p of projects) {
          const statusStr =
            p.status !== "active" ? chalk.dim(` (${p.status})`) : "";
          const defaultStr = p.isDefault ? chalk.dim(" [default]") : "";
          console.log(
            `  ${String(p.id).padEnd(5)} ${padVisible(colorProject(p.name.substring(0, 19), p.color), 20)} ${p.color.padEnd(10)}${statusStr}${defaultStr}`,
          );
        }
        const active = projects.filter((p) => p.status === "active").length;
        const archived = projects.filter((p) => p.status === "archived").length;
        console.log(
          chalk.dim(
            `\n  ${active} active project(s)${archived > 0 ? `, ${archived} archived` : ""}`,
          ),
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // project edit
  projectCmd
    .command("edit [id]")
    .description("Edit a project")
    .option("-n, --name <name>", "New name")
    .option("-c, --color <color>", "New color")
    .action(
      async (
        idStr: string | undefined,
        opts: { name?: string; color?: string },
      ) => {
        try {
          const hasFlags = opts.name !== undefined || opts.color !== undefined;

          // Resolve ID (interactively if not provided)
          let id: number;
          if (idStr !== undefined) {
            id = parseId(idStr);
          } else {
            id = await pickProject(db, "Which project do you want to edit?");
          }

          if (hasFlags) {
            // Non-interactive path
            await updateProject(db, id, {
              name: opts.name,
              color: opts.color ? resolveColor(opts.color) : undefined,
            });
            printSuccess(`${sym.edited} Project #${id} updated`);
            return;
          }

          // Interactive wizard
          const projects = await listProjects(db, true);
          const current = projects.find((p) => p.id === id);
          if (!current) {
            printError(`Project #${id} not found`);
            process.exit(1);
          }

          const changes: { name?: string; color?: string } = {};

          const newName = await input({
            message: "Name:",
            default: current.name,
          });
          if (newName !== current.name) changes.name = newName;

          const colorHint = chalk.dim(
            "(name: red/green/blue/yellow/orange/purple/pink/cyan/grey or hex)",
          );
          const newColorInput = await input({
            message: `Color ${colorHint}:`,
            default: current.color,
          });
          const newColor = resolveColor(newColorInput);
          if (newColor !== current.color) changes.color = newColor;

          if (Object.keys(changes).length === 0) {
            console.log("No changes made.");
            return;
          }

          await updateProject(db, id, changes);
          printSuccess(`${sym.edited} Project #${id} updated`);
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // project archive
  projectCmd
    .command("archive <id>")
    .alias("arch")
    .description("Archive a project")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const p = await archiveProject(db, id);
        printSuccess(`${sym.archived} Project #${p.id} "${p.name}" archived.`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // project delete
  projectCmd
    .command("delete <id>")
    .alias("rm")
    .description("Delete a project permanently")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const projects = await listProjects(db, true);
        const existing = projects.find((p) => p.id === id);
        if (!existing) {
          printError(`Project #${id} not found`);
          process.exit(1);
        }

        console.log(
          `${sym.warning} This will permanently delete project #${id} "${existing.name}".`,
        );

        const confirmed = await select({
          message: "Are you sure?",
          choices: [
            { name: "No", value: false },
            { name: "Yes", value: true },
          ],
        });

        if (!confirmed) {
          console.log("Cancelled.");
          return;
        }

        await deleteProject(db, id);
        printSuccess(
          `${sym.deleted} Project #${id} "${existing.name}" deleted.`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });
}
