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
    .argument("[patterns...]", t("arg_pattern"))

    // Resize options
    .option("--w <number>", t("opt_w"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --w value: ${v} (must be >0)`);
      return n;
    })
    .option("--h <number>", t("opt_h"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --h value: ${v} (must be >0)`);
      return n;
    })
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

  // Sanitizar --rename: "mi foto" -> "mi_foto", bloquear traversal
  if (options.rename) {
    if (options.rename.includes("..") || options.rename.includes("/") || options.rename.includes("\\")) {
      console.error(chalk.red(`\n✗ Invalid --rename value: ${options.rename} (no path traversal)`));
      process.exit(1);
    }
    // Reemplazar caracteres no permitidos en Windows/macOS
    const sanitized = options.rename.replace(/[^a-zA-Z0-9-_\u00C0-\u024F ]/g, "_").replace(/ /g, "_").slice(0, 64);
    if (sanitized !== options.rename) {
      console.log(chalk.dim(`  rename sanitized: "${options.rename}" -> "${sanitized}"`));
    }
    options.rename = sanitized || "image";
  }

  let filePatterns = program.args;

  // Normalizar prefijo .\ o ./ de autocompletado PS (safe, solo cwd)
  const normalizeCwd = (p) => p.replace(/^\.[\\/]/, "");
  filePatterns = filePatterns.map(normalizeCwd);

  // Default: sin args => todas las imágenes del cwd (equivale a "*")
  if (filePatterns.length === 0) {
    filePatterns = ["*"];
  }

  // Validación Fase 2: O lista O patrón, solo cwd, no mixto, sin subdirectorios/** 
  // Solo * y ? son globs en Fase 2 (evita que foto[1].jpg literal se confunda)
  const isGlob = (p) => p.includes("*") || p.includes("?");
  const hasGlob = filePatterns.some(isGlob);
  const hasLiteral = filePatterns.some((p) => !isGlob(p));
  if (hasGlob && hasLiteral) {
    console.error(chalk.red(`\n✗ ${t("msg_err_mixed_input")}`));
    console.error(chalk.dim(t("msg_mixed_hint")) + "\n");
    process.exit(1);
  }
  const hasSubdir = filePatterns.some((p) => p.includes("/") || p.includes("\\") || p.includes("**") || p.includes(".."));
  if (hasSubdir) {
    console.error(chalk.red(`\n✗ ${t("msg_err_subdir")}`));
    console.error(chalk.dim(t("msg_subdir_hint")) + "\n");
    process.exit(1);
  }

  return { ...options, filePatterns };
}
