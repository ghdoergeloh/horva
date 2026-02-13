import { Command } from "commander";

const program = new Command();

program
  .command("example")
  .description("Example command")
  .action(() => {
    console.log("Example command...");
  });

program.parse(process.argv);
