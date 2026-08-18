import * as ort from "onnxruntime-web";

// Configure WASM paths for Next.js static asset serving if needed
ort.env.wasm.numThreads = 1;

export interface ClientPredictionResult {
  predicted_item: string;
  confidence: number;
  category: string;
  inferenceTimeMs: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

const CLASS_NAMES = ["cardboard", "glass", "metal", "paper", "plastic", "trash"];

let sessionPromise: Promise<ort.InferenceSession> | null = null;

export async function getONNXSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create("/models/best.onnx", {
      executionProviders: ["wasm"],
    });
  }
  return sessionPromise;
}

export function getCategory(predictedItem: string): string {
  return predictedItem.toLowerCase() === "trash" ? "Non-Recyclable" : "Recyclable";
}

/**
 * Preprocesses an HTMLImageElement into an ONNX float32 tensor of shape [1, 3, 640, 640]
 */
export async function preprocessImage(img: HTMLImageElement): Promise<ort.Tensor> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create 2D canvas context for preprocessing.");
  }

  // Draw image stretched/scaled to 640x640
  ctx.drawImage(img, 0, 0, 640, 640);
  const imageData = ctx.getImageData(0, 0, 640, 640);
  const { data } = imageData; // RGBA uint8 array (size 640 * 640 * 4)

  const float32Data = new Float32Array(1 * 3 * 640 * 640);

  // Planar format: RRR... GGG... BBB...
  for (let i = 0; i < 640 * 640; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    float32Data[i] = r / 255.0; // Red channel
    float32Data[640 * 640 + i] = g / 255.0; // Green channel
    float32Data[2 * 640 * 640 + i] = b / 255.0; // Blue channel
  }

  return new ort.Tensor("float32", float32Data, [1, 3, 640, 640]);
}

/**
 * Runs client-side ONNX inference using ONNX Runtime Web
 */
export async function runClientInference(
  imageFile: File
): Promise<ClientPredictionResult> {
  const startTime = performance.now();

  // Load image element from File
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = URL.createObjectURL(imageFile);
  });

  const tensor = await preprocessImage(img);
  const session = await getONNXSession();

  const feeds: Record<string, ort.Tensor> = { images: tensor };
  const outputMap = await session.run(feeds);
  const output0 = outputMap["output0"]; // Float32Array shape [1, 10, 8400]

  const outputData = output0.data as Float32Array;

  // Output shape is [1, 10, 8400]
  // 10 channels x 8400 anchors
  // Channel 0: cx, Channel 1: cy, Channel 2: w, Channel 3: h
  // Channels 4..9: scores for classes 0..5
  const numAnchors = 8400;
  const numClasses = 6;

  let maxConf = -1;
  let bestClassId = 0;
  let bestBox = { x: 0, y: 0, w: 0, h: 0 };

  for (let a = 0; a < numAnchors; a++) {
    // Find best class score for anchor `a`
    for (let c = 0; c < numClasses; c++) {
      const score = outputData[(4 + c) * numAnchors + a];
      if (score > maxConf) {
        maxConf = score;
        bestClassId = c;
        bestBox = {
          x: outputData[0 * numAnchors + a],
          y: outputData[1 * numAnchors + a],
          w: outputData[2 * numAnchors + a],
          h: outputData[3 * numAnchors + a],
        };
      }
    }
  }

  const endTime = performance.now();

  if (maxConf < 0.05) {
    throw new Error("No waste items detected with sufficient confidence.");
  }

  const predictedItem = CLASS_NAMES[bestClassId] || "trash";
  const category = getCategory(predictedItem);

  return {
    predicted_item: predictedItem,
    confidence: maxConf,
    category: category,
    inferenceTimeMs: Math.round(endTime - startTime),
    bbox: bestBox,
  };
}
