import type { PosterRecipientsResponse } from "@/lib/api/reports";

export type PosterTemplateId = "clean-achievers";
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
  { id: "square", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "landscape", label: "Landscape 16:9", width: 1920, height: 1080 },
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
];
