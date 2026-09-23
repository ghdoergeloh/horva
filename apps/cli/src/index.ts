import { Command } from "commander";

import { greet } from "@repo/core";

const program = new Command().name("cli");

program
  .command("hello")
  .description("Print a greeting")
  .argument("[name]", "who to greet")
  .action((name?: string) => {
    console.log(greet(name));
  });

program.parse(process.argv);
