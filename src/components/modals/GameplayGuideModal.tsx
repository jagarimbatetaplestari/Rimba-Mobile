"use client";

import React, { useState } from "react";
import {
  X,
  Sprout,
  Maximize2,
  Waves,
  Compass,
  ShieldAlert,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Volume2,
} from "lucide-react";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";

interface GameplayGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  badge: string;
  titleId: string;
  titleEn: string;
  icon: React.ReactNode;
  summaryId: string;
  summaryEn: string;
  tipsId: string[];
  tipsEn: string[];
  color: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "focus",
    badge: "01 · Inti Permainan",
    titleId: "Sesi Fokus & Menanam Pohon",
    titleEn: "Focus Sessions & Tree Growth",
    icon: <Sprout className="w-5 h-5 text-emerald-600" />,
    color: "#187557",
    summaryId:
      "Rimba mengubah waktu fokus nyatamu menjadi pohon virtual yang tumbuh subur di pulau terapung pribadimu.",
    summaryEn:
      "Rimba transforms your real-world deep focus into thriving virtual trees on your personal floating island.",
    tipsId: [
      "Pilih durasi fokus (misalnya 25 menit) dan tentukan spesies bibit pohon yang ingin kamu tanam.",
      "Selesaikan sesi tanpa beralih aplikasi. Saat waktu habis, pohon mekar sempurna dan kamu memperoleh Koin Soul & XP.",
      "Mode Ketat (Strict Mode): Jika aktif, meninggalkan aplikasi akan memicu peringatan hitung mundur. Jika tidak kembali, pohon akan layu menjadi tunggul mati!",
    ],
    tipsEn: [
      "Choose your focus duration (e.g. 25 mins) and pick the tree species you want to nurture.",
      "Complete the session without switching apps. When the timer ends, your tree blooms and rewards you with Soul Coins & XP.",
      "Strict Mode: If enabled, leaving the app triggers a grace countdown. Failure to return causes the sapling to wither into a dead stump!",
    ],
  },
  {
    id: "expansion",
    badge: "02 · Pengembangan Pulau",
    titleId: "Koin Soul & Perluas Lahan",
    titleEn: "Soul Coins & Land Expansion",
    icon: <Maximize2 className="w-5 h-5 text-teal-600" />,
    color: "#0D9488",
    summaryId:
      "Setiap menit fokus menghasilkan Koin Soul. Gunakan Soul untuk memperluas petak tanah dan memperbesar pulaumu.",
    summaryEn:
      "Every minute of mindful focus yields Soul Coins. Use them to expand terrain tiles and enlarge your island diorama.",
    tipsId: [
      "Buka Bengkel Alam melalui tombol palu atau menu atas, lalu pilih tab 'Perluas Lahan'.",
      "Ketuk petak hijau bercahaya di tepi pulau untuk membuka lahan baru menggunakan Soul yang telah kamu kumpulkan.",
      "Pulaumu dapat diperluas hingga 100 petak penuh, membuka bioma baru seperti Suaka Salju saat mencapai Level 20.",
    ],
    tipsEn: [
      "Open the Nature Workshop via the hammer icon or header, then switch to the 'Expand Land' tab.",
      "Tap any glowing border tile around the island perimeter to unlock new land with your earned Soul coins.",
      "Your sanctuary can expand up to 100 tiles, unlocking high-altitude biomes like Snow Peaks at Level 20.",
    ],
  },
  {
    id: "rivers",
    badge: "03 · Tata Air & Jembatan",
    titleId: "Aliran Sungai & Jembatan Rimba",
    titleEn: "River Channels & Forest Bridges",
    icon: <Waves className="w-5 h-5 text-sky-600" />,
    color: "#0284C7",
    summaryId:
      "Bentuk sungai alami yang mengalir melintasi pulau, lalu pasang jembatan kayu untuk menghubungkan tepiannya.",
    summaryEn:
      "Carve sparkling waterways across your island and connect the banks with rustic wooden bridges.",
    tipsId: [
      "Pilih 'Aliran Sungai' atau 'Kelokan Sungai' di Bengkel Alam. Air akan terhubung secara otomatis membentuk sungai yang mulus tanpa rongga.",
      "Untuk menyeberangi sungai, pilih 'Jembatan Kayu Rimba' di kategori Jalan (Paths). Kamu bisa langsung memasang jembatan tepat di atas petak sungai!",
      "Aliran sungai yang terhubung akan menjadi tempat bermain satwa air seperti bebek rimba.",
    ],
    tipsEn: [
      "Select 'Aliran Sungai' or 'Kelokan Sungai' from the workshop. Water segments dynamically connect into a seamless riverbed.",
      "To cross the stream, place the 'Jembatan Kayu Rimba' from the Paths category directly over any river tile!",
      "Connected waterways attract local wildlife, such as mallards floating along the gentle current.",
    ],
  },
  {
    id: "wildlife",
    badge: "04 · Keanekaragaman Hayati",
    titleId: "Ekosistem & Satwa Suaka",
    titleEn: "Sanctuary Wildlife & Ecology",
    icon: <Compass className="w-5 h-5 text-amber-600" />,
    color: "#D97706",
    summaryId:
      "Semakin lebat pepohonan dan variasi flora yang kamu tanam, semakin banyak satwa rimba yang akan datang menghuni pulaumu.",
    summaryEn:
      "As tree density and floral diversity grow, peaceful wildlife emerges to inhabit your sanctuary.",
    tipsId: [
      "Tanam semak buah, rumpun bunga liar, dan jamur hutan untuk memperkaya ekosistem lantai rimba.",
      "Satwa seperti Rusa Rimba, Kelinci Padang, Rubah Emas, dan Burung akan berpatroli di antara pepohonan yang tenang.",
      "Satwa hanya muncul di pulau yang aktif dan terjaga kebersihannya dari ancaman polusi industri.",
    ],
    tipsEn: [
      "Plant berry bushes, wildflower clusters, and mushrooms to enrich the undergrowth.",
      "Fauna such as Meadow Deer, Forest Rabbits, Red Foxes, and Birds will roam through your serene groves.",
      "Creatures will flourish on islands that are actively maintained and protected from industrial harm.",
    ],
  },
  {
    id: "bulldozer",
    badge: "05 · Ancaman & Restorasi",
    titleId: "Ancaman Bulldozer & Reklamasi Tunggul",
    titleEn: "Bulldozer Threats & Reclamation",
    icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
    color: "#E11D48",
    summaryId:
      "Jika suaka ditinggalkan tanpa fokus berhari-hari, kru Bulldozer akan mengancam dan menyegel petak pulau.",
    summaryEn:
      "If the sanctuary is neglected for multiple days, industrial bulldozers will threaten and seal your land.",
    tipsId: [
      "Cegah Bulldozer dengan menjaga streak fokus harianmu atau manfaatkan item 'Embun Pelindung'.",
      "Jika petak terkena segel Bulldozer, selesaikan 1 sesi fokus atau restorasi tunggul mati untuk membersihkan segel.",
      "Tunggul pohon yang layu dapat dipulihkan dengan energi Soul agar lantai pulau kembali hijau berseri.",
    ],
    tipsEn: [
      "Fend off bulldozers by maintaining your daily focus streak or using Dew Shield tokens.",
      "If a tile is sealed by bulldozers, complete 1 focus session or restore withered stumps to dispel the blockade.",
      "Withered tree stumps can be reclaimed using Soul energy to return lush emerald moss to the forest floor.",
    ],
  },
  {
    id: "atmosphere",
    badge: "06 · Suasana & Ketenangan",
    titleId: "Waktu, Cuaca & Soundscape",
    titleEn: "Atmosphere, Weather & Soundscapes",
    icon: <Volume2 className="w-5 h-5 text-indigo-600" />,
    color: "#4F46E5",
    summaryId:
      "Atur atmosfer pulau sesuai suasana hatimu: Pagi yang cerah, Senja keemasan, atau Malam berbintang dengan alunan audio alam.",
    summaryEn:
      "Customize island ambiance to suit your mood: Sunny Day, Golden Sunset, or Starry Night with calming nature soundscapes.",
    tipsId: [
      "Gunakan tombol cuaca & waktu di header atas untuk berganti antara Pagi, Senja, Malam, serta Hujan dan Kabut.",
      "Nyalakan Soundscape (Hujan Rimbun, Sungai Mengalir, Angin Hutan) untuk isolasi suara maksimal saat belajar atau bekerja.",
      "Bagikan pencapaian pulau diorama 3D-mu ke teman menggunakan fitur 'Bagikan Pulau' dalam format Story 9:16 yang stylish.",
    ],
    tipsEn: [
      "Use the weather and time toggles in the header to switch between Day, Sunset, Night, Rain, and Gentle Mist.",
      "Enable Soundscapes (Lush Rain, Flowing River, Forest Breeze) for immersive ambient noise while studying or coding.",
      "Share your 3D diorama achievements with friends using 'Share Island' in sleek 9:16 Story cards.",
    ],
  },
];

export function GameplayGuideModal({ isOpen, onClose }: GameplayGuideModalProps) {
  const { language } = useTranslation();
  const [activeSectionId, setActiveSectionId] = useState<string>("focus");

  if (!isOpen) return null;

  const isEn = language === "en";
  const activeSection =
    GUIDE_SECTIONS.find((s) => s.id === activeSectionId) || GUIDE_SECTIONS[0];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-[430px] max-h-[92vh] overflow-y-auto no-scrollbar rounded-[30px] border border-white/85 bg-white/95 p-4 sm:p-5 shadow-2xl shadow-[#0E3B2D]/25 backdrop-blur-2xl animate-in zoom-in-95 duration-200 flex flex-col space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#0D3528]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#187557]/10 flex items-center justify-center text-[#187557] shrink-0 border border-[#187557]/15">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-[#0D3528]">
                {isEn ? "How to Play Rimba" : "Tata Cara Permainan"}
              </h2>
              <p className="text-[11.5px] text-[#4C7567] font-medium">
                {isEn
                  ? "Gameplay Rules & Focus Guide"
                  : "Panduan Lengkap & Strategi Suaka"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup Panduan"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Section Pills Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {GUIDE_SECTIONS.map((sec) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setActiveSectionId(sec.id);
                }}
                className={`px-3 py-1.5 rounded-full text-[11.5px] whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isActive
                    ? "bg-[#187557] border-[#187557] text-white font-semibold shadow-xs"
                    : "bg-[#0D3528]/5 hover:bg-[#0D3528]/10 border-[#0D3528]/8 text-[#4C7567] font-medium"
                }`}
              >
                <span>{sec.badge.split("·")[0].trim()}</span>
                <span>{isEn ? sec.titleEn.split("&")[0].trim() : sec.titleId.split("&")[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Active Section Card Content */}
        <div className="rounded-2xl border border-[#0D3528]/10 bg-gradient-to-b from-white to-[#F2F7F4] p-4 flex flex-col space-y-3 shadow-xs">
          {/* Badge & Title */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#187557] bg-[#187557]/10 px-2 py-0.5 rounded-full">
                {activeSection.badge}
              </span>
              <h3 className="text-[16px] font-bold text-[#0D3528] mt-1 tracking-tight">
                {isEn ? activeSection.titleEn : activeSection.titleId}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-white shadow-2xs border border-[#0D3528]/8 flex items-center justify-center shrink-0">
              {activeSection.icon}
            </div>
          </div>

          {/* Overview text */}
          <p className="text-[12.5px] text-[#2C4D3E] leading-relaxed font-medium">
            {isEn ? activeSection.summaryEn : activeSection.summaryId}
          </p>

          {/* Tips Bullet Points */}
          <div className="space-y-2 pt-1 border-t border-[#0D3528]/8">
            <span className="text-[11px] font-bold text-[#187557] tracking-tight uppercase">
              {isEn ? "Key Guidelines:" : "Langkah & Aturan Penting:"}
            </span>
            <div className="space-y-2">
              {(isEn ? activeSection.tipsEn : activeSection.tipsId).map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] text-[#345948]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#187557] shrink-0 mt-0.5 stroke-[2.2]" />
                  <span className="leading-snug">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Strategy Pro-Tip Card */}
        <div className="rounded-xl bg-[#E8F3ED] border border-[#187557]/15 p-3 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
          <p className="text-[11px] text-[#1E4D37] font-medium leading-tight">
            {isEn
              ? "Pro-tip: Consistent daily focus of 25–50 minutes yields higher survival multipliers and attracts rare wildlife to your diorama!"
              : "Tips Ahli: Fokus rutin 25–50 menit setiap hari melipatgandakan perolehan Soul dan mendatangkan satwa langka ke pulau suakamu!"}
          </p>
        </div>

        {/* Bottom Navigation & Close */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              const currentIndex = GUIDE_SECTIONS.findIndex((s) => s.id === activeSectionId);
              const nextIndex = (currentIndex + 1) % GUIDE_SECTIONS.length;
              setActiveSectionId(GUIDE_SECTIONS[nextIndex].id);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isEn ? "Next Topic" : "Topik Berikutnya"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#187557] hover:bg-[#125D44] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{isEn ? "Understood, Play!" : "Paham, Mulai Main!"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
