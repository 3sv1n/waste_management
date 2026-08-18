export interface Detection {
  id: number;
  predicted_item: string;
  confidence: number;
  category: string;
  timestamp: string;
  image_path?: string;
}

export interface Stats {
  total_processed: number;
  items: Record<string, number>;
}

const STORAGE_KEY = "waste_segregation_detections_v2";

/**
 * Retrieve all stored detections from localStorage.
 * Starts with a clean empty array for real predictions.
 */
export function getStoredDetections(): Detection[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as Detection[];
  } catch {
    return [];
  }
}

/**
 * Save a new classification detection item to localStorage.
 */
export function addDetection(newDet: {
  predicted_item: string;
  confidence: number;
  category: string;
  image_path?: string;
}): { detection: Detection; stats: Stats; allDetections: Detection[] } {
  const current = getStoredDetections();
  
  const created: Detection = {
    id: Date.now(),
    predicted_item: newDet.predicted_item,
    confidence: newDet.confidence,
    category: newDet.category,
    timestamp: new Date().toISOString(),
    image_path: newDet.image_path || "inspection.jpg",
  };

  const updated = [created, ...current];

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save detection to localStorage:", e);
    }
  }

  const stats = calculateStats(updated);
  return { detection: created, stats, allDetections: updated };
}

/**
 * Clear all stored detections telemetry.
 */
export function clearDetections(): { stats: Stats; allDetections: Detection[] } {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  const empty: Detection[] = [];
  return { stats: calculateStats(empty), allDetections: empty };
}

/**
 * Calculate total statistics from detections list.
 */
export function calculateStats(detections: Detection[]): Stats {
  const items: Record<string, number> = {
    cardboard: 0,
    glass: 0,
    metal: 0,
    paper: 0,
    plastic: 0,
    trash: 0,
  };

  detections.forEach((d) => {
    const key = d.predicted_item.toLowerCase();
    if (key in items) {
      items[key] = items[key] + 1;
    }
  });

  return {
    total_processed: detections.length,
    items,
  };
}
