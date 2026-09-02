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
    console.error(
      `\n${chalk.red("✗")} ${t("msg_err_invalid_format")} ${chalk.bold(
        options.format
      )}`
    );
    console.error(
      `${t("msg_err_supported_formats")} ${SUPPORTED_OUTPUT_FORMATS.join(
        ", "
      )}\n`
    );
    process.exit(1);
  }

  // 1. Find files
  let files = [];
  for (const pattern of options.filePatterns) {
    // 1. Try to treat as literal file first (handles parens and special chars)
    try {
      const stats = await fs.stat(pattern);
      if (stats.isFile()) {
        files.push(pattern);
        continue;
      }
    } catch (e) {
      // Not a literal file, fall through to glob
    }

    // 2. If not literal file, treat as pattern
    const matches = await glob(pattern, {
      nodir: true,
      windowsPathsNoEscape: true,
    });
    files = files.concat(matches);
  }

  // Remove duplicates just in case patterns overlap (e.g. picopt *.jpg data.jpg)
  files = [...new Set(files)];

  // Filter by extension immediately to report accurate "Found X images" count
  files = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });

  if (files.length === 0) {
    console.log(chalk.yellow(t("msg_no_images_pattern")));
    console.log(chalk.dim(t("msg_quote_hint")));
    return;
  }

  console.log(
    `\n ${t("msg_found_images")} ${chalk.bold(files.length)} ${t("msg_images")}`
  );

  // 2. Validate images (size, accessibility)
  const spinner = ora(" " + t("msg_validating")).start();
  const validFiles = [];

  for (const file of files) {
    try {
      const stats = await fs.stat(file);
      if (stats.size <= MAX_FILE_SIZE) {
        validFiles.push({ path: file, size: stats.size });
      }
    } catch (e) {
      /* skip inaccessible files */
    }
  }

  if (validFiles.length === 0) {
    spinner.fail(chalk.red(" " + t("msg_no_valid")));
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
  const outputDir = path.join(process.cwd(), "imodify");
  await fs.mkdir(outputDir, { recursive: true });
  console.log(
    ` ${chalk.white(t("msg_output_dir"))} ${chalk.dim("./imodify/")}\n`
  );

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

    // Determine output name
    let outputName = path.basename(fileObj.path);
    if (options.rename) {
      const ext = options.format
        ? `.${options.format}`
        : path.extname(fileObj.path);
      outputName = `${options.rename}${i + 1}${ext}`;
    } else if (options.format) {
      const baseName = path.basename(fileObj.path, path.extname(fileObj.path));
      outputName = `${baseName}.${options.format}`;
    }

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
    console.log(
      `  ${chalk.bold("•")} ${t("msg_output")} ${chalk.dim("./imodify/")}`
    );
  }

  // 7. Report Failures
  if (failures.length > 0) {
    console.log(
      `\n${chalk.red("✗")} ${chalk.bold(t("msg_failures"))} ${
        failures.length
      } ${t("msg_failure_details")}`
    );
    failures.forEach((f) => {
      console.log(
        `  - ${chalk.yellow(path.basename(f.file))}: ${chalk.dim(f.error)}`
      );
    });
  }
}
