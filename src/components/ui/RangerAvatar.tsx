"use client";

import React, { useState } from "react";
import { User } from "lucide-react";

export type RangerAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

interface RangerAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: RangerAvatarSize;
  className?: string;
  borderClassName?: string;
  alt?: string;
}

/**
 * Mendeteksi apakah string avatar adalah URL gambar (web url, base64, path relatif, atau blob)
 */
export function isImageAvatarUrl(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
}

export function RangerAvatar({
  avatarUrl,
  name,
  size = "md",
  className = "",
  borderClassName = "",
  alt,
}: RangerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Normalisasi dimensi dan ukuran font
  let dimensionClass = "w-11 h-11 text-lg";
  let iconSize = "w-5 h-5";
  let customStyle: React.CSSProperties | undefined = undefined;

  if (typeof size === "number") {
    customStyle = { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.45)}px` };
    iconSize = "w-1/2 h-1/2";
  } else {
    switch (size) {
      case "xs":
        dimensionClass = "w-6 h-6 text-xs";
        iconSize = "w-3 h-3";
        break;
      case "sm":
        dimensionClass = "w-8 h-8 text-sm";
        iconSize = "w-4 h-4";
        break;
      case "md":
        dimensionClass = "w-11 h-11 text-lg";
        iconSize = "w-5 h-5";
        break;
      case "lg":
        dimensionClass = "w-14 h-14 text-2xl";
        iconSize = "w-7 h-7";
        break;
      case "xl":
        dimensionClass = "w-20 h-20 text-4xl";
        iconSize = "w-9 h-9";
        break;
    }
  }

  const isImg = isImageAvatarUrl(avatarUrl) && !imageFailed;
  const initial = (name?.trim()?.charAt(0) || "R").toUpperCase();

  return (
    <div
      style={customStyle}
      className={`
        relative shrink-0 flex items-center justify-center rounded-full overflow-hidden select-none
        bg-[#bfdac8]/60 text-[#143525]
        ${typeof size === "string" ? dimensionClass : ""}
        ${borderClassName}
        ${className}
      `}
    >
      {isImg ? (
        <img
          src={avatarUrl!}
          alt={alt || name || "Avatar Ranger"}
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : avatarUrl && avatarUrl.trim().length > 0 ? (
        <span className="leading-none transform translate-y-[0.5px]">
          {avatarUrl.trim()}
        </span>
      ) : name ? (
        <span className="font-bold tracking-tight text-[#143525]/90">
          {initial}
        </span>
      ) : (
        <User className={`${iconSize} stroke-[2.2] text-[#143525]/80`} />
      )}
    </div>
  );
}
