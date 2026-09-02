import { program } from "commander";
import chalk from "chalk";
import { t } from "./i18n.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

export function getOptions() {
  program
    .name("imodify")
    .description(t("cli_desc"))
    .version(pkg.version)
    .argument("[pattern]", t("arg_pattern"), "*")

    // Resize options
    .option("--w <number>", t("opt_w"))
    .option("--h <number>", t("opt_h"))
    .option("--fit <strategy>", t("opt_fit"))
    .option("--smart", t("opt_smart"))

    // Output options
    .option("-f, --format <type>", t("opt_format"))
    .option("-q, --quality <value>", t("opt_quality"))
    .option("--clearexif", t("opt_clearexif"))
    .option("--rename <pattern>", t("opt_rename"))

    // Filters & Effects
    .option("--blur <radius>", t("opt_blur"), parseFloat)
    .option("--sharpen", t("opt_sharpen"))
    .option("--grayscale", t("opt_grayscale"))
    .option("--brightness <number>", t("opt_brightness"), parseFloat)
    .option("--saturation <number>", t("opt_saturation"), parseFloat)
    .option("--normalize", t("opt_normalize"))

    // Transformation
    .option("--rotate <degrees>", t("opt_rotate"), parseInt)
    .option("--flip", t("opt_flip"))
    .option("--flop", t("opt_flop"))

    // AI
    .option("-b, --removebg", t("opt_removebg"))
    
    .configureOutput({
      writeErr: (str) =>
        process.stderr.write(
          `${chalk.red("✗")} ${str.replace("error: ", t("msg_error_prefix"))}`
        ),
      outputError: (str, write) => write(str),
    });

  program.showHelpAfterError(`(${t("msg_help_hint")})`);

  program.addHelpText("after", `\n${chalk.dim(t("msg_quote_hint"))}`);

  program.parse();

  const options = program.opts();
  const args = program.args;

  if (args.length === 0) {
    program.help();
  }

  const filePatterns = args;

  return { ...options, filePatterns };
}
