import sharp from "sharp";
import { removeBackground } from "./ai.js";

/**
 * Processes a single image based on the provided options.
 * @param {string} inputPath - Path to the source image.
 * @param {string} outputPath - Path where the processed image will be saved.
 * @param {Object} options - Transformation options.
 * @returns {Promise<Object>} - Stats about the processed image.
 */
export async function processImage(inputPath, outputPath, options) {
  let instance;
  if (options.removebg) {
    const aiBuffer = await removeBackground(inputPath);
    instance = sharp(aiBuffer);
  } else {
    instance = sharp(inputPath);
}

  // 0. Auto-orient based on EXIF (standard behavior for expected viewing)
  instance = instance.rotate();

  // 1. Metadata handling
  if (options.noexif) {
    instance = instance.withMetadata({ exif: false });
  }

  // 2. Resize
  if (options.w || options.h) {
    const width = options.w ? parseInt(options.w, 10) : null;
    const height = options.h ? parseInt(options.h, 10) : null;

    // Default logic:
    // - If smart is true, force 'cover' with attention strategy.
    // - If user specifies --fit, use it.
    // - If both w and h are present, default to 'fill' (strict dimensions, ignores aspect ratio).
    // - If only one is present, 'inside' preserves aspect ratio naturally.
    let fitStr = "inside";
    let position = null;

    if (options.smart && width && height) {
      fitStr = "cover";
      position = sharp.strategy.attention;
    } else if (options.fit) {
      fitStr = options.fit;
    } else if (width && height) {
      fitStr = "fill";
    }

    instance = instance.resize({
      width,
      height,
      fit: fitStr,
      position: position,
      withoutEnlargement: false,
    });
  }

  // 3. Filters & Effects
  if (options.grayscale) {
    instance = instance.grayscale();
  }

  // Brightness & Saturation (handled via modulate)
  const modulateOpts = {};
  if (options.brightness !== undefined)
    modulateOpts.brightness = options.brightness;
  if (options.saturation !== undefined)
    modulateOpts.saturation = options.saturation;

  if (Object.keys(modulateOpts).length > 0) {
    instance = instance.modulate(modulateOpts);
  }

  if (options.normalize) {
    instance = instance.normalize();
  }

  if (options.blur) {
    instance = instance.blur(options.blur);
  }

  if (options.sharpen) {
    instance = instance.sharpen();
  }

  // 4. Transformations
  if (options.rotate) {
    instance = instance.rotate(options.rotate);
  }

  if (options.flip) {
    instance = instance.flip();
  }

  if (options.flop) {
    instance = instance.flop();
  }

  // 5. Format & Quality
  if (options.format) {
    const formatOptions = {};
    if (options.quality) {
      if (options.quality === "lossless") {
        formatOptions.lossless = true;
      } else {
        const q = parseInt(options.quality, 10);
        if (!isNaN(q)) formatOptions.quality = q;
      }
    }
    instance = instance.toFormat(options.format, formatOptions);
  } else if (options.quality) {
    const q = parseInt(options.quality, 10);
    const qValue = !isNaN(q) ? q : 80; // Default if invalid
    const isLossless = options.quality === "lossless";

    instance = instance
      .jpeg({ quality: qValue, force: false })
      .png({ lossless: isLossless, force: false })
      .webp({ quality: qValue, lossless: isLossless, force: false })
      .avif({ quality: qValue, lossless: isLossless, force: false });
  }

  // 6. Execution
  const info = await instance.toFile(outputPath);
  return info;
}
