import { pipeline } from "@huggingface/transformers";
import sharp from "sharp";
import { t } from "./i18n.js";

const MODELS = {
  fast: "onnx-community/BEN2-ONNX",
  hq: "onnx-community/BiRefNet_512x512-ONNX",
};

const aiState = {
  fast: null,
  hq: null,
};

function normalizeMode(m) {
  if (!m) return "fast";
  const lower = String(m).toLowerCase().trim();
  if (lower === "fast") return "fast";
  if (lower === "hq") return "hq";
  return lower;
}

export async function initAI(mode = "fast", { onProgress } = {}) {
  const normalized = normalizeMode(mode);
  const modelId = MODELS[normalized];
  if (!modelId) throw new Error(`Invalid AI mode: ${mode} (allowed: fast, hq)`);
  if (aiState[normalized]) return aiState[normalized];

  const progressCb = onProgress
    ? (data) => {
        if (data.status === "progress" && data.progress !== undefined) {
          onProgress(Math.round(data.progress));
        } else if (data.status === "downloading" || data.status === "initiate") {
          onProgress(data);
        }
      }
    : undefined;

  try {
    const pipe = await pipeline("background-removal", modelId, {
      device: "webgpu",
      progress_callback: progressCb,
    });
    aiState[normalized] = pipe;
    return pipe;
  } catch (error) {
    const pipe = await pipeline("background-removal", modelId, {
      device: "cpu",
      progress_callback: progressCb,
    });
    aiState[normalized] = pipe;
    return pipe;
  }
}

export async function removeBackground(image, mode = "fast") {
  const normalized = normalizeMode(mode);
  const pipe = aiState[normalized];
  if (!pipe) throw new Error(t("msg_ai_not_initialized"));
  const result = await pipe(image);
  const data = result.data;
  const rawBuffer = data.buffer ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(data);
  const buffer = await sharp(rawBuffer, {
    raw: { width: result.width, height: result.height, channels: 4 },
  }).png().toBuffer();
  return buffer;
}
