import type { PosterRecipientsResponse } from "@/lib/api/reports";

export type PosterTemplateId =
  | "clean-achievers"
  | "heritage-honors"
  | "modern-khmer-excellence";
export type PosterRatioId = "square" | "portrait" | "landscape";

export interface PosterRatioPreset {
  id: PosterRatioId;
  label: string;
  width: number;
  height: number;
}

export interface PosterTemplateDefinition {
  id: PosterTemplateId;
  name: string;
  description: string;
  accent: string;
  supportsGroups: boolean;
  supportedRatios: PosterRatioId[];
}

export interface PosterContentSettings {
  title: string;
  subtitle: string;
  showScores: boolean;
  showRanks: boolean;
  showClassNames: boolean;
}

export interface PosterCanvasProps {
  data: PosterRecipientsResponse | null;
  template: PosterTemplateId;
  width: number;
  height: number;
  content: PosterContentSettings;
  placeholderSchoolName: string;
  academicYearLabel: string;
}

export const POSTER_RATIOS: PosterRatioPreset[] = [
  { id: "square", label: "Square 1:1 · 300 DPI", width: 2160, height: 2160 },
  {
    id: "portrait",
    label: "Portrait A4 · 300 DPI",
    width: 2480,
    height: 3508,
  },
  {
    id: "landscape",
    label: "Landscape 16:9 · 300 DPI",
    width: 3840,
    height: 2160,
  },
];

export const POSTER_TEMPLATES: PosterTemplateDefinition[] = [
  {
    id: "clean-achievers",
    name: "Clean Achievers",
    description:
      "Clean professional layouts for portrait, square and landscape.",
    accent: "from-[#6b132b] via-[#d4af63] to-[#0f5552]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
  {
    id: "heritage-honors",
    name: "Heritage Honors · Collection 2",
    description:
      "Premium Khmer heritage layouts with generated print-ready assets for Top 3, 5 and 10.",
    accent: "from-[#fffaf0] via-[#b88a3b] to-[#0f5b57]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
  {
    id: "modern-khmer-excellence",
    name: "Modern Khmer Excellence",
    description:
      "Pure-white Khmer architectural layouts with minimal premium student frames.",
    accent: "from-white via-[#d8b35f] to-[#0f5b57]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
];
