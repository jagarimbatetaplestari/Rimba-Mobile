import React from "react";
import {
  Award, Flame, Flower2, Hourglass, Leaf, Map, Mountain, Moon,
  Bird, Bug, Cat, Dog, PawPrint, Rabbit, ShieldCheck, Snowflake, Sparkles, Sprout, Sun, Tent,
  Sunrise, TreeDeciduous, TreePalm, TreePine, Wheat, Zap,
  type LucideIcon, type LucideProps,
} from "lucide-react";

const NATURE_ICONS: Record<string, LucideIcon> = {
  "🌱": Sprout,
  "🌳": TreeDeciduous,
  "🌲": TreePine,
  "🌴": TreePalm,
  "🥥": TreePalm,
  "🍌": Leaf,
  "🌿": Leaf,
  "🍃": Leaf,
  "🍁": Leaf,
  "🌾": Wheat,
  "🌸": Flower2,
  "✨": Sparkles,
  "❄️": Snowflake,
  "🏔️": Mountain,
  "☀️": Sun,
  "🌅": Sunrise,
  "🌙": Moon,
  "🔥": Flame,
  "⚡": Zap,
  "🗺️": Map,
  "🐾": PawPrint,
  "🛡️": ShieldCheck,
  "⏳": Hourglass,
  "🦌": PawPrint,
  "🐨": PawPrint,
  "🐱": Cat,
  "🐦": Bird,
  "🦊": Dog,
  "🐰": Rabbit,
  "🐝": Bug,
  "🏕️": Tent,
};

/** Outline equivalents for legacy nature and achievement icon values. */
export function NatureLineIcon({
  name,
  ...props
}: LucideProps & { name: string }) {
  const Icon = NATURE_ICONS[name] || Award;
  return <Icon aria-hidden="true" {...props} />;
}
