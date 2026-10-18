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

export const BLUE_GREEN_PALETTE = [
  "#0D9488", // Deep Emerald Teal
  "#0284C7", // Ocean Blue
  "#10B981", // Vibrant Emerald Green
  "#2563EB", // Royal Blue
  "#059669", // Deep Forest Green
  "#06B6D4", // Aquamarine Cyan
  "#3B82F6", // Sky Blue
  "#16A34A", // Lush Green
];

export const DEFAULT_TAG_PALETTE = BLUE_GREEN_PALETTE;

export const SPECIES_NAMES_ID: Record<string, string> = {
  nordic_pine: "Cemara Kabut Utara",
  pine: "Pinus Gunung",
  oak: "Beringin Kuno",
  round_oak: "Beringin Rimbun",
  birch: "Birch Emas",
  elm: "Elm Rindang",
  autumn: "Maple Emas Gugur",
  banana: "Pisang Tropis",
  savannah: "Akasia Emas",
  cypress: "Cemara Ramping",
  palm: "Palem Tropis Pesisir",
  coconut: "Kelapa Gading Pesisir",
  tiered_pine: "Pinus Bertingkat Kerajaan",
  baobab: "Baobab Raksasa",
  ancient: "Pohon Roh Kuno",
};

export const SPECIES_NAMES_EN: Record<string, string> = {
  nordic_pine: "Nordic Spruce",
  pine: "Mountain Pine",
  oak: "Ancient Oak",
  round_oak: "Banyan Oak",
  birch: "Golden Birch",
  elm: "Canopy Elm",
  autumn: "Autumn Gold Oak",
  banana: "Tropical Banana",
  savannah: "Golden Acacia",
  cypress: "Tall Cypress",
  palm: "Coastal Palm",
  coconut: "Island Coconut",
  tiered_pine: "Royal Tiered Pine",
  baobab: "Giant Baobab",
  ancient: "Ancient Spirit Tree",
};

export function getSpeciesName(key: string, lang: string = "id"): string {
  if (lang === "en") {
    return SPECIES_NAMES_EN[key] || "Nordic Spruce";
  }
  return SPECIES_NAMES_ID[key] || "Cemara Kabut Utara";
}

export const SPECIES_NAMES = SPECIES_NAMES_EN;

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
