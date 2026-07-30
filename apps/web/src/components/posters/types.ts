import type { PosterRecipientsResponse } from "@/lib/api/reports";

export type PosterTemplateId =
  | "clean-achievers"
  | "heritage-honors"
  | "modern-khmer-excellence"
  | "angkor-laureates";
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
  { id: "square", label: "ការ៉េ ១:១ · ៣០០ DPI", width: 2160, height: 2160 },
  {
    id: "portrait",
    label: "បញ្ឈរ A4 · ៣០០ DPI",
    width: 2480,
    height: 3508,
  },
  {
    id: "landscape",
    label: "ផ្ដេក ១៦:៩ · ៣០០ DPI",
    width: 3840,
    height: 2160,
  },
];

export const POSTER_TEMPLATES: PosterTemplateDefinition[] = [
  {
    id: "clean-achievers",
    name: "សិស្សឆ្នើមស្អាតទំនើប",
    description: "ប្លង់ស្អាត សាមញ្ញ និងវិជ្ជាជីវៈ សម្រាប់គ្រប់ទម្រង់។",
    accent: "from-[#6b132b] via-[#d4af63] to-[#0f5552]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
  {
    id: "heritage-honors",
    name: "កិត្តិយសបេតិកភណ្ឌខ្មែរ",
    description: "រចនាបថខ្មែរប្រណីត សម្រាប់សិស្សឆ្នើម ៣, ៥ និង ១០ នាក់។",
    accent: "from-[#fffaf0] via-[#b88a3b] to-[#0f5b57]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
  {
    id: "modern-khmer-excellence",
    name: "ឧត្តមភាពខ្មែរទំនើប",
    description: "ផ្ទៃសស្អាត ស្ថាបត្យកម្មខ្មែរ និងស៊ុមសិស្សបែបប្រណីត។",
    accent: "from-white via-[#d8b35f] to-[#0f5b57]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
  {
    id: "angkor-laureates",
    name: "ជ័យលាភីអង្គរ",
    description: "ប្លង់អង្គរទូលាយ ជាមួយស៊ុមរង្វង់ក្រហមចាស់ និងពណ៌មាស។",
    accent: "from-white via-[#c79a43] to-[#72152d]",
    supportsGroups: true,
    supportedRatios: ["portrait", "square", "landscape"],
  },
];
