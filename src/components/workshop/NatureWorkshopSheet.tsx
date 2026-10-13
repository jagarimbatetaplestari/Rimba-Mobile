"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { BUILD_CATALOG, CatalogItem, GAME_CONFIG } from "@/lib/game/config";
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
  isTileUnlocked,
  isTileOccupied,
  findEmptyTileNearCenter,
} from "@/lib/game/worldRules";
import {
  Waves,
  Mountain,
  Footprints,
  X,
  Sparkles,
  Tent,
  Flower2,
  RotateCw,
  Truck,
  Maximize2,
  Check,
} from "lucide-react";
import { soundManager } from "@/lib/audio/sounds";
import {
  preloadAllManifestModels,
  preloadModelPath,
} from "@/components/canvas/WorldObjects";
import { getManifestItem } from "@/lib/game/assetManifest";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";

type CategoryType =
  | "Water & Rivers"
  | "Flora & Fungi"
  | "Rocks & Timber"
  | "Structures"
  | "Paths";

const CATEGORIES: CategoryType[] = [
  "Water & Rivers",
  "Flora & Fungi",
  "Rocks & Timber",
  "Structures",
  "Paths",
];

export function NatureWorkshopSheet() {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "expansion">(
    "catalog",
  );
  const [activeCategory, setActiveCategory] = useState<CategoryType>("Water & Rivers");

  const selectedCatalogItem = useGameStore(
    (state) => state.selectedCatalogItem,
  );
  const setSelectedCatalogItem = useGameStore(
    (state) => state.setSelectedCatalogItem,
  );
  const setSelectedObject = useGameStore((state) => state.setSelectedObject);
  const placementRotation = useGameStore((state) => state.placementRotation);
  const rotatePlacement = useGameStore((state) => state.rotatePlacement);
  const relocatingObjectId = useGameStore((state) => state.relocatingObjectId);
  const cancelRelocation = useGameStore((state) => state.cancelRelocation);
  const isExpandLandMode = useGameStore((state) => state.isExpandLandMode);
  const setIsExpandLandMode = useGameStore(
    (state) => state.setIsExpandLandMode,
  );
  const bribeBulldozerCrew = useGameStore((state) => state.bribeBulldozerCrew);
  const gold = useGameStore((state) => state.saveData.profile.goldCached);
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const activeSession = useGameStore((state) => state.activeSession);
  const hoveredGridTile = useGameStore((state) => state.hoveredGridTile);
  const placeCatalogItem = useGameStore((state) => state.placeCatalogItem);
  const confirmRelocation = useGameStore((state) => state.confirmRelocation);

  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(world, worldObjects),
    [world, worldObjects],
  );
  const zoneInfo = useMemo(
    () => getLandExpansionZoneInfo(unlockedSet.size),
    [unlockedSet.size],
  );
  const hasBulldozerThreat = Boolean(world.bulldozer?.active);
  const sealedTilesCount = world.sealed_tiles?.length || 0;

  const placementValidation = useMemo(() => {
    if (!hoveredGridTile) {
      return {
        isValid: false,
        reason: t.workshop.selectTilePrompt,
        isBridgeOverRiver: false,
      };
    }

    const { grid_x, grid_y } = hoveredGridTile;

    if (!isTileUnlocked(grid_x, grid_y, unlockedSet)) {
      return {
        isValid: false,
        reason: t.workshop.tileLocked,
        isBridgeOverRiver: false,
      };
    }

    const isSealed = (world.sealed_tiles || []).includes(`${grid_x},${grid_y}`);
    if (isSealed) {
      return {
        isValid: false,
        reason: t.workshop.tileSealed,
        isBridgeOverRiver: false,
      };
    }

    if (relocatingObjectId) {
      const otherObjects = worldObjects.filter((o) => o.id !== relocatingObjectId);
      if (isTileOccupied(grid_x, grid_y, otherObjects)) {
        return {
          isValid: false,
          reason: t.workshop.tileOccupied,
          isBridgeOverRiver: false,
        };
      }
      return { isValid: true, reason: null, isBridgeOverRiver: false };
    }

    if (selectedCatalogItem) {
      const existingObj = worldObjects.find(
        (o) => o.grid_x === grid_x && o.grid_y === grid_y && o.status !== "marked_for_clearing"
      );
      const isBridge =
        selectedCatalogItem.id.toLowerCase().includes("bridge") ||
        selectedCatalogItem.model.toLowerCase().includes("bridge");
      const isRiverOnTile = Boolean(
        existingObj &&
        ((existingObj.model_variant || "").toLowerCase().includes("river") ||
         (existingObj.id || "").toLowerCase().includes("river"))
      );

      const occupied = existingObj ? !(isBridge && isRiverOnTile) : false;
      if (occupied) {
        return {
          isValid: false,
          reason: t.workshop.tileOccupied,
          isBridgeOverRiver: false,
        };
      }

      if (gold < selectedCatalogItem.cost) {
        return {
          isValid: false,
          reason: t.workshop.insufficientSoul,
          isBridgeOverRiver: false,
        };
      }

      return {
        isValid: true,
        reason: null,
        isBridgeOverRiver: Boolean(isBridge && isRiverOnTile),
      };
    }

    return { isValid: false, reason: null, isBridgeOverRiver: false };
  }, [
    hoveredGridTile,
    unlockedSet,
    world.sealed_tiles,
    relocatingObjectId,
    worldObjects,
    selectedCatalogItem,
    gold,
    t.workshop,
  ]);

  const handleConfirmPlacement = () => {
    if (!hoveredGridTile || !placementValidation.isValid) return;
    soundManager.playPop();
    hapticMedium();

    if (relocatingObjectId) {
      const ok = confirmRelocation(
        hoveredGridTile.grid_x,
        hoveredGridTile.grid_y
      );
      if (ok) soundManager.playPlace();
    } else if (selectedCatalogItem) {
      const ok = placeCatalogItem(
        selectedCatalogItem,
        hoveredGridTile.grid_x,
        hoveredGridTile.grid_y
      );
      if (ok) {
        soundManager.playPlace();
        setSelectedCatalogItem(null);
      }
    }
  };

  useEffect(() => {
    const handleWorkshop = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: "catalog" | "expansion" }>)
        .detail;
      soundManager.playPop();
      hapticLight();
      if (detail?.tab) {
        setActiveTab(detail.tab);
      }
      preloadAllManifestModels(activeCategory);
      setSelectedObject(null);
      setIsOpen(true);
    };
    window.addEventListener("rimba:open_workshop", handleWorkshop);
    return () =>
      window.removeEventListener("rimba:open_workshop", handleWorkshop);
  }, [activeCategory, setSelectedObject]);

  const handleSelectItem = (item: CatalogItem) => {
    soundManager.playPop();
    hapticLight();
    const manifestItem =
      getManifestItem(item.id) || getManifestItem(item.model);
    if (manifestItem) {
      preloadModelPath(manifestItem.modelPath);
    }

    // Immediately calculate an open, unlocked tile closest to the center of the island
    const isBridge =
      item.id.toLowerCase().includes("bridge") ||
      item.model.toLowerCase().includes("bridge");
    let defaultTile = findEmptyTileNearCenter(worldObjects, unlockedSet);

    // If placing a bridge, optionally prefer finding an unoccupied river tile
    if (isBridge) {
      const riverTile = worldObjects.find(
        (o) =>
          ((o.model_variant || "").toLowerCase().includes("river") ||
            (o.id || "").toLowerCase().includes("river")) &&
          !worldObjects.some(
            (other) =>
              other.grid_x === o.grid_x &&
              other.grid_y === o.grid_y &&
              ((other.id || "").toLowerCase().includes("bridge") ||
                (other.model_variant || "").toLowerCase().includes("bridge"))
          )
      );
      if (riverTile) {
        defaultTile = { grid_x: riverTile.grid_x, grid_y: riverTile.grid_y };
      }
    }

    if (!defaultTile) {
      const firstUnlocked = Array.from(unlockedSet)[0];
      if (firstUnlocked) {
        const [fx, fy] = firstUnlocked.split(",").map(Number);
        defaultTile = { grid_x: fx, grid_y: fy };
      } else {
        defaultTile = { grid_x: 4, grid_y: 4 };
      }
    }

    useGameStore.getState().setHoveredGridTile(defaultTile);
    setSelectedCatalogItem(item);
    setIsOpen(false);
  };

  if (activeSession) {
    return null;
  }

  const categoryItems = BUILD_CATALOG.filter(
    (item) => item.category === activeCategory,
  );
  const rotationDegrees = Math.round((placementRotation * 180) / Math.PI) % 360;
  const normalizedDegrees = ((rotationDegrees % 360) + 360) % 360;
  const directionInfo = useMemo(() => {
    const isEn = language === "en";
    if (normalizedDegrees >= 45 && normalizedDegrees < 135) {
      return { arrow: "→", label: isEn ? "East" : "Timur" };
    }
    if (normalizedDegrees >= 135 && normalizedDegrees < 225) {
      return { arrow: "↓", label: isEn ? "South" : "Selatan" };
    }
    if (normalizedDegrees >= 225 && normalizedDegrees < 315) {
      return { arrow: "←", label: isEn ? "West" : "Barat" };
    }
    return { arrow: "↑", label: isEn ? "North" : "Utara" };
  }, [normalizedDegrees, language]);

  const getCategoryIcon = (cat: CategoryType) => {
    switch (cat) {
      case "Water & Rivers":
        return <Waves className="w-3.5 h-3.5" />;
      case "Flora & Fungi":
        return <Flower2 className="w-3.5 h-3.5" />;
      case "Rocks & Timber":
        return <Mountain className="w-3.5 h-3.5" />;
      case "Structures":
        return <Tent className="w-3.5 h-3.5" />;
      case "Paths":
        return <Footprints className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryLabel = (cat: CategoryType) => {
    return t.workshop.categories[cat] || cat;
  };

  const getCatalogItemIcon = (item: CatalogItem): string => {
    const id = item.id.toLowerCase();
    const name = item.name.toLowerCase();

    // 1. Water & Rivers
    if (id.includes("stream") || name.includes("aliran") || name.includes("sungai")) return "💧";
    if (id.includes("bend") || name.includes("kelokan")) return "🌊";
    if (id.includes("pond") || name.includes("danau") || name.includes("teratai")) return "🪷";
    if (id.includes("boulder") || name.includes("muara") || name.includes("batu air")) return "🪨";

    // 2. Paths & Bridges (Bridge strictly 🌉, never Japanese Torii gate ⛩️)
    if (id.includes("bridge") || name.includes("jembatan")) return "🌉";
    if (id.includes("stepping") || name.includes("pijakan")) return "👣";
    if (id.includes("path_wood") || name.includes("papan kayu")) return "🪵";
    if (id.includes("path_stone") || name.includes("batu lempeng")) return "🪨";

    // 3. Structures
    if (id.includes("campfire") || id.includes("fire") || name.includes("api")) return "🔥";
    if (id.includes("tent") || name.includes("tenda") || name.includes("kemah")) return "⛺";
    if (id.includes("bench") || name.includes("bangku")) return "🪑";
    if (id.includes("lantern") || id.includes("lamp") || name.includes("lentera")) return "🏮";

    // 4. Flora & Fungi (Distinct botanicals)
    if (id.includes("flower_red") || id.includes("crimson")) return "🌺";
    if (id.includes("flower_yellow") || id.includes("buttercup")) return "🌼";
    if (id.includes("flower_purple") || id.includes("bluebell")) return "🪻";
    if (id.includes("fruit") || id.includes("berry") || name.includes("beri")) return "🫐";
    if (id.includes("shroom_amanita")) return "🍄";
    if (id.includes("shroom_chanterelle")) return "🍄";
    if (id.includes("mushroom") || name.includes("jamur")) return "🍄";
    if (id.includes("fern") || name.includes("pakis")) return "🌿";
    if (id.includes("bush_round") || name.includes("semak belukar")) return "🪴";
    if (id.includes("bush") || name.includes("semak")) return "🌿";
    if (id.includes("hedge") || name.includes("pagar")) return "🌳";
    if (id.includes("autumn") || name.includes("keemasan")) return "🍂";
    if (id.includes("flowers_tall") || name.includes("semampai")) return "🌷";
    if (id.includes("flowers") || name.includes("padang")) return "💐";

    // 5. Rocks & Timber
    if (id.includes("rock_tall") || name.includes("crag")) return "⛰️";
    if (id.includes("rock_small") || name.includes("pebble")) return "🪨";
    if (id.includes("stump") || name.includes("tunggul")) return "🪵";
    if (id.includes("log") || name.includes("rebah") || name.includes("batang")) return "🪵";
    if (id.includes("branch") || name.includes("ranting")) return "🪵";
    if (id.includes("trunk") || name.includes("pangkal")) return "🪵";
    if (id.includes("root") || name.includes("akar")) return "🪵";
    if (id.includes("crystal") || name.includes("kristal")) return "💎";
    if (id.includes("rock") || id.includes("stone") || name.includes("batu")) return "🪨";

    if (item.category === "Water & Rivers") return "💧";
    if (item.category === "Flora & Fungi") return "🌸";
    if (item.category === "Rocks & Timber") return "🪨";
    if (item.category === "Structures") return "🛖";
    if (item.category === "Paths") return "🌉";

    return "🌱";
  };

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* 1. Mode Perluas Lahan Floating Capsule */}
      {isExpandLandMode && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2 w-[92%] max-w-[380px] animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 84px), 96px)",
          }}
        >
          <div className="w-full p-2 px-3.5 rounded-full border border-white/85 bg-white/80 backdrop-blur-2xl shadow-[0_16px_36px_rgba(20,53,37,0.12)] flex items-center justify-between gap-3 text-[#143525]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#bfdac8]/50 text-[#143525] flex items-center justify-center shrink-0">
                <Maximize2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate tracking-tight text-[#143525]">
                  {t.workshop.expandModeTitle}
                </span>
                <span className="text-[10px] text-[#456b57] font-medium">
                  +{zoneInfo.nextTileCost} Soul {t.workshop.perTile}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setIsExpandLandMode(false);
              }}
              className="py-1.5 px-3.5 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-xs tracking-tight shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>{t.common.done}</span>
            </button>
          </div>

          <span className="text-[10.5px] font-medium text-[#143525] bg-white/70 border border-white/85 backdrop-blur-md px-3.5 py-1 rounded-full shadow-2xs">
            {t.workshop.expandHint}
          </span>
        </div>
      )}

      {/* 2. Mode Peletakan / Pindah Objek Floating Card */}
      {(selectedCatalogItem || relocatingObjectId) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center w-[92%] max-w-[390px] animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 84px), 96px)",
          }}
        >
          <div className="w-full p-3.5 rounded-2xl border border-white/90 bg-white/95 backdrop-blur-2xl shadow-[0_16px_38px_rgba(20,53,37,0.18)] flex flex-col gap-2.5 text-[#143525]">
            {/* Top Row: Item Details & Action Buttons (Putar & Batal) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#bfdac8]/40 flex items-center justify-center shrink-0 text-xl shadow-2xs border border-white/80">
                  {selectedCatalogItem
                    ? getCatalogItemIcon(selectedCatalogItem)
                    : "🔄"}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold truncate tracking-tight text-[#143525]">
                      {selectedCatalogItem
                        ? selectedCatalogItem.name
                        : t.workshop.moveObjTitle}
                    </span>
                    {selectedCatalogItem && (
                      <span className="text-[10px] font-semibold text-[#187557] bg-[#187557]/10 px-1.5 py-0.5 rounded-full shrink-0">
                        {selectedCatalogItem.cost > 0
                          ? `${selectedCatalogItem.cost} Soul`
                          : t.common.free}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[#456b57] font-medium">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-[#187557]/10 text-[#187557] font-bold text-[10px] shrink-0 leading-none">
                      {directionInfo.arrow}
                    </span>
                    <span>{normalizedDegrees}°</span>
                    <span className="text-[#143525]/60 font-semibold">
                      ({directionInfo.label})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    rotatePlacement();
                  }}
                  className="h-8 px-2.5 rounded-full bg-white hover:bg-slate-50 text-[#143525] flex items-center gap-1 text-[11px] font-semibold active:scale-95 transition-all border border-[#143525]/12 shadow-2xs cursor-pointer"
                  title={t.workshop.rotateTitle}
                >
                  <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{t.workshop.rotateBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    if (selectedCatalogItem) setSelectedCatalogItem(null);
                    if (relocatingObjectId) cancelRelocation();
                  }}
                  className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                  title={t.workshop.cancelBtn}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Middle Row: Status / Hint Indicator */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#143525]/4 text-[11px] border border-[#143525]/6">
              {!hoveredGridTile ? (
                <span className="text-[#456b57] font-medium flex items-center gap-1.5 truncate">
                  <span>📍</span>
                  <span>{t.workshop.selectTilePrompt}</span>
                </span>
              ) : placementValidation.isValid ? (
                <span className="text-[#125D44] font-semibold flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    {placementValidation.isBridgeOverRiver
                      ? `${t.workshop.tilePrefix} (${hoveredGridTile.grid_x}, ${hoveredGridTile.grid_y}) • ${t.workshop.tileBridgeReady}`
                      : t.workshop.tileReady
                          .replace("{x}", String(hoveredGridTile.grid_x))
                          .replace("{y}", String(hoveredGridTile.grid_y))}
                  </span>
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>
                    {t.workshop.tilePrefix} ({hoveredGridTile.grid_x}, {hoveredGridTile.grid_y}): {placementValidation.reason}
                  </span>
                </span>
              )}

              {hoveredGridTile && (
                <span className="text-[10px] text-[#456b57] font-mono shrink-0">
                  [{hoveredGridTile.grid_x},{hoveredGridTile.grid_y}]
                </span>
              )}
            </div>

            {/* Bottom Row: Explicit Confirmation Button */}
            <button
              type="button"
              disabled={!hoveredGridTile || !placementValidation.isValid}
              onClick={handleConfirmPlacement}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-2 ${
                hoveredGridTile && placementValidation.isValid
                  ? "bg-[#187557] hover:bg-[#125D44] text-white active:scale-[0.98] cursor-pointer shadow-md shadow-[#187557]/25"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.6]" />
              <span>
                {!hoveredGridTile
                  ? (language === "en" ? "Select Tile to Confirm" : "Pilih Petak di Pulau")
                  : !placementValidation.isValid
                  ? placementValidation.reason
                  : relocatingObjectId
                  ? t.workshop.confirmMove
                  : t.workshop.confirmPlace}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Bottom Sheet Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#3d5e4b]/35 backdrop-blur-md z-50 transition-opacity animate-in fade-in duration-200 pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-auto rounded-t-[34px] border-t border-white/85 shadow-[0_-20px_50px_rgba(20,53,37,0.18)] p-4 pt-2.5 pb-[max(env(safe-area-inset-bottom,0px),20px)] flex flex-col gap-3.5 max-h-[85vh] animate-in slide-in-from-bottom duration-300 ease-out text-[#143525]"
            style={{
              background:
                "linear-gradient(180deg, rgba(239, 246, 241, 0.96) 0%, rgba(226, 238, 230, 0.94) 100%)",
            }}
          >
            {/* Grabber Handle */}
            <div className="w-10 h-1 rounded-full bg-[#143525]/20 mx-auto" />

            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#bfdac8]/50 border border-white/80 flex items-center justify-center text-[#143525] shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/40" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-[#143525]">
                    {t.workshop.title}
                  </h2>
                  <p className="text-[11px] text-[#456b57]">
                    {t.workshop.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-white/90 text-[#143525] font-semibold text-xs tabular-nums shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{gold} Soul</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
                  aria-label={t.common.close}
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Segmented Control Pill */}
            <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setActiveTab("catalog");
                }}
                className={`py-1.5 px-3 rounded-full text-xs transition-all cursor-pointer ${
                  activeTab === "catalog"
                    ? "bg-white text-[#143525] font-semibold shadow-xs"
                    : "text-[#456b57] hover:text-[#143525] font-medium"
                }`}
              >
                {t.workshop.tabCatalog}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setActiveTab("expansion");
                }}
                className={`py-1.5 px-3 rounded-full text-xs transition-all cursor-pointer ${
                  activeTab === "expansion"
                    ? "bg-white text-[#143525] font-semibold shadow-xs"
                    : "text-[#456b57] hover:text-[#143525] font-medium"
                }`}
              >
                {t.workshop.tabExpand}
              </button>
            </div>

            {/* Tab 1 Content: Catalog Items */}
            {activeTab === "catalog" && (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticLight();
                        setActiveCategory(cat);
                        preloadAllManifestModels(cat);
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                        activeCategory === cat
                          ? "bg-[#1e5638] border-[#1e5638] text-white font-semibold shadow-2xs"
                          : "bg-white/70 hover:bg-white border-white/85 text-[#456b57] font-medium"
                      }`}
                    >
                      {getCategoryIcon(cat)}
                      <span>{getCategoryLabel(cat)}</span>
                    </button>
                  ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-[46vh] pr-0.5 no-scrollbar">
                  {categoryItems.map((item) => {
                    const canAfford = gold >= item.cost;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className="p-3 rounded-[22px] border border-white/85 bg-white/75 hover:bg-white text-left flex flex-col justify-between gap-2.5 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-2xl p-2 rounded-[16px] bg-[#bfdac8]/40 border border-white/90">
                            {getCatalogItemIcon(item)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                              canAfford
                                ? "bg-amber-50 text-amber-800 border-amber-200/70"
                                : "bg-rose-50 text-rose-700 border-rose-200/70"
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5 fill-current" />
                            <span>{item.cost}</span>
                          </span>
                        </div>

                        <div>
                          <div className="text-[13px] font-semibold text-[#143525] truncate tracking-tight">
                            {item.name}
                          </div>
                          <div className="text-[10.5px] text-[#456b57] line-clamp-1 mt-0.5 font-normal">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2 Content: Land Expansion */}
            {activeTab === "expansion" && (
              <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto max-h-[52vh] pr-0.5 no-scrollbar">
                {/* Zone Progress Card */}
                <div className="p-4 rounded-[24px] border border-white/85 bg-white/75 shadow-2xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#1e5638]">
                        {zoneInfo.shortZoneName}
                      </span>
                      <h3 className="text-[13px] font-semibold mt-0.5 text-[#143525]">
                        {zoneInfo.milestoneRewardText}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-[#143525]">
                        {unlockedSet.size}
                      </span>
                      <span className="text-xs text-[#456b57]"> / 100</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#143525]/10 overflow-hidden">
                    <div
                      className="h-full bg-[#1e5638] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (unlockedSet.size / 100) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#143525]/8">
                    <span className="text-[#456b57]">
                      {t.workshop.nextTileCost}
                    </span>
                    <span className="font-semibold text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{zoneInfo.nextTileCost} Soul</span>
                    </span>
                  </div>
                </div>

                {/* Bulldozer Threat Card */}
                {hasBulldozerThreat && (
                  <div className="p-3.5 rounded-[22px] border border-amber-200/80 bg-amber-50/80 shadow-2xs flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[#143525] truncate">
                          {t.inspect.bulldozerTitle}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        hapticMedium();
                        bribeBulldozerCrew();
                      }}
                      className="py-1.5 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      {t.inspect.repelBtn.replace("{cost}", "40")}
                    </button>
                  </div>
                )}

                {/* Action Button: Perluas Lahan */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    setIsExpandLandMode(true);
                    setIsOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-xs active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 stroke-[2.2]" />
                  <span>{t.workshop.pickTileBtn}</span>
                </button>

                <p className="text-[11px] text-center text-[#456b57] px-2 leading-relaxed">
                  {t.workshop.expandAnimNote}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const BuildToolbar = NatureWorkshopSheet;
