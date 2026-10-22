export interface ColorRgb {
  r: number;
  g: number;
  b: number;
}

export interface ColorWorkerMessage {
  trackId: string;
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ColorWorkerResult {
  c1: ColorRgb;
  c2: ColorRgb;
  c3: ColorRgb;
}

export interface ColorWorkerResponse {
  trackId: string;
  result: ColorWorkerResult;
}

self.onmessage = (e: MessageEvent<ColorWorkerMessage>) => {
  const { trackId, data } = e.data;
  const buckets: { r: number; g: number; b: number; score: number; count: number }[] = [];
  const step = 4 * 4; // Amostragem a cada 4 pixels

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const brightness = (r + g + b) / 3;

    // Ignora pretos/brancos extremos e tons cinzas desbotados
    if (brightness < 28 || brightness > 240 || delta < 20) continue;

    const saturation = delta / (max || 1);
    const score = saturation * 2.0 + (1 - Math.abs(brightness - 128) / 128);

    let matched = false;
    for (const bucket of buckets) {
      const dist = Math.abs(bucket.r - r) + Math.abs(bucket.g - g) + Math.abs(bucket.b - b);
      if (dist < 80) {
        bucket.count++;
        bucket.score = Math.max(bucket.score, score);
        matched = true;
        break;
      }
    }
    if (!matched && buckets.length < 32) {
      buckets.push({ r, g, b, score, count: 1 });
    }
  }

  buckets.sort((a, b) => (b.score * Math.log2(b.count + 2)) - (a.score * Math.log2(a.count + 2)));

  if (buckets.length > 0) {
    const c1: ColorRgb = { r: buckets[0].r, g: buckets[0].g, b: buckets[0].b };
    const c2: ColorRgb = buckets[1]
      ? { r: buckets[1].r, g: buckets[1].g, b: buckets[1].b }
      : {
          r: Math.min(255, c1.g + 50),
          g: Math.min(255, c1.b + 50),
          b: Math.min(255, c1.r + 50),
        };
    const c3: ColorRgb = buckets[2]
      ? { r: buckets[2].r, g: buckets[2].g, b: buckets[2].b }
      : {
          r: Math.max(0, c1.b - 40),
          g: Math.max(0, c1.r - 40),
          b: Math.min(255, c1.g + 60),
        };

    const result: ColorWorkerResult = { c1, c2, c3 };
    self.postMessage({ trackId, result } satisfies ColorWorkerResponse);
  }
};
