"use client";

import React from "react";
import type { PosterRecipient, ReportPeriodType } from "@/lib/api/reports";
import type { PosterCanvasProps, PosterRatioId } from "./types";

const ASSET_ROOT = "/poster-templates/angkor-laureates";
const BACKGROUNDS: Record<PosterRatioId, string> = {
  square: `${ASSET_ROOT}/background-square.png`,
  landscape: `${ASSET_ROOT}/background-landscape.png`,
  portrait: `${ASSET_ROOT}/background-portrait-a4.png`,
};
const CIRCULAR_FRAME = `${ASSET_ROOT}/student-frame-circular.png`;

const EDUCATION_DEPARTMENT = "មន្ទីរអប់រំយុវជន និងកីឡា";
const EDUCATION_PROVINCE = "ខេត្ត សៀមរាប";

type Slot = { x: number; y: number; width: number };
type Layout = {
  width: number;
  height: number;
  mottoY: [number, number, number];
  institutionX: number;
  institutionY: number;
  institutionGap: number;
  institutionSize: number;
  titleY: number;
  subtitleY: number;
  yearY: number;
  dividerY: number;
};

const LAYOUTS: Record<PosterRatioId, Layout> = {
  square: {
    width: 1080,
    height: 1080,
    mottoY: [35, 69, 106],
    institutionX: 78,
    institutionY: 157,
    institutionGap: 32,
    institutionSize: 13,
    titleY: 220,
    subtitleY: 261,
    yearY: 293,
    dividerY: 320,
  },
  landscape: {
    width: 1920,
    height: 1080,
    mottoY: [34, 68, 105],
    institutionX: 86,
    institutionY: 150,
    institutionGap: 34,
    institutionSize: 15,
    titleY: 190,
    subtitleY: 235,
    yearY: 269,
    dividerY: 300,
  },
  portrait: {
    width: 1240,
    height: 1754,
    mottoY: [44, 89, 138],
    institutionX: 90,
    institutionY: 190,
    institutionGap: 43,
    institutionSize: 18,
    titleY: 326,
    subtitleY: 378,
    yearY: 420,
    dividerY: 452,
  },
};

function toKhmerNumerals(value: string | number) {
  const digits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
}

function formatKhmerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Phnom_Penh",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  const months = [
    "",
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];
  return `ថ្ងៃទី ${toKhmerNumerals(part("day"))} ខែ ${months[Number(part("month"))] || part("month")} ឆ្នាំ ${toKhmerNumerals(part("year"))}`;
}

function truncate(value: string, limit: number) {
  const characters = Array.from(value);
  return characters.length > limit
    ? `${characters.slice(0, limit - 1).join("")}…`
    : value;
}

function displayName(recipient: PosterRecipient) {
  return recipient.khmerName || recipient.name;
}

function initials(recipient: PosterRecipient) {
  return displayName(recipient)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function classLabel(recipient: PosterRecipient) {
  const value = recipient.className
    .trim()
    .replace(/^ថ្នាក់ទី\s*/u, "")
    .replace(/^ថ្នាក់\s*/u, "");
  return `ថ្នាក់ ${toKhmerNumerals(value || recipient.grade)}`;
}

function periodLabel(type: ReportPeriodType, label: string) {
  if (type === "month") return `ប្រចាំខែ ${label}`;
  if (type === "semester")
    return label.startsWith("ឆមាស") ? `ប្រចាំ${label}` : `ប្រចាំឆមាស ${label}`;
  return "ប្រចាំឆ្នាំ";
}

function centeredRow(
  canvasWidth: number,
  count: number,
  width: number,
  gap: number,
  y: number,
) {
  const totalWidth = count * width + Math.max(0, count - 1) * gap;
  const startX = (canvasWidth - totalWidth) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * (width + gap),
    y,
    width,
  }));
}

function splitRows(
  canvasWidth: number,
  total: number,
  firstCount: number,
  width: number,
  gap: number,
  firstY: number,
  secondY: number,
) {
  return [
    ...centeredRow(canvasWidth, firstCount, width, gap, firstY),
    ...centeredRow(canvasWidth, total - firstCount, width, gap, secondY),
  ];
}

function slotsFor(ratio: PosterRatioId, total: number): Slot[] {
  if (ratio === "landscape") {
    if (total <= 5) {
      const width = total <= 3 ? 285 : 245;
      return centeredRow(1920, Math.max(1, total), width, 58, 370);
    }
    const firstCount = Math.ceil(total / 2);
    return splitRows(1920, total, firstCount, 205, 46, 335, 650);
  }

  if (ratio === "square") {
    if (total <= 3) {
      return centeredRow(
        1080,
        Math.max(1, total),
        total === 1 ? 330 : total === 2 ? 290 : 250,
        58,
        430,
      );
    }
    if (total <= 5) {
      return splitRows(1080, total, Math.ceil(total / 2), 220, 62, 340, 615);
    }
    return splitRows(1080, total, Math.ceil(total / 2), 170, 30, 420, 665);
  }

  if (total <= 3) {
    if (total === 1) return centeredRow(1240, 1, 390, 0, 520);
    return splitRows(1240, total, 1, 320, 70, 500, 890);
  }
  if (total <= 5) {
    if (total === 5) {
      return [
        ...centeredRow(1240, 1, 350, 0, 450),
        ...centeredRow(1240, 2, 320, 280, 760),
        ...centeredRow(1240, 2, 320, 280, 1055),
      ];
    }
    if (total === 4) {
      return [
        ...centeredRow(1240, 1, 330, 0, 475),
        ...centeredRow(1240, 3, 285, 70, 880),
      ];
    }
    return [
      ...centeredRow(1240, 1, 330, 0, 470),
      ...centeredRow(1240, Math.min(2, total - 1), 290, 300, 755),
      ...centeredRow(1240, Math.max(0, total - 3), 290, 300, 1045),
    ];
  }
  if (total === 10) {
    return [
      ...centeredRow(1240, 1, 300, 0, 420),
      ...centeredRow(1240, 3, 245, 65, 700),
      ...centeredRow(1240, 3, 245, 65, 920),
      ...centeredRow(1240, 3, 245, 65, 1135),
    ];
  }
  return splitRows(
    1240,
    total,
    Math.ceil(total / 2),
    total >= 9 ? 200 : 240,
    total >= 9 ? 35 : 45,
    total >= 9 ? 570 : 545,
    total >= 9 ? 900 : 900,
  );
}

function Header({
  ratio,
  data,
  content,
  schoolName,
  academicYearLabel,
}: {
  ratio: PosterRatioId;
  data: PosterCanvasProps["data"];
  content: PosterCanvasProps["content"];
  schoolName: string;
  academicYearLabel: string;
}) {
  const layout = LAYOUTS[ratio];
  const centerX = layout.width / 2;
  const label =
    content.subtitle || data?.period.khmerLabel || data?.period.label || "";
  const subtitle = data ? periodLabel(data.period.type, label) : label;
  const titleSize = ratio === "portrait" ? 50 : ratio === "landscape" ? 43 : 38;

  return (
    <g data-poster-header="true">
      <text
        x={centerX}
        y={layout.mottoY[0]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 22 : 18}
        fill="#72152d"
      >
        ព្រះរាជាណាចក្រកម្ពុជា
      </text>
      <text
        x={centerX}
        y={layout.mottoY[1]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 21 : 17}
        fill="#72152d"
      >
        ជាតិ សាសនា ព្រះមហាក្សត្រ
      </text>
      <text
        x={centerX}
        y={layout.mottoY[2]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Tacteng, Tacteing, serif"
        fontSize={ratio === "portrait" ? 38 : 31}
        fill="#b98d35"
      >
        3
      </text>

      {[EDUCATION_DEPARTMENT, EDUCATION_PROVINCE, schoolName].map(
        (value, index) => (
          <text
            key={`${value}-${index}`}
            x={layout.institutionX}
            y={layout.institutionY + index * layout.institutionGap}
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={layout.institutionSize}
            fill="#72152d"
          >
            {truncate(value, ratio === "landscape" ? 54 : 42)}
          </text>
        ),
      )}

      <text
        x={centerX}
        y={layout.titleY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={titleSize}
        fill="#72152d"
      >
        {truncate(content.title, ratio === "landscape" ? 64 : 44)}
      </text>
      <text
        x={centerX}
        y={layout.subtitleY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 22 : 18}
        fill="#0f625f"
      >
        {truncate(subtitle, 48)}
      </text>
      <text
        x={centerX}
        y={layout.yearY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 18 : 14}
        fill="#8a642b"
      >
        ឆ្នាំសិក្សា៖ {academicYearLabel || "—"}
      </text>
      <rect
        x={ratio === "landscape" ? 235 : 110}
        y={layout.dividerY}
        width={layout.width - (ratio === "landscape" ? 470 : 220)}
        height="2"
        fill="url(#angkor-laureates-rule)"
      />
    </g>
  );
}

function CircularStudent({
  recipient,
  slot,
  index,
  content,
}: {
  recipient: PosterRecipient;
  slot: Slot;
  index: number;
  content: PosterCanvasProps["content"];
}) {
  const clipId = `angkor-laureates-photo-${index}`;
  const frameHeight = slot.width * 1.5;
  const photoCenterX = slot.x + slot.width * 0.5;
  const photoCenterY = slot.y + slot.width * 0.5;
  const photoRadius = slot.width * 0.255;
  const name = truncate(displayName(recipient), 20);
  const nameSize = Math.max(
    9,
    Math.min(17, slot.width * (Array.from(name).length > 15 ? 0.046 : 0.057)),
  );
  const infoSize = Math.max(8, Math.min(14, slot.width * 0.046));

  return (
    <g
      data-student-card={recipient.studentId}
      data-card-layout="angkor-circular"
      filter="url(#angkor-laureates-card-shadow)"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={photoCenterX} cy={photoCenterY} r={photoRadius} />
        </clipPath>
      </defs>
      {recipient.photoUrl ? (
        <image
          href={recipient.photoUrl}
          x={photoCenterX - photoRadius}
          y={photoCenterY - photoRadius}
          width={photoRadius * 2}
          height={photoRadius * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={photoCenterX - photoRadius}
            y={photoCenterY - photoRadius}
            width={photoRadius * 2}
            height={photoRadius * 2}
            fill="#f4eee4"
          />
          <circle
            cx={photoCenterX}
            cy={photoCenterY - photoRadius * 0.15}
            r={photoRadius * 0.26}
            fill="#ead5ad"
          />
          <path
            d={`M${photoCenterX - photoRadius * 0.62} ${photoCenterY + photoRadius}c8-${photoRadius * 0.58} ${photoRadius * 1.16}-${photoRadius * 0.58} ${photoRadius * 1.24} 0z`}
            fill="#ead5ad"
          />
          <text
            x={photoCenterX}
            y={photoCenterY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={slot.width * 0.11}
            fill="#72152d"
          >
            {initials(recipient) || "ស"}
          </text>
        </g>
      )}
      <image
        href={CIRCULAR_FRAME}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={frameHeight}
        preserveAspectRatio="none"
      />
      {content.showRanks && (
        <text
          x={slot.x + slot.width * 0.2}
          y={slot.y + slot.width * 0.89}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize={slot.width * 0.07}
          fill="#72152d"
        >
          {toKhmerNumerals(recipient.rank)}
        </text>
      )}
      <text
        x={slot.x + slot.width * 0.56}
        y={slot.y + slot.width * 0.89}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={nameSize}
        fill="#72152d"
      >
        {name}
      </text>
      {content.showClassNames && (
        <text
          x={slot.x + slot.width * 0.36}
          y={slot.y + slot.width * 1.005}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#0f625f"
        >
          {truncate(classLabel(recipient), 12)}
        </text>
      )}
      {content.showScores && (
        <text
          x={slot.x + slot.width * 0.67}
          y={slot.y + slot.width * 1.005}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#7c5723"
        >
          {recipient.average}
        </text>
      )}
    </g>
  );
}

function Footer({
  ratio,
  data,
}: {
  ratio: PosterRatioId;
  data: PosterCanvasProps["data"];
}) {
  const layout = LAYOUTS[ratio];
  const lineY = layout.height - (ratio === "portrait" ? 92 : 66);
  const textY = layout.height - (ratio === "portrait" ? 52 : 35);
  const side = ratio === "landscape" ? 66 : 52;

  if (ratio === "portrait") {
    const date = data?.generatedAt ? formatKhmerDate(data.generatedAt) : "—";
    const teacherName = data?.homeroomTeacher?.name || "________________";
    return (
      <g data-poster-footer="true" data-footer-layout="approval-signatures">
        <rect
          x="115"
          y="1402"
          width="1010"
          height="1.5"
          fill="#b98d35"
          opacity=".62"
        />
        <g textAnchor="middle" fill="#72152d">
          <text
            x="325"
            y="1452"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="18"
          >
            បានឃើញ និងឯកភាព
          </text>
          <text
            x="325"
            y="1492"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="18"
          >
            នាយកសាលា
          </text>
          <text
            x="915"
            y="1448"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="16"
          >
            កាលបរិច្ឆេទ៖ {date}
          </text>
          <text
            x="915"
            y="1490"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="18"
          >
            គ្រូប្រចាំថ្នាក់
          </text>
          <text
            x="915"
            y="1610"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="17"
          >
            {truncate(teacherName, 32)}
          </text>
        </g>
        <rect
          x={side}
          y={lineY}
          width={layout.width - side * 2}
          height="1.5"
          fill="#b98d35"
          opacity=".7"
        />
        <circle cx={side + 10} cy={textY} r="10" fill="#72152d" />
        <text
          x={side + 29}
          y={textY}
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="13"
          letterSpacing="2.5"
          fill="#72152d"
        >
          STUNITY
        </text>
        <text
          x={layout.width - side}
          y={textY}
          textAnchor="end"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#545c59"
        >
          {truncate(
            [data?.school.phone, data?.school.address]
              .filter(Boolean)
              .join(" • "),
            52,
          )}
        </text>
      </g>
    );
  }

  if (ratio === "square") {
    const date = data?.generatedAt ? formatKhmerDate(data.generatedAt) : "—";
    const teacherName = data?.homeroomTeacher?.name || "________________";
    return (
      <g data-poster-footer="true" data-footer-layout="approval-signatures">
        <rect
          x="90"
          y="958"
          width="900"
          height="1.5"
          fill="#b98d35"
          opacity=".62"
        />
        <rect
          x="112"
          y="966"
          width="335"
          height="62"
          rx="12"
          fill="#fffdf8"
          fillOpacity=".9"
          stroke="#b98d35"
          strokeWidth="1.5"
          strokeOpacity=".68"
        />
        <rect
          x="633"
          y="966"
          width="335"
          height="62"
          rx="12"
          fill="#fffdf8"
          fillOpacity=".9"
          stroke="#b98d35"
          strokeWidth="1.5"
          strokeOpacity=".68"
        />
        <g textAnchor="middle" fill="#72152d">
          <text
            x="279.5"
            y="984"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="13"
          >
            បានឃើញ និងឯកភាព
          </text>
          <text
            x="279.5"
            y="1011"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="14"
          >
            នាយកសាលា
          </text>
          <text
            x="800.5"
            y="977"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="9"
          >
            កាលបរិច្ឆេទ៖ {date}
          </text>
          <text
            x="800.5"
            y="997"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="12"
          >
            គ្រូប្រចាំថ្នាក់
          </text>
          <text
            x="800.5"
            y="1018"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="10"
          >
            {truncate(teacherName, 28)}
          </text>
        </g>
        <rect
          x={side}
          y="1039"
          width={layout.width - side * 2}
          height="1.5"
          fill="#b98d35"
          opacity=".7"
        />
        <circle cx={side + 10} cy="1060" r="10" fill="#72152d" />
        <text
          x={side + 29}
          y="1060"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="13"
          letterSpacing="2.5"
          fill="#72152d"
        >
          STUNITY
        </text>
        <text
          x={layout.width - side}
          y="1060"
          textAnchor="end"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="#545c59"
        >
          {truncate(
            [data?.school.phone, data?.school.address]
              .filter(Boolean)
              .join(" • "),
            52,
          )}
        </text>
      </g>
    );
  }

  return (
    <g data-poster-footer="true">
      <rect
        x={side}
        y={lineY}
        width={layout.width - side * 2}
        height="1.5"
        fill="#b98d35"
        opacity=".7"
      />
      <circle cx={side + 10} cy={textY} r="10" fill="#72152d" />
      <text
        x={side + 29}
        y={textY}
        dominantBaseline="central"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="13"
        letterSpacing="2.5"
        fill="#72152d"
      >
        STUNITY
      </text>
      <text
        x={layout.width - side}
        y={textY}
        textAnchor="end"
        dominantBaseline="central"
        fontFamily="Battambang, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#545c59"
      >
        {truncate(
          [data?.school.phone, data?.school.address]
            .filter(Boolean)
            .join(" • "),
          ratio === "landscape" ? 90 : 52,
        )}
      </text>
    </g>
  );
}

export default function AngkorLaureatesCanvas(props: PosterCanvasProps) {
  const {
    data,
    width,
    height,
    content,
    placeholderSchoolName,
    academicYearLabel,
  } = props;
  const ratio: PosterRatioId =
    width === height ? "square" : width > height ? "landscape" : "portrait";
  const layout = LAYOUTS[ratio];
  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visible = recipients.slice(0, 10);
  const slots = slotsFor(ratio, visible.length);
  const schoolName = data?.school.name || placeholderSchoolName;

  return (
    <svg
      data-poster-svg="true"
      data-poster-template="angkor-laureates"
      data-poster-ratio={ratio}
      data-logical-width={layout.width}
      data-logical-height={layout.height}
      width={width}
      height={height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${content.title} — ${schoolName}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <filter
          id="angkor-laureates-card-shadow"
          x="-25%"
          y="-25%"
          width="150%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor="#48101f"
            floodOpacity=".13"
          />
        </filter>
        <linearGradient id="angkor-laureates-rule" x1="0" x2="1">
          <stop offset="0" stopColor="#b98d35" stopOpacity="0" />
          <stop offset=".22" stopColor="#c8a451" />
          <stop offset=".47" stopColor="#72152d" />
          <stop offset=".53" stopColor="#0f625f" />
          <stop offset=".78" stopColor="#c8a451" />
          <stop offset="1" stopColor="#b98d35" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={layout.width} height={layout.height} fill="#ffffff" />
      <image
        href={BACKGROUNDS[ratio]}
        x="0"
        y="0"
        width={layout.width}
        height={layout.height}
        preserveAspectRatio="none"
      />
      <Header
        ratio={ratio}
        data={data}
        content={content}
        schoolName={schoolName}
        academicYearLabel={academicYearLabel}
      />
      {visible.length > 0 ? (
        <g data-poster-students="true">
          {visible.map((recipient, index) => (
            <CircularStudent
              key={`${recipient.classId}-${recipient.studentId}`}
              recipient={recipient}
              slot={slots[index]}
              index={index}
              content={content}
            />
          ))}
        </g>
      ) : (
        <text
          x={layout.width / 2}
          y={layout.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize={ratio === "portrait" ? 24 : 21}
          fill="#72152d"
        >
          សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
        </text>
      )}
      <Footer ratio={ratio} data={data} />
    </svg>
  );
}
