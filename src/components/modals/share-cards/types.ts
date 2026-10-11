export type ShareAspectRatio = "story" | "portrait" | "square";
export type ShareCardTheme = "sanctuary" | "diorama" | "story";

export interface TagStatItem {
  name: string;
  minutes: number;
  pct: number;
  hours: number;
  color: string;
}

export const TAG_COLORS: Record<string, string> = {
  Belajar: "#E06553", // Coral / Red (maths)
  Kerja: "#98B946",   // Olive / Green (pdhpe)
  Koding: "#9284D7",  // Purple / Violet (music)
  Membaca: "#57B894", // Teal / Jade (ees)
  Kreatif: "#F3D053", // Warm Yellow (english)
  Mindfulness: "#D9889B", // Rose / Pink (vis art)
  maths: "#E06553",
  pdhpe: "#98B946",
  music: "#9284D7",
  ees: "#57B894",
  english: "#F3D053",
  "vis art": "#D9889B",
};

export const DEFAULT_TAG_PALETTE = [
  "#E06553",
  "#98B946",
  "#9284D7",
  "#57B894",
  "#F3D053",
  "#D9889B",
  "#3B82F6",
  "#F97316",
];

export const SPECIES_NAMES: Record<string, string> = {
  nordic_pine: "Nordic Pine",
  pine: "Nordic Pine",
  oak: "Ancient Oak",
  round_oak: "Round Oak",
  birch: "Golden Birch",
  elm: "Meadow Elm",
  autumn: "Autumn Maple",
  banana: "Banana Palm",
  savannah: "Savannah Acacia",
  cypress: "Emerald Cypress",
  palm: "Coconut Palm",
  coconut: "Coconut Palm",
  tiered_pine: "Tiered Pine",
  baobab: "Grand Baobab",
  ancient: "Ancient Tree",
};

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y + w, x, y, r);
  ctx.closePath();
}
