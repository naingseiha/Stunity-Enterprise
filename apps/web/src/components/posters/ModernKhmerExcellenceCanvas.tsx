"use client";

import React from "react";
import type { PosterRecipient, ReportPeriodType } from "@/lib/api/reports";
import type { PosterCanvasProps, PosterRatioId } from "./types";

const ASSET_ROOT = "/poster-templates/modern-khmer-excellence";
const BACKGROUNDS: Record<PosterRatioId, string> = {
  square: `${ASSET_ROOT}/background-square.png`,
  landscape: `${ASSET_ROOT}/background-landscape.png`,
  portrait: `${ASSET_ROOT}/background-portrait-a4.png`,
};
const STUDENT_FRAME = `${ASSET_ROOT}/student-frame.png`;
const STUDENT_FRAME_A4 = `${ASSET_ROOT}/student-frame-a4.png`;
const STANDARD_FRAME_ASPECT_RATIO = 2400 / 2000;
const A4_FRAME_ASPECT_RATIO = 2200 / 1600;

const EDUCATION_DEPARTMENT = "មន្ទីរអប់រំយុវជន និងកីឡា";
const EDUCATION_PROVINCE = "ខេត្ត សៀមរាប";
const OFFICIAL_SVAYTHOM_NAME = "វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ";

type StudentSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HeaderLayout = {
  width: number;
  height: number;
  logoX: number;
  logoY: number;
  logoRadius: number;
  schoolTextX: number;
  schoolLineY: number;
  schoolLineGap: number;
  schoolFontSize: number;
  schoolNameLimit: number;
  mottoY: [number, number, number];
  titleY: number;
  subtitleY: number;
  academicYearY: number;
  dividerY: number;
  titleFontSize: number;
};

const HEADER_LAYOUTS: Record<PosterRatioId, HeaderLayout> = {
  square: {
    width: 1080,
    height: 1080,
    logoX: 70,
    logoY: 188,
    logoRadius: 31,
    schoolTextX: 116,
    schoolLineY: 157,
    schoolLineGap: 32,
    schoolFontSize: 13,
    schoolNameLimit: 38,
    mottoY: [34, 66, 102],
    titleY: 274,
    subtitleY: 315,
    academicYearY: 346,
    dividerY: 371,
    titleFontSize: 36,
  },
  landscape: {
    width: 1920,
    height: 1080,
    logoX: 72,
    logoY: 190,
    logoRadius: 32,
    schoolTextX: 121,
    schoolLineY: 158,
    schoolLineGap: 34,
    schoolFontSize: 14,
    schoolNameLimit: 48,
    mottoY: [32, 65, 101],
    titleY: 188,
    subtitleY: 231,
    academicYearY: 263,
    dividerY: 292,
    titleFontSize: 42,
  },
  portrait: {
    width: 1240,
    height: 1754,
    logoX: 88,
    logoY: 222,
    logoRadius: 40,
    schoolTextX: 148,
    schoolLineY: 178,
    schoolLineGap: 43,
    schoolFontSize: 18,
    schoolNameLimit: 42,
    mottoY: [44, 88, 137],
    titleY: 320,
    subtitleY: 370,
    academicYearY: 410,
    dividerY: 442,
    titleFontSize: 50,
  },
};

function displayName(recipient: PosterRecipient) {
  return recipient.khmerName || recipient.name;
}

function initials(recipient: PosterRecipient) {
  return displayName(recipient)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function truncateLabel(value: string, maxCharacters: number) {
  const characters = Array.from(value);
  return characters.length > maxCharacters
    ? `${characters.slice(0, maxCharacters - 1).join("")}…`
    : value;
}

function toKhmerNumerals(value: string | number) {
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(value).replace(/\d/g, (digit) => khmerDigits[Number(digit)]);
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
  const khmerMonths = [
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
  const month = khmerMonths[Number(part("month"))] || part("month");
  return `ថ្ងៃទី ${toKhmerNumerals(part("day"))} ខែ ${month} ឆ្នាំ ${toKhmerNumerals(part("year"))}`;
}

function compactClassLabel(recipient: PosterRecipient) {
  const compactName = recipient.className
    .trim()
    .replace(/^ថ្នាក់ទី\s*/u, "")
    .replace(/^ថ្នាក់\s*/u, "");
  return `ថ្នាក់ ${toKhmerNumerals(compactName || recipient.grade)}`;
}

function schoolInitials(schoolName: string) {
  return schoolName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function officialSchoolName(schoolName: string) {
  const normalizedName = schoolName.toLowerCase().replace(/\s+/g, "");
  return normalizedName.includes("svaythom") ||
    normalizedName.includes("ស្វាយធំ")
    ? OFFICIAL_SVAYTHOM_NAME
    : schoolName;
}

function officialPeriodLabel(
  periodType: ReportPeriodType,
  periodLabel: string,
) {
  if (periodType === "month") return `ប្រចាំខែ ${periodLabel}`;
  if (periodType === "semester") {
    return periodLabel.startsWith("ឆមាស")
      ? `ប្រចាំ${periodLabel}`
      : `ប្រចាំឆមាស ${periodLabel}`;
  }
  return "ប្រចាំឆ្នាំ";
}

function centeredRow(
  canvasWidth: number,
  count: number,
  cardWidth: number,
  gap: number,
  y: number,
  aspectRatio: number,
) {
  const cardHeight = cardWidth * aspectRatio;
  const rowWidth = count * cardWidth + Math.max(0, count - 1) * gap;
  const startX = (canvasWidth - rowWidth) / 2;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * (cardWidth + gap),
    y,
    width: cardWidth,
    height: cardHeight,
  }));
}

function splitRows(
  canvasWidth: number,
  total: number,
  firstRowCount: number,
  cardWidth: number,
  gap: number,
  firstY: number,
  secondY: number,
  aspectRatio: number,
) {
  return [
    ...centeredRow(
      canvasWidth,
      firstRowCount,
      cardWidth,
      gap,
      firstY,
      aspectRatio,
    ),
    ...centeredRow(
      canvasWidth,
      total - firstRowCount,
      cardWidth,
      gap,
      secondY,
      aspectRatio,
    ),
  ];
}

function getSquareSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    const cardWidth = total === 1 ? 285 : total === 2 ? 255 : 235;
    return centeredRow(
      1080,
      Math.max(1, total),
      cardWidth,
      55,
      420,
      STANDARD_FRAME_ASPECT_RATIO,
    );
  }
  if (total <= 5) {
    const firstRowCount = Math.ceil(total / 2);
    return splitRows(
      1080,
      total,
      firstRowCount,
      210,
      52,
      385,
      657,
      STANDARD_FRAME_ASPECT_RATIO,
    );
  }
  return splitRows(
    1080,
    total,
    Math.min(5, total),
    164,
    22,
    395,
    615,
    STANDARD_FRAME_ASPECT_RATIO,
  );
}

function getLandscapeSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    const cardWidth = total === 1 ? 390 : total === 2 ? 360 : 335;
    return centeredRow(
      1920,
      Math.max(1, total),
      cardWidth,
      90,
      390,
      STANDARD_FRAME_ASPECT_RATIO,
    );
  }
  if (total <= 5) {
    return centeredRow(1920, total, 270, 56, 418, STANDARD_FRAME_ASPECT_RATIO);
  }
  return splitRows(
    1920,
    total,
    Math.min(5, total),
    230,
    40,
    342,
    645,
    STANDARD_FRAME_ASPECT_RATIO,
  );
}

function getPortraitSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    if (total === 1) {
      return centeredRow(1240, 1, 390, 0, 435, A4_FRAME_ASPECT_RATIO);
    }
    return [
      ...centeredRow(1240, 1, 330, 0, 425, A4_FRAME_ASPECT_RATIO),
      ...centeredRow(1240, total - 1, 310, 62, 892, A4_FRAME_ASPECT_RATIO),
    ];
  }
  if (total <= 5) {
    const firstRowCount = Math.ceil(total / 2);
    return splitRows(
      1240,
      total,
      firstRowCount,
      300,
      45,
      475,
      905,
      A4_FRAME_ASPECT_RATIO,
    );
  }

  const isDenseTopTen = total >= 9;
  const firstRowCount = Math.ceil(total / 2);
  const cardWidth = isDenseTopTen ? 190 : 220;
  const horizontalGap = isDenseTopTen ? 42 : 50;
  const firstY = isDenseTopTen ? 636 : 590;
  const secondY = isDenseTopTen ? 947 : 953;

  return splitRows(
    1240,
    total,
    firstRowCount,
    cardWidth,
    horizontalGap,
    firstY,
    secondY,
    A4_FRAME_ASPECT_RATIO,
  );
}

function getSlots(ratio: PosterRatioId, total: number) {
  if (ratio === "square") return getSquareSlots(total);
  if (ratio === "landscape") return getLandscapeSlots(total);
  return getPortraitSlots(total);
}

function ModernHeader({
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
  const layout = HEADER_LAYOUTS[ratio];
  const centerX = layout.width / 2;
  const officialName = officialSchoolName(schoolName);
  const logoClipId = `modern-khmer-excellence-${ratio}-school-logo`;
  const periodLabel =
    content.subtitle || data?.period.khmerLabel || data?.period.label || "";
  const honorRollPeriod = data
    ? officialPeriodLabel(data.period.type, periodLabel)
    : periodLabel;
  const titleSize =
    Array.from(content.title).length > 25
      ? layout.titleFontSize * 0.82
      : layout.titleFontSize;

  return (
    <g data-poster-header="true">
      <defs>
        <clipPath id={logoClipId}>
          <circle
            cx={layout.logoX}
            cy={layout.logoY}
            r={layout.logoRadius - 4}
          />
        </clipPath>
      </defs>

      <text
        x={centerX}
        y={layout.mottoY[0]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 22 : ratio === "landscape" ? 18 : 17}
        fill="#68162d"
      >
        ព្រះរាជាណាចក្រកម្ពុជា
      </text>
      <text
        x={centerX}
        y={layout.mottoY[1]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={ratio === "portrait" ? 21 : ratio === "landscape" ? 17 : 16}
        fill="#68162d"
      >
        ជាតិ សាសនា ព្រះមហាក្សត្រ
      </text>
      <text
        x={centerX}
        y={layout.mottoY[2]}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Tacteng, Tacteing, serif"
        fontSize={ratio === "portrait" ? 38 : 30}
        fill="#b58a37"
      >
        3
      </text>

      <circle
        cx={layout.logoX}
        cy={layout.logoY}
        r={layout.logoRadius}
        fill="#ffffff"
        stroke="#c59b48"
        strokeWidth="2"
        filter="url(#modern-khmer-excellence-soft-shadow)"
      />
      {data?.school.logo ? (
        <image
          href={data.school.logo}
          x={layout.logoX - layout.logoRadius + 4}
          y={layout.logoY - layout.logoRadius + 4}
          width={(layout.logoRadius - 4) * 2}
          height={(layout.logoRadius - 4) * 2}
          preserveAspectRatio="xMidYMid contain"
          clipPath={`url(#${logoClipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <text
          x={layout.logoX}
          y={layout.logoY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize={layout.logoRadius * 0.64}
          fontWeight="700"
          fill="#68162d"
        >
          {schoolInitials(schoolName) || "S"}
        </text>
      )}

      {[EDUCATION_DEPARTMENT, EDUCATION_PROVINCE, officialName].map(
        (label, index) => (
          <text
            key={label}
            x={layout.schoolTextX}
            y={layout.schoolLineY + index * layout.schoolLineGap}
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={layout.schoolFontSize}
            fill="#68162d"
          >
            {truncateLabel(label, layout.schoolNameLimit)}
          </text>
        ),
      )}

      <text
        x={centerX}
        y={layout.titleY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, Koulen, serif"
        fontSize={titleSize}
        fill="#68162d"
      >
        {truncateLabel(content.title, ratio === "landscape" ? 64 : 46)}
      </text>
      <text
        x={centerX}
        y={layout.subtitleY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, Battambang, serif"
        fontSize={ratio === "portrait" ? 22 : ratio === "landscape" ? 20 : 18}
        fill="#0f5b57"
      >
        {truncateLabel(honorRollPeriod, ratio === "landscape" ? 60 : 44)}
      </text>
      <text
        x={centerX}
        y={layout.academicYearY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, Battambang, serif"
        fontSize={ratio === "portrait" ? 18 : ratio === "landscape" ? 15 : 14}
        fill="#80602c"
      >
        ឆ្នាំសិក្សា៖ {academicYearLabel || "—"}
      </text>
      <rect
        x={ratio === "landscape" ? 250 : 125}
        y={layout.dividerY}
        width={layout.width - (ratio === "landscape" ? 500 : 250)}
        height="2"
        rx="1"
        fill="url(#modern-khmer-excellence-title-rule)"
      />
    </g>
  );
}

function StandardStudentCard({
  recipient,
  slot,
  index,
  content,
}: {
  recipient: PosterRecipient;
  slot: StudentSlot;
  index: number;
  content: PosterCanvasProps["content"];
}) {
  const clipId = `modern-khmer-excellence-standard-photo-${index}`;
  const studentName = truncateLabel(displayName(recipient), 22);
  const photoX = slot.x + slot.width * 0.18;
  const photoY = slot.y + slot.height * 0.072;
  const photoWidth = slot.width * 0.64;
  const photoHeight = slot.height * 0.665;
  const photoBottom = photoY + photoHeight;
  const photoArcY = photoY + photoWidth / 2;
  const rankX = slot.x + slot.width * 0.238;
  const rankY = slot.y + slot.height * 0.835;
  const rankRadius = slot.width * 0.066;
  const nameX = slot.x + slot.width * 0.55;
  const nameY = slot.y + slot.height * 0.835;
  const classY = slot.y + slot.height * 0.91;
  const scoreY = slot.y + slot.height * 0.962;
  const nameSize = Math.max(
    9,
    Math.min(
      17,
      slot.width * (Array.from(studentName).length > 16 ? 0.047 : 0.057),
    ),
  );
  const infoSize = Math.max(8, Math.min(14, slot.width * 0.046));

  return (
    <g
      data-student-card={recipient.studentId}
      data-card-layout="modern-standard"
      filter="url(#modern-khmer-excellence-card-shadow)"
    >
      <defs>
        <clipPath id={clipId}>
          <path
            d={`M${photoX} ${photoArcY}a${photoWidth / 2} ${photoWidth / 2} 0 0 1 ${photoWidth} 0v${photoBottom - photoArcY}h-${photoWidth}z`}
          />
        </clipPath>
      </defs>
      {recipient.photoUrl ? (
        <image
          href={recipient.photoUrl}
          x={photoX}
          y={photoY}
          width={photoWidth}
          height={photoHeight}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={photoX}
            y={photoY}
            width={photoWidth}
            height={photoHeight}
            fill="#f5eee3"
          />
          <circle
            cx={photoX + photoWidth / 2}
            cy={photoY + photoHeight * 0.41}
            r={photoWidth * 0.2}
            fill="#e8d4ad"
          />
          <path
            d={`M${photoX + photoWidth * 0.18} ${photoY + photoHeight}c8-${photoHeight * 0.22} ${photoWidth * 0.56}-${photoHeight * 0.22} ${photoWidth * 0.64} 0z`}
            fill="#e8d4ad"
          />
          <text
            x={photoX + photoWidth / 2}
            y={photoY + photoHeight * 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={slot.width * 0.14}
            fill="#68162d"
          >
            {initials(recipient) || "ស"}
          </text>
        </g>
      )}
      <image
        href={STUDENT_FRAME}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        preserveAspectRatio="none"
      />
      {content.showRanks && (
        <g data-rank-badge={recipient.rank}>
          <circle
            cx={rankX}
            cy={rankY}
            r={rankRadius}
            fill="#68162d"
            stroke="#d3ac58"
            strokeWidth={Math.max(1, slot.width * 0.008)}
          />
          <text
            x={rankX}
            y={rankY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={rankRadius * 1.05}
            fill="#ffffff"
          >
            {toKhmerNumerals(recipient.rank)}
          </text>
        </g>
      )}
      <text
        x={nameX}
        y={nameY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={nameSize}
        fill="#68162d"
      >
        {studentName}
      </text>
      {content.showClassNames && (
        <text
          x={slot.x + slot.width / 2}
          y={classY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#0f5b57"
        >
          {truncateLabel(compactClassLabel(recipient), 18)}
        </text>
      )}
      {content.showScores && (
        <text
          x={slot.x + slot.width / 2}
          y={scoreY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#7a5927"
        >
          ម.ភ {recipient.average}
        </text>
      )}
    </g>
  );
}

function A4StudentCard({
  recipient,
  slot,
  index,
  content,
}: {
  recipient: PosterRecipient;
  slot: StudentSlot;
  index: number;
  content: PosterCanvasProps["content"];
}) {
  const clipId = `modern-khmer-excellence-a4-photo-${index}`;
  const studentName = truncateLabel(displayName(recipient), 22);
  const photoX = slot.x + slot.width * 0.2;
  const photoY = slot.y + slot.height * 0.112;
  const photoWidth = slot.width * 0.6;
  const photoHeight = slot.height * 0.653;
  const photoBottom = photoY + photoHeight;
  const photoArcY = photoY + photoWidth / 2;
  const nameSize = Math.max(
    9,
    Math.min(
      18,
      slot.width * (Array.from(studentName).length > 16 ? 0.05 : 0.061),
    ),
  );
  const infoSize = Math.max(8, Math.min(15, slot.width * 0.052));

  return (
    <g
      data-student-card={recipient.studentId}
      data-card-layout="modern-a4"
      filter="url(#modern-khmer-excellence-card-shadow)"
    >
      <defs>
        <clipPath id={clipId}>
          <path
            d={`M${photoX} ${photoArcY}a${photoWidth / 2} ${photoWidth / 2} 0 0 1 ${photoWidth} 0v${photoBottom - photoArcY}h-${photoWidth}z`}
          />
        </clipPath>
      </defs>
      {recipient.photoUrl ? (
        <image
          href={recipient.photoUrl}
          x={photoX}
          y={photoY}
          width={photoWidth}
          height={photoHeight}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={photoX}
            y={photoY}
            width={photoWidth}
            height={photoHeight}
            fill="#f4eee4"
          />
          <circle
            cx={photoX + photoWidth / 2}
            cy={photoY + photoHeight * 0.43}
            r={photoWidth * 0.2}
            fill="#e7d2a9"
          />
          <path
            d={`M${photoX + photoWidth * 0.18} ${photoY + photoHeight}c8-${photoHeight * 0.23} ${photoWidth * 0.56}-${photoHeight * 0.23} ${photoWidth * 0.64} 0z`}
            fill="#e7d2a9"
          />
          <text
            x={photoX + photoWidth / 2}
            y={photoY + photoHeight * 0.51}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={slot.width * 0.15}
            fill="#68162d"
          >
            {initials(recipient) || "ស"}
          </text>
        </g>
      )}
      <image
        href={STUDENT_FRAME_A4}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        preserveAspectRatio="none"
      />
      {content.showRanks && (
        <text
          x={slot.x + slot.width * 0.198}
          y={slot.y + slot.height * 0.137}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize={Math.max(10, slot.width * 0.083)}
          fill="#68162d"
        >
          {toKhmerNumerals(recipient.rank)}
        </text>
      )}
      <text
        x={slot.x + slot.width * 0.5}
        y={slot.y + slot.height * 0.759}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={nameSize}
        fill="#68162d"
      >
        {studentName}
      </text>
      {content.showClassNames && (
        <text
          x={slot.x + slot.width * 0.359}
          y={slot.y + slot.height * 0.861}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#0f5b57"
        >
          {truncateLabel(compactClassLabel(recipient), 11)}
        </text>
      )}
      {content.showScores && (
        <text
          x={slot.x + slot.width * 0.719}
          y={slot.y + slot.height * 0.861}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={infoSize}
          fontWeight="700"
          fill="#7a5927"
        >
          {recipient.average}
        </text>
      )}
    </g>
  );
}

function ModernFooter({
  ratio,
  data,
}: {
  ratio: PosterRatioId;
  data: PosterCanvasProps["data"];
}) {
  const layout = HEADER_LAYOUTS[ratio];
  const side = ratio === "landscape" ? 66 : 54;
  const lineY = layout.height - (ratio === "portrait" ? 79 : 63);
  const textY = layout.height - (ratio === "portrait" ? 45 : 33);

  if (ratio === "portrait") {
    const formattedDate = data?.generatedAt
      ? formatKhmerDate(data.generatedAt)
      : "—";
    const teacherName = data?.homeroomTeacher?.name || "________________";

    return (
      <g data-poster-footer="true" data-footer-layout="approval-signatures">
        <rect
          x="115"
          y="1402"
          width="1010"
          height="1.5"
          rx=".75"
          fill="#b78c3c"
          opacity=".58"
        />
        <g textAnchor="middle" fill="#68162d">
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
            កាលបរិច្ឆេទ៖ {formattedDate}
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
            {truncateLabel(teacherName, 32)}
          </text>
        </g>
        <rect
          x={side}
          y={lineY}
          width={layout.width - side * 2}
          height="1.5"
          rx=".75"
          fill="#b78c3c"
          opacity=".64"
        />
        <circle cx={side + 9} cy={textY - 1} r="10" fill="#68162d" />
        <path
          d={`M${side + 4} ${textY - 1}l5-3 5 3-5 3zm2 3v4c2 2 4 2 6 0v-4`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={side + 28}
          y={textY}
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2.6"
          fill="#68162d"
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
          fill="#5f625e"
        >
          {truncateLabel(
            [data?.school.phone, data?.school.address]
              .filter(Boolean)
              .join("  •  "),
            54,
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
        rx=".75"
        fill="#b78c3c"
        opacity=".64"
      />
      <circle cx={side + 9} cy={textY - 1} r="10" fill="#68162d" />
      <path
        d={`M${side + 4} ${textY - 1}l5-3 5 3-5 3zm2 3v4c2 2 4 2 6 0v-4`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={side + 28}
        y={textY}
        dominantBaseline="central"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="2.6"
        fill="#68162d"
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
        fill="#5f625e"
      >
        {truncateLabel(
          [data?.school.phone, data?.school.address]
            .filter(Boolean)
            .join("  •  "),
          ratio === "landscape" ? 92 : 54,
        )}
      </text>
    </g>
  );
}

export default function ModernKhmerExcellenceCanvas(props: PosterCanvasProps) {
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
  const layout = HEADER_LAYOUTS[ratio];
  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visibleRecipients = recipients.slice(0, 10);
  const slots = getSlots(ratio, visibleRecipients.length);
  const schoolName = data?.school.name || placeholderSchoolName;

  return (
    <svg
      data-poster-svg="true"
      data-poster-template="modern-khmer-excellence"
      data-poster-ratio={ratio}
      data-logical-width={layout.width}
      data-logical-height={layout.height}
      width={width}
      height={height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label={`${content.title} — ${schoolName}`}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        fontFamily: "Battambang, sans-serif",
      }}
    >
      <defs>
        <filter
          id="modern-khmer-excellence-soft-shadow"
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="5"
            floodColor="#4b1726"
            floodOpacity=".12"
          />
        </filter>
        <filter
          id="modern-khmer-excellence-card-shadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feDropShadow
            dx="0"
            dy="5"
            stdDeviation="7"
            floodColor="#34121d"
            floodOpacity=".11"
          />
        </filter>
        <linearGradient
          id="modern-khmer-excellence-title-rule"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0" stopColor="#b88a3b" stopOpacity="0" />
          <stop offset=".2" stopColor="#c5a050" />
          <stop offset=".46" stopColor="#68162d" />
          <stop offset=".54" stopColor="#0f5b57" />
          <stop offset=".8" stopColor="#c5a050" />
          <stop offset="1" stopColor="#b88a3b" stopOpacity="0" />
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
      <ModernHeader
        ratio={ratio}
        data={data}
        content={content}
        schoolName={schoolName}
        academicYearLabel={academicYearLabel}
      />
      {visibleRecipients.length > 0 ? (
        <g data-poster-students="true">
          {visibleRecipients.map((recipient, index) =>
            ratio === "portrait" ? (
              <A4StudentCard
                key={`${recipient.classId}-${recipient.studentId}`}
                recipient={recipient}
                slot={slots[index]}
                index={index}
                content={content}
              />
            ) : (
              <StandardStudentCard
                key={`${recipient.classId}-${recipient.studentId}`}
                recipient={recipient}
                slot={slots[index]}
                index={index}
                content={content}
              />
            ),
          )}
        </g>
      ) : (
        <g data-poster-empty-state="true">
          <circle
            cx={layout.width / 2}
            cy={layout.height / 2}
            r={ratio === "portrait" ? 82 : 70}
            fill="#ffffff"
            stroke="#c19a4b"
            strokeWidth="3"
            filter="url(#modern-khmer-excellence-soft-shadow)"
          />
          <path
            d={`M${layout.width / 2 - 38} ${layout.height / 2}h76v42c-22 17-54 17-76 0zm-12-24 50-27 50 27-50 27z`}
            fill="#68162d"
          />
          <text
            x={layout.width / 2}
            y={layout.height / 2 + 122}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Battambang, sans-serif"
            fontSize={ratio === "portrait" ? 23 : 21}
            fontWeight="700"
            fill="#68162d"
          >
            សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
          </text>
        </g>
      )}
      <ModernFooter ratio={ratio} data={data} />
    </svg>
  );
}
