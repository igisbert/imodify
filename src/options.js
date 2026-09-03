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
    .helpOption("-H, --help", "Display help")
    .argument("[patterns...]", t("arg_pattern"))

    // Resize options (primaria --width/--height, aliases visibles --ancho/--alto)
    .option("-w, --width <number>", t("opt_width"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --width value: ${v} (must be >0)`);
      return n;
    })
    .option("--ancho <number>", t("opt_width"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --ancho value: ${v} (must be >0)`);
      return n;
    })
    .option("-h, --height <number>", t("opt_height"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --height value: ${v} (must be >0)`);
      return n;
    })
    .option("--alto <number>", t("opt_height"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid --alto value: ${v} (must be >0)`);
      return n;
    })
    .option("--fit <strategy>", t("opt_fit"), (v) => {
      const lower = v.toLowerCase();
      if (!["cover", "fill", "inside", "contain"].includes(lower)) {
        throw new Error(`Invalid --fit value: ${v} (allowed: cover, fill, inside, contain)`);
      }
      return lower;
    })
    .option("--smart", t("opt_smart"))

    // Output options
    .option("-f, --format <type>", t("opt_format"))
    .option("-q, --quality <value>", t("opt_quality"))
    .option("-o, --output <dir>", t("opt_output"))
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
    .option("--rotate <degrees>", t("opt_rotate"), (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || !isFinite(n)) throw new Error(`Invalid --rotate value: ${v} (must be integer)`);
      // Normalizar 1-359 con módulo, permitir 0-359, -90 -> 270, 100000 -> 280
      const norm = ((n % 360) + 360) % 360;
      return norm;
    })
    .option("--flip", t("opt_flip"))
    .option("--flop", t("opt_flop"))

    // AI (fast=BEN2 rápido, hq=BiRefNet_512 preciso, alias --rmbg)
    .option("-b, --removebg [mode]", t("opt_removebg"), (v) => {
      if (v === true || v === undefined) return "fast";
      const lower = String(v).toLowerCase().trim();
      if (lower === "fast" || lower === "hq") return lower;
      throw new Error(`Invalid --removebg value: ${v} (allowed: fast, hq)`);
    })
    .option("--rmbg [mode]", t("opt_removebg"), (v) => {
      if (v === true || v === undefined) return "fast";
      const lower = String(v).toLowerCase().trim();
      if (lower === "fast" || lower === "hq") return lower;
      throw new Error(`Invalid --rmbg value: ${v} (allowed: fast, hq)`);
    })
    
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

  const rawOpts = program.opts();
  // Normalizar width/height primaria (width/height) + alias ancho/alto -> w/h legacy eliminado
  const width = rawOpts.width ?? rawOpts.ancho;
  const height = rawOpts.height ?? rawOpts.alto;
  // Normalizar removebg/rmbg -> fast/hq (BEN2 / BiRefNet_dynamic), default fast
  let removebgMode = rawOpts.removebg ?? rawOpts.rmbg;
  if (removebgMode === true) removebgMode = "fast";
  // Si se pasó como boolean true sin valor, ya es fast; si es string fast/hq ya normalizado arriba
  const options = { ...rawOpts };
  if (width !== undefined) options.width = width;
  if (height !== undefined) options.height = height;
  // compat: alias w/h por si processor antiguo lee w/h (ya migrado a width/height)
  if (width !== undefined) options.w = width;
  if (height !== undefined) options.h = height;
  // Unificar rmbg -> removebg
  if (removebgMode !== undefined) {
    options.removebg = removebgMode;
    delete options.rmbg;
  }
  // Si solo se pasó --rmbg sin --removebg, ya está en removebgMode
  if (rawOpts.rmbg !== undefined && rawOpts.removebg === undefined) {
    options.removebg = removebgMode;
  }

  // Validar --output: no -> imodify, "." -> cwd, "string" -> carpeta (crear si no existe)
  // Subcarpetas tipo a/b gratis pero no prioritario, absolutas no (más rápido . + copiar que escribir ruta)
  if (options.output !== undefined) {
    const raw = options.output.trim();
    if (raw === "") {
      console.error(chalk.red(`\n✗ Invalid --output value: empty`));
      process.exit(1);
    }
    // Normalizar "." / "./" / ".\" -> "."
    if (raw === "." || raw === "./" || raw === ".\\" || raw === ".\\/" ) {
      options.output = ".";
    } else {
      // Rechazar absolutas
      if (raw.includes(":") && /^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith("/") || raw.startsWith("\\") || raw.startsWith("\\\\")) {
        console.error(chalk.red(`\n✗ Invalid --output: absolute paths not allowed: ${raw}`));
        console.error(chalk.dim(`Use "." for cwd or a relative folder like "salida" or "a/b"`));
        process.exit(1);
      }
      if (raw.includes("..")) {
        console.error(chalk.red(`\n✗ Invalid --output: no traversal: ${raw}`));
        process.exit(1);
      }
      // Normalizar quitar ./ inicial y trailing slash, pero permitir a/b con espacios
      let normalized = raw.replace(/^\.[\\/]/, "").replace(/[\\/]+$/, "");
      if (normalized === "") normalized = ".";
      options.output = normalized;
    }
  }

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
