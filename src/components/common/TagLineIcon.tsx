import React from 'react';
import {
  BookOpen,
  Briefcase,
  Code,
  BookMarked,
  Palette,
  Heart,
  Target,
  Zap,
  Music,
  Dumbbell,
  Lightbulb,
  Coffee,
  Leaf,
  Sparkles,
  Compass,
  Clock,
  Tag,
  LucideProps,
} from 'lucide-react';

export const LINE_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  BookOpen,
  Briefcase,
  Code,
  BookMarked,
  Palette,
  Heart,
  Target,
  Zap,
  Music,
  Dumbbell,
  Lightbulb,
  Coffee,
  Leaf,
  Sparkles,
  Compass,
  Clock,
  Tag,
};

export const LINE_ICON_KEYS = [
  'Target',
  'BookOpen',
  'Briefcase',
  'Code',
  'BookMarked',
  'Zap',
  'Heart',
  'Palette',
  'Music',
  'Dumbbell',
  'Lightbulb',
  'Coffee',
  'Leaf',
  'Sparkles',
];

interface TagLineIconProps extends LucideProps {
  name?: string;
  className?: string;
}

/**
 * Clean outline line icon for Rimba category tags.
 * Strictly line-art style (green & white aesthetic).
 */
export function TagLineIcon({ name, className = 'w-4 h-4', strokeWidth = 1.8, ...props }: TagLineIconProps) {
  if (!name) return <Target className={className} strokeWidth={strokeWidth} {...props} />;

  // Normalize legacy emojis to corresponding line icon keys if encountered
  const normalizedKey =
    name === '🎯' ? 'Target' :
    name === '📚' ? 'BookOpen' :
    name === '💼' ? 'Briefcase' :
    name === '💻' ? 'Code' :
    name === '📖' ? 'BookMarked' :
    name === '⚡' ? 'Zap' :
    name === '🧘' ? 'Heart' :
    name === '🎨' ? 'Palette' :
    name === '🎵' ? 'Music' :
    name === '🏋️' ? 'Dumbbell' :
    name === '💡' ? 'Lightbulb' :
    name === '☕' ? 'Coffee' :
    name === '🌱' ? 'Leaf' :
    name.trim();

  const IconComp = LINE_ICON_MAP[normalizedKey] || Target;
  return <IconComp className={className} strokeWidth={strokeWidth} {...props} />;
}
