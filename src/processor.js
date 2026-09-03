import sharp from "sharp";
import path from "node:path";
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
    const aiBuffer = await removeBackground(inputPath, options.removebg);
    instance = sharp(aiBuffer);
  } else {
    instance = sharp(inputPath);
}

  // 0. Auto-orient based on EXIF (standard behavior for expected viewing)
  // If manual rotate is requested, it replaces auto-orient (Sharp's second rotate overwrites)
  // Sin --clearexif no se toca meta (decisión Fase 2.5)
  if (options.rotate !== undefined && options.rotate !== null) {
    instance = instance.rotate(options.rotate);
  } else {
    instance = instance.rotate();
  }

  // 1. Metadata handling
  // --clearexif: remove EXIF (GPS, camera data) but keep ICC/color profile
  // Sharp strips all metadata by default. To keep colors, explicitly keep ICC.
  // withMetadata({ exif: false }) is invalid in sharp >=0.33 (expects Object)
  if (options.clearexif) {
    instance = instance.keepIccProfile();
  }

  // 2. Resize (width/height primaria, w/h legacy, ancho/alto alias)
  const rawW = options.width ?? options.w ?? options.ancho;
  const rawH = options.height ?? options.h ?? options.alto;
  if (rawW !== undefined || rawH !== undefined) {
    const width = rawW !== undefined ? rawW : null;
    const height = rawH !== undefined ? rawH : null;

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
  if (options.flip) {
    instance = instance.flip();
  }

  if (options.flop) {
    instance = instance.flop();
  }

  // 5. Format & Quality
  // PNG quality posteriza (palette) - es con pérdida pero comprime de verdad
  // Con removebg forzamos palette:false para preservar alpha continuo 0-255 (mejor calidad)
  const isRemovebg = !!options.removebg;
  const getPngOptions = (q, isLossless) => {
    if (isRemovebg) {
      return { compressionLevel: 9, adaptiveFiltering: true, palette: false };
    }
    if (isLossless || q >= 100) {
      return { compressionLevel: 9, adaptiveFiltering: true, palette: false };
    }
    const clamped = Math.max(1, Math.min(100, q));
    return {
      quality: clamped,
      palette: true,
      compressionLevel: 9,
      effort: 10,
      dither: 1.0,
    };
  };

  if (options.format) {
    const fmt = options.format.toLowerCase();
    const isLossless = options.quality === "lossless";
    const qRaw = parseInt(options.quality, 10);
    const hasQuality = options.quality !== undefined && !isNaN(qRaw);

    if (fmt === "png") {
      if (isLossless || hasQuality) {
        const q = hasQuality ? qRaw : 100;
        instance = instance.png(getPngOptions(q, isLossless));
      } else {
        instance = instance.png();
      }
    } else if (fmt === "jpg" || fmt === "jpeg") {
      if (isLossless) {
        instance = instance.jpeg({ quality: 100, mozjpeg: false });
      } else if (hasQuality) {
        instance = instance.jpeg({ quality: Math.max(1, Math.min(100, qRaw)), mozjpeg: qRaw < 90 });
      } else {
        instance = instance.jpeg();
      }
    } else {
      // tiff/gif no soportan lossless:true via toFormat
      if (fmt === "gif" && isLossless) {
        instance = instance.gif();
      } else {
        const formatOptions = {};
        if (isLossless) formatOptions.lossless = true;
        else if (hasQuality) formatOptions.quality = Math.max(1, Math.min(100, qRaw));
        instance = instance.toFormat(fmt, formatOptions);
      }
    }
  } else if (options.quality) {
    const isLossless = options.quality === "lossless";
    const qRaw = parseInt(options.quality, 10);
    const q = !isNaN(qRaw) ? Math.max(1, Math.min(100, qRaw)) : 80;
    // Determinar formato real por extensión de salida (sin -f, se infiere del original)
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === ".png") {
      instance = instance.png(getPngOptions(q, isLossless));
    } else if (ext === ".jpg" || ext === ".jpeg") {
      if (isLossless) {
        instance = instance.jpeg({ quality: 100, mozjpeg: false });
      } else {
        instance = instance.jpeg({ quality: q, mozjpeg: q < 90 });
      }
    } else if (ext === ".webp") {
      if (isLossless) {
        instance = instance.webp({ lossless: true });
      } else {
        instance = instance.webp({ quality: q, effort: 4 });
      }
    } else if (ext === ".avif") {
      if (isLossless) {
        instance = instance.avif({ lossless: true });
      } else {
        instance = instance.avif({ quality: q, effort: 4 });
      }
    } else if (ext === ".tiff") {
      instance = instance.tiff({ quality: q });
    }
    // gif sin quality lossless -> gif es siempre lossless, no aplicar lossless flag
  }

  // 6. Execution
  const info = await instance.toFile(outputPath);
  return info;
}
