import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";
import { processImage } from "./processor.js";
import { t } from "./i18n.js";
import { initAI } from "./ai.js";

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tiff",
  ".gif",
];
const SUPPORTED_OUTPUT_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "tiff",
  "gif",
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB as a "generous limit"

export async function optimize(options) {
  // 0. Validate Output Format
  if (
    options.format &&
    !SUPPORTED_OUTPUT_FORMATS.includes(options.format.toLowerCase())
  ) {
    const err = new Error(`${t("msg_err_invalid_format")} ${options.format}. ${t("msg_err_supported_formats")} ${SUPPORTED_OUTPUT_FORMATS.join(", ")}`);
    err.code = "INVALID_FORMAT";
    throw err;
  }

  // 1. Find files (Fase 2: solo cwd, O lista O patrón, sin mixto)
  // Para mostrar "fichero no existe" fácil, colectamos fallos de no encontrado aquí
  const earlyFailures = [];
  let files = [];
  for (let pattern of options.filePatterns) {
    // Safe: permitir .\test.jpg de autocompletado PS -> test.jpg (solo cwd)
    pattern = pattern.replace(/^\.[\\/]/, "");
    // Defensa extra por si optimize se llama sin pasar por options.js
    if (pattern.includes("/") || pattern.includes("\\") || pattern.includes("..")) {
      earlyFailures.push({ file: pattern, error: "Subdirectories not supported" });
      continue;
    }

    const isGlobPattern = pattern.includes("*") || pattern.includes("?");

    if (!isGlobPattern) {
      // Literal: foto.jpg, foto (1).jpg - manejar espacios/paréntesis (PS)
      try {
        const stats = await fs.stat(pattern);
        if (stats.isFile()) {
          files.push(pattern);
        } else {
          earlyFailures.push({ file: pattern, error: "Not a file" });
        }
      } catch (e) {
        earlyFailures.push({ file: pattern, error: "File not found" });
      }
      continue;
    }

    // Patrón: "*.png", "*", "*.jpg" - solo cwd, sin subdirectorios
    const matches = await glob(pattern, {
      nodir: true,
      windowsPathsNoEscape: true,
    });
    // Defensa: filtrar cualquier match con "/" por si glob devuelve subdirs
    const cwdMatches = matches.filter((m) => !m.includes("/") && !m.includes("\\"));
    files = files.concat(cwdMatches);
  }

  // Remove duplicates just in case patterns overlap (e.g. picopt *.jpg data.jpg)
  files = [...new Set(files)];

  // Filter by extension immediately to report accurate "Found X images" count
  files = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });

  // Filtrar earlyFailures por extensión también (no reportar txt inexistente como fallo de imagen)
  const filteredEarlyFailures = earlyFailures.filter((f) =>
    IMAGE_EXTENSIONS.includes(path.extname(f.file).toLowerCase())
  );

  if (files.length === 0 && filteredEarlyFailures.length === 0) {
    console.log(chalk.yellow(t("msg_no_images_pattern")));
    console.log(chalk.dim(t("msg_quote_hint")));
    return;
  }

  // Si solo hay fallos y no hay archivos válidos, mostrar found 0 + fallos sin spinner
  if (files.length === 0 && filteredEarlyFailures.length > 0) {
    console.log(`\n ${t("msg_found_images")} ${chalk.bold(0)} ${t("msg_images")}`);
    console.log(
      `\n${chalk.red("✗")} ${chalk.bold(t("msg_failures"))} ${filteredEarlyFailures.length} ${t("msg_failure_details")}`
    );
    filteredEarlyFailures.forEach((f) => {
      console.log(`  - ${chalk.yellow(path.basename(f.file))}: ${chalk.dim(f.error)}`);
    });
    return;
  }

  console.log(
    `\n ${t("msg_found_images")} ${chalk.bold(files.length)} ${t("msg_images")}`
  );

  // 2. Validate images (size, accessibility)
  const spinner = ora(" " + t("msg_validating")).start();
  const validFiles = [];
  const sizeFailures = [];

  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      if (stats.size <= MAX_FILE_SIZE) {
        validFiles.push({ path: file, size: stats.size });
      } else {
        sizeFailures.push({ file, error: `File too large (>${MAX_FILE_SIZE / (1024 * 1024)}MB)` });
      }
    } catch (e) {
      sizeFailures.push({ file, error: e.message });
    }
  }

  if (validFiles.length === 0) {
    spinner.fail(chalk.red(" " + t("msg_no_valid")));
    const allFailures = [...filteredEarlyFailures, ...sizeFailures];
    if (allFailures.length > 0) {
      console.log(
        `\n${chalk.red("✗")} ${chalk.bold(t("msg_failures"))} ${allFailures.length} ${t("msg_failure_details")}`
      );
      allFailures.forEach((f) => {
        console.log(`  - ${chalk.yellow(path.basename(f.file))}: ${chalk.dim(f.error)}`);
      });
    }
    return;
  }
  spinner.stopAndPersist({
    symbol: chalk.green("✓"),
    text: " " + t("msg_validating"),
  });

  // Initialize AI if needed
  if (options.removebg) {
    const aiSpinner = ora(" " + t("msg_initializing_ai")).start();
    try {
      await initAI();
      aiSpinner.stopAndPersist({
        symbol: chalk.green("✓"),
        text: " " + t("msg_initializing_ai_success"),
      });
    } catch (error) {
      aiSpinner.fail(chalk.red(" " + t("msg_initializing_ai_fail")));
      throw error;
    }
  }

  // 3. Setup output directory
  // a) no -o => ./imodify, b) -o . => cwd, c) -o string => ./string (crea si no existe, a/b gratis)
  let outputDir;
  let displayDir;
  if (options.output === undefined) {
    outputDir = path.join(process.cwd(), "imodify");
    displayDir = "./imodify/";
  } else if (options.output === ".") {
    outputDir = process.cwd();
    displayDir = "./";
  } else {
    outputDir = path.join(process.cwd(), options.output);
    displayDir = `./${options.output.replace(/\\/g, "/")}/`;
  }
  await fs.mkdir(outputDir, { recursive: true });
  console.log(` ${chalk.white(t("msg_output_dir"))} ${chalk.dim(displayDir)}\n`);

  // Pre-cargar nombres existentes en outputDir para no pisar re-ejecuciones
  const usedNames = new Set();
  try {
    const existing = await fs.readdir(outputDir);
    for (const f of existing) usedNames.add(f);
  } catch {}


  // 4. Progress bar setup
  console.log(t("msg_processing"));
  const progressBar = new cliProgress.SingleBar({
    format:
      t("msg_bar_label") +
      " [" +
      chalk.cyan("{bar}") +
      "] {value}/{total} ({percentage}%)",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
    stopOnComplete: true,
  });

  progressBar.start(validFiles.length, 0);

  // 5. Processing loop
  const stats = {
    processed: 0,
    originalSize: 0,
    newSize: 0,
    startTime: Date.now(),
  };
  const failures = [];

  for (let i = 0; i < validFiles.length; i++) {
    const fileObj = validFiles[i];

    // Determine output name (sin pad por defecto, solo _X en colisión, vital para workflow web)
    let outputName = path.basename(fileObj.path);
    if (options.rename) {
      const ext = options.format
        ? `.${options.format}`
        : path.extname(fileObj.path);
      const padLen = Math.max(3, String(validFiles.length).length);
      outputName = `${options.rename}${String(i + 1).padStart(padLen, "0")}${ext}`;
    } else if (options.format) {
      const baseName = path.basename(fileObj.path, path.extname(fileObj.path));
      outputName = `${baseName}.${options.format}`;
    }

    // Anti-colisión: test1.png + test1.jpg -> webp => test1.webp + test1_1.webp (_X, no (X))
    // + re-ejecución: si imodify/test1.webp ya existe, también sufijo
    let finalName = outputName;
    if (usedNames.has(finalName)) {
      const ext = path.extname(finalName);
      const base = path.basename(finalName, ext);
      let counter = 1;
      while (usedNames.has(finalName)) {
        finalName = `${base}_${counter}${ext}`;
        counter++;
      }
      outputName = finalName;
    }
    usedNames.add(outputName);

    const outputPath = path.join(outputDir, outputName);

    try {
      const info = await processImage(fileObj.path, outputPath, options);
      stats.originalSize += fileObj.size;
      stats.newSize += info.size;
      stats.processed++;
    } catch (err) {
      failures.push({ file: fileObj.path, error: err.message });
    }

    progressBar.update(i + 1);
  }

  // 6. Final Stats Output
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const reduction =
    stats.originalSize > 0
      ? (
          ((stats.originalSize - stats.newSize) / stats.originalSize) *
          100
        ).toFixed(0)
      : 0;

  const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

  console.log(chalk.green(`\n\n✓ ${t("msg_completed")} ${duration}s`));
  console.log(
    `  ${chalk.bold("•")} ${t("msg_processed")} ${stats.processed} ${t(
      "msg_images"
    )}`
  );

  if (stats.processed > 0) {
    console.log(
      `  ${chalk.bold("•")} ${t("msg_saved")} ${toMB(
        stats.originalSize
      )} MB → ${toMB(stats.newSize)} MB (${reduction}% ${t("msg_reduction")})`
    );
    console.log(`  ${chalk.bold("•")} ${t("msg_output")} ${chalk.dim(displayDir)}`);
  }

  // 7. Report Failures (incluye earlyFailures de fichero no existe)
  const allFailures = [...filteredEarlyFailures, ...sizeFailures, ...failures];
  if (allFailures.length > 0) {
    console.log(
      `\n${chalk.red("✗")} ${chalk.bold(t("msg_failures"))} ${allFailures.length} ${t("msg_failure_details")}`
    );
    allFailures.forEach((f) => {
      console.log(
        `  - ${chalk.yellow(path.basename(f.file))}: ${chalk.dim(f.error)}`
      );
    });
  }
}
