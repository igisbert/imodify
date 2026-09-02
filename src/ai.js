import { pipeline } from "@huggingface/transformers";
import sharp from "sharp";
import { t } from "./i18n.js";

const model = "onnx-community/BEN2-ONNX";

const aiPipeline = {
  segmentation: null,
};

export async function initAI() {
  if (!aiPipeline.segmentation) {
    try {
      aiPipeline.segmentation = await pipeline("background-removal", model, {
        device: "webgpu",
      });
    } catch (error) {
      aiPipeline.segmentation = await pipeline("background-removal", model, {
        device: "cpu",
      });
    }
  }
}

export async function removeBackground(image) {
  if (!aiPipeline.segmentation) {
    throw new Error(t("msg_ai_not_initialized"));
  }

  const result = await aiPipeline.segmentation(image);

  const buffer = await sharp(Buffer.from(result.data), {
    raw: {
      width: result.width,
      height: result.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return buffer;
}

/*  import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";
import fs from "fs";

env.logLevel = "error";

const model = "briaai/RMBG-1.4";

const aiPipeline = {
    model: null,
    processor: null
}

export async function initAI() {
    if (!aiPipeline.model) {
        aiPipeline.model = await AutoModel.from_pretrained(model, { device: "cpu" });
        aiPipeline.processor = await AutoProcessor.from_pretrained(model);
    }
}

export async function removeBackground(imagePath) {
    if (!aiPipeline.model) {
        throw new Error("AI not initialized");
    }

    const imageBuffer = fs.readFileSync(imagePath);

    // Obtener metadata y buffer RGBA con sharp
    const { data: rgbaData, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // RawImage solo para el processor (necesita 3 canales para inferencia)
    const { data: rgbData } = await sharp(imageBuffer)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const rgbImage = new RawImage(new Uint8ClampedArray(rgbData.buffer), info.width, info.height, 3);

    // Inferencia
    const inputs = await aiPipeline.processor(rgbImage);
    const { output } = await aiPipeline.model({ input: inputs.pixel_values });

    const maskTensor = output[0][0].mul(255).to("uint8").unsqueeze(0);
    const mask = await RawImage.fromTensor(maskTensor);
    const resizedMask = await mask.resize(info.width, info.height);

    // Aplicar máscara al buffer RGBA de sharp
    const sourcePixels = new Uint8ClampedArray(rgbaData.buffer);
    const maskPixels = resizedMask.data;

    for (let i = 0; i < maskPixels.length; i++) {
        sourcePixels[i * 4 + 3] = maskPixels[i];
    }

    return await sharp(Buffer.from(sourcePixels.buffer), {
        raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();
} */
