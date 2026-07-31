import type { PosterRecipientsResponse } from "@/lib/api/reports";

export type CertificateTemplateId =
  | "clean-achievers"
  | "heritage-honors"
  | "modern-khmer-excellence"
  | "angkor-laureates";

export type CertificateRatioId = "portrait" | "landscape";

export interface CertificateRatioPreset {
  id: CertificateRatioId;
  label: string;
  width: number;
  height: number;
}

export interface CertificateTemplateDefinition {
  id: CertificateTemplateId;
  name: string;
  description: string;
  accent: string;
  supportedRatios: CertificateRatioId[];
}

export interface CertificateContentSettings {
  title: string;
  subtitle: string;
  principalName: string;
  teacherName: string;
  issueDate: string;
  showStudentId: boolean;
  showScores: boolean;
  showRanks: boolean;
}

export interface CertificateCanvasProps {
  data: PosterRecipientsResponse | null;
  template: CertificateTemplateId;
  width: number;
  height: number;
  content: CertificateContentSettings;
  placeholderSchoolName: string;
  academicYearLabel: string;
}

export const CERTIFICATE_RATIOS: CertificateRatioPreset[] = [
  {
    id: "landscape",
    label: "ផ្ដេក A4 · ៣០០ DPI",
    width: 3508,
    height: 2480,
  },
  {
    id: "portrait",
    label: "បញ្ឈរ A4 · ៣០០ DPI",
    width: 2480,
    height: 3508,
  }
];

export const CERTIFICATE_TEMPLATES: CertificateTemplateDefinition[] = [
  {
    id: "clean-achievers",
    name: "សិស្សឆ្នើមស្អាតទំនើប",
    description: "ប្លង់ស្អាត សាមញ្ញ និងវិជ្ជាជីវៈ។",
    accent: "from-[#6b132b] via-[#d4af63] to-[#0f5552]",
    supportedRatios: ["landscape", "portrait"],
  },
  {
    id: "heritage-honors",
    name: "កិត្តិយសបេតិកភណ្ឌខ្មែរ",
    description: "រចនាបថខ្មែរប្រណីតជាមួយក្បាច់។",
    accent: "from-[#fffaf0] via-[#b88a3b] to-[#0f5b57]",
    supportedRatios: ["landscape", "portrait"],
  },
  {
    id: "modern-khmer-excellence",
    name: "ឧត្តមភាពខ្មែរទំនើប",
    description: "ផ្ទៃសស្អាត ស្ថាបត្យកម្មខ្មែរ។",
    accent: "from-white via-[#d8b35f] to-[#0f5b57]",
    supportedRatios: ["landscape", "portrait"],
  },
  {
    id: "angkor-laureates",
    name: "ជ័យលាភីអង្គរ",
    description: "ប្លង់អង្គរទូលាយ ជាមួយពណ៌មាស។",
    accent: "from-white via-[#c79a43] to-[#72152d]",
    supportedRatios: ["landscape", "portrait"],
  },
];
