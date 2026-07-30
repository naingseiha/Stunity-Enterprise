"use client";

import React from "react";
import type { PosterRecipient, ReportPeriodType } from "@/lib/api/reports";
import type { PosterCanvasProps, PosterRatioId } from "./types";

const ASSET_ROOT = "/poster-templates/heritage-honors";
const BACKGROUNDS: Record<PosterRatioId, string> = {
  square: `${ASSET_ROOT}/background-square.png`,
  landscape: `${ASSET_ROOT}/background-landscape.png`,
  portrait: `${ASSET_ROOT}/background-portrait-a4.png`,
};
const STUDENT_FRAME = `${ASSET_ROOT}/student-frame.png`;
const CIRCULAR_STUDENT_FRAME = `${ASSET_ROOT}/student-frame-circular.png`;
const STUDENT_FRAME_ASPECT_RATIO = 1700 / 1400;

const EDUCATION_DEPARTMENT = "មន្ទីរអប់រំយុវជន និងកីឡា";
const EDUCATION_PROVINCE = "ខេត្ត សៀមរាប";
const OFFICIAL_SVAYTHOM_NAME = "វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ";

type StudentSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
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
) {
  const cardHeight = cardWidth * STUDENT_FRAME_ASPECT_RATIO;
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
) {
  return [
    ...centeredRow(canvasWidth, firstRowCount, cardWidth, gap, firstY),
    ...centeredRow(canvasWidth, total - firstRowCount, cardWidth, gap, secondY),
  ];
}

function getSquareSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    const cardWidth = total === 1 ? 640 : total === 2 ? 560 : 500;
    return centeredRow(2160, Math.max(1, total), cardWidth, 80, 760);
  }
  if (total <= 5) {
    const firstRowCount = Math.ceil(total / 2);
    if (total === 5) {
      return splitRows(2160, total, firstRowCount, 500, 100, 650, 1205);
    }
    return splitRows(2160, total, firstRowCount, 430, 85, 725, 1260);
  }
  return splitRows(2160, total, Math.min(5, total), 320, 42, 785, 1250);
}

function getLandscapeSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    const cardWidth = total === 1 ? 860 : total === 2 ? 790 : 720;
    return centeredRow(3840, Math.max(1, total), cardWidth, 200, 550);
  }
  if (total <= 5) {
    return centeredRow(3840, total, 650, 95, 565);
  }
  return splitRows(3840, total, Math.min(5, total), 540, 135, 550, 1110);
}

function getPortraitSlots(total: number): StudentSlot[] {
  if (total <= 3) {
    if (total === 1) return centeredRow(2480, 1, 760, 0, 980);
    return [
      ...centeredRow(2480, 1, 650, 0, 820),
      ...centeredRow(2480, total - 1, 600, 110, 1655),
    ];
  }
  if (total <= 5) {
    if (total === 5) {
      return [
        ...centeredRow(2480, 1, 620, 0, 780),
        ...centeredRow(2480, 2, 580, 420, 1420),
        ...centeredRow(2480, 2, 580, 420, 2050),
      ];
    }
    const firstRowCount = Math.ceil(total / 2);
    return splitRows(2480, total, firstRowCount, 500, 80, 880, 1510);
  }

  if (total === 10) {
    return [
      ...centeredRow(2480, 1, 560, 0, 750),
      ...centeredRow(2480, 3, 440, 180, 1335),
      ...centeredRow(2480, 3, 440, 180, 1810),
      ...centeredRow(2480, 3, 440, 180, 2285),
    ];
  }

  const columns = 2;
  const cardWidth = 360;
  const horizontalGap = 100;
  const cardHeight = cardWidth * STUDENT_FRAME_ASPECT_RATIO;
  const verticalGap = 36;
  const startX = (2480 - columns * cardWidth - horizontalGap) / 2;
  const startY = 820;
  return Array.from({ length: total }, (_, index) => ({
    x: startX + (index % columns) * (cardWidth + horizontalGap),
    y: startY + Math.floor(index / columns) * (cardHeight + verticalGap),
    width: cardWidth,
    height: cardHeight,
  }));
}

function getSlots(ratio: PosterRatioId, total: number) {
  if (ratio === "square") return getSquareSlots(total);
  if (ratio === "landscape") return getLandscapeSlots(total);
  return getPortraitSlots(total);
}

function HeritageHeader({
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
  const canvasWidth =
    ratio === "landscape" ? 3840 : ratio === "portrait" ? 2480 : 2160;
  const centerX = canvasWidth / 2;
  const landscape = ratio === "landscape";
  const portrait = ratio === "portrait";
  const square = ratio === "square";
  const logoX = landscape ? 170 : portrait ? 190 : 170;
  const logoY = landscape ? 310 : portrait ? 360 : 360;
  const logoRadius = landscape ? 72 : 76;
  const schoolTextX = logoX + logoRadius + 46;
  const schoolNameLimit = landscape ? 48 : 36;
  const titleY = landscape ? 300 : portrait ? 540 : 420;
  const dividerY = landscape ? 520 : portrait ? 750 : 620;
  const periodLabel =
    content.subtitle || data?.period.khmerLabel || data?.period.label || "";
  const honorRollPeriod = data
    ? officialPeriodLabel(data.period.type, periodLabel)
    : periodLabel;
  const officialName = officialSchoolName(schoolName);
  const logoClipId = `heritage-honors-${ratio}-school-logo`;
  const titleSize =
    Array.from(content.title).length > 25
      ? landscape
        ? 68
        : square
          ? 68
          : 54
      : landscape
        ? 84
        : square
          ? 80
          : 66;

  return (
    <g data-poster-header="true">
      <defs>
        <clipPath id={logoClipId}>
          <circle cx={logoX} cy={logoY} r={logoRadius - 7} />
        </clipPath>
      </defs>
      <text
        x={centerX}
        y={landscape ? 66 : 86}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={landscape ? 38 : square ? 36 : 30}
        fill="#711b35"
      >
        ព្រះរាជាណាចក្រកម្ពុជា
      </text>
      <text
        x={centerX}
        y={landscape ? 118 : 140}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={landscape ? 35 : square ? 34 : 28}
        fill="#711b35"
      >
        ជាតិ សាសនា ព្រះមហាក្សត្រ
      </text>
      <text
        x={centerX}
        y={landscape ? 171 : 194}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Tacteng, Tacteing, serif"
        fontSize={landscape ? 60 : 52}
        fill="#b88a3b"
      >
        3
      </text>

      {landscape && (
        <rect
          x="62"
          y="175"
          width="820"
          height="270"
          rx="46"
          fill="#fffdf7"
          fillOpacity=".84"
          stroke="#c8a553"
          strokeWidth="3"
          strokeOpacity=".7"
          filter="url(#heritage-honors-shadow)"
        />
      )}
      <circle
        cx={logoX}
        cy={logoY}
        r={logoRadius}
        fill="#fffdf7"
        stroke="#b88a3b"
        strokeWidth="5"
        filter="url(#heritage-honors-shadow)"
      />
      {data?.school.logo ? (
        <image
          href={data.school.logo}
          x={logoX - logoRadius + 7}
          y={logoY - logoRadius + 7}
          width={(logoRadius - 7) * 2}
          height={(logoRadius - 7) * 2}
          preserveAspectRatio="xMidYMid contain"
          clipPath={`url(#${logoClipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <text
          x={logoX}
          y={logoY + 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize="38"
          fontWeight="700"
          fill="#711b35"
        >
          {schoolInitials(schoolName) || "S"}
        </text>
      )}

      {[EDUCATION_DEPARTMENT, EDUCATION_PROVINCE, officialName].map(
        (label, index) => (
          <text
            key={label}
            x={schoolTextX}
            y={logoY - 62 + index * 62}
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={landscape ? 30 : square ? 29 : 23}
            fill="#711b35"
          >
            {truncateLabel(label, schoolNameLimit)}
          </text>
        ),
      )}

      <text
        x={centerX}
        y={titleY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Koulen, Battambang, sans-serif"
        fontSize={titleSize}
        fill="#711b35"
      >
        {truncateLabel(content.title, landscape ? 64 : 48)}
      </text>
      <text
        x={centerX}
        y={titleY + (landscape ? 82 : 88)}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={
          square ? "Moul, Khmer OS Muol Light, serif" : "Battambang, sans-serif"
        }
        fontSize={landscape ? 42 : square ? 38 : 32}
        fontWeight={square ? undefined : "700"}
        fill="#0f5b57"
      >
        {truncateLabel(honorRollPeriod, landscape ? 54 : 42)}
      </text>
      <text
        x={centerX}
        y={titleY + (landscape ? 137 : 146)}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={
          square ? "Moul, Khmer OS Muol Light, serif" : "Battambang, sans-serif"
        }
        fontSize={landscape ? 33 : square ? 32 : 26}
        fontWeight={square ? undefined : "700"}
        fill="#806029"
      >
        ឆ្នាំសិក្សា៖ {academicYearLabel || "—"}
      </text>
      <rect
        x={landscape ? 350 : 180}
        y={dividerY}
        width={landscape ? 3140 : canvasWidth - 360}
        height="4"
        rx="2"
        fill="url(#heritage-honors-title-rule)"
      />
    </g>
  );
}

function HeritageStudentCard({
  recipient,
  slot,
  index,
  content,
  ratio,
}: {
  recipient: PosterRecipient;
  slot: StudentSlot;
  index: number;
  content: PosterCanvasProps["content"];
  ratio: PosterRatioId;
}) {
  const circular = ratio !== "square";
  const frameHeight = circular ? slot.width * 1.5 : slot.height;
  const photoCenterX = slot.x + slot.width * 0.5;
  const photoCenterY = circular
    ? slot.y + slot.width * 0.5
    : slot.y + slot.height * 0.385;
  const photoRadius = slot.width * (circular ? 0.255 : 0.31);
  const clipId = `heritage-honors-photo-${index}`;
  const rankX = slot.x + slot.width * (circular ? 0.2 : 0.22);
  const rankY = circular
    ? slot.y + slot.width * 0.89
    : slot.y + slot.height * 0.17;
  const rankRadius = slot.width * 0.075;
  const textX = slot.x + slot.width * (circular ? 0.56 : 0.5);
  const nameY = circular
    ? slot.y + slot.width * 0.89
    : slot.y + slot.height * 0.685;
  const classY = circular
    ? slot.y + slot.width * 1.005
    : slot.y + slot.height * 0.797;
  const scoreY = circular
    ? slot.y + slot.width * 1.005
    : slot.y + slot.height * 0.875;
  const studentName = truncateLabel(displayName(recipient), 22);
  const nameSize = Math.max(
    20,
    Math.min(
      34,
      slot.width * (Array.from(studentName).length > 16 ? 0.046 : 0.055),
    ),
  );

  return (
    <g
      data-student-card={recipient.studentId}
      data-card-layout={circular ? "circular" : "portrait"}
      filter="url(#heritage-honors-card-shadow)"
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
        <g>
          <circle
            cx={photoCenterX}
            cy={photoCenterY}
            r={photoRadius}
            fill="#f5ead5"
          />
          <circle
            cx={photoCenterX}
            cy={photoCenterY}
            r={photoRadius - 7}
            fill="#fffaf0"
            stroke="#d5b15f"
            strokeWidth="4"
          />
          <text
            x={photoCenterX}
            y={photoCenterY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={photoRadius * 0.43}
            fill="#711b35"
          >
            {initials(recipient) || "ស"}
          </text>
        </g>
      )}
      <image
        href={circular ? CIRCULAR_STUDENT_FRAME : STUDENT_FRAME}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={frameHeight}
        preserveAspectRatio="none"
      />
      {content.showRanks && (
        <g data-rank-badge={recipient.rank}>
          {!circular && (
            <circle
              cx={rankX}
              cy={rankY}
              r={rankRadius}
              fill="#711b35"
              stroke="#d9b45f"
              strokeWidth={Math.max(2, slot.width * 0.008)}
            />
          )}
          <text
            x={rankX}
            y={rankY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={rankRadius * 0.82}
            fill={circular ? "#711b35" : "#ffffff"}
          >
            {toKhmerNumerals(recipient.rank)}
          </text>
        </g>
      )}
      <text
        x={textX}
        y={nameY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={nameSize}
        fill="#711b35"
      >
        {studentName}
      </text>
      {content.showClassNames && (
        <text
          x={circular ? slot.x + slot.width * 0.36 : textX}
          y={classY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={Math.max(22, Math.min(31, slot.width * 0.043))}
          fontWeight="700"
          fill="#0f5b57"
        >
          {truncateLabel(recipient.className, 24)}
        </text>
      )}
      {content.showScores && (
        <text
          x={circular ? slot.x + slot.width * 0.67 : textX}
          y={scoreY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize={Math.max(21, Math.min(29, slot.width * 0.041))}
          fontWeight="700"
          fill="#806029"
        >
          {circular ? recipient.average : `ម.ភ ${recipient.average}`}
        </text>
      )}
    </g>
  );
}

function HeritageFooter({
  ratio,
  data,
}: {
  ratio: PosterRatioId;
  data: PosterCanvasProps["data"];
}) {
  const width =
    ratio === "landscape" ? 3840 : ratio === "portrait" ? 2480 : 2160;
  const height = ratio === "portrait" ? 3508 : 2160;
  const lineY = height - (ratio === "portrait" ? 210 : 150);
  const brandY = height - (ratio === "portrait" ? 115 : 77);
  const side = ratio === "landscape" ? 130 : 105;

  if (ratio === "portrait") {
    const date = data?.generatedAt ? formatKhmerDate(data.generatedAt) : "—";
    const teacherName = data?.homeroomTeacher?.name || "________________";
    return (
      <g data-poster-footer="true" data-footer-layout="approval-signatures">
        <rect
          x="230"
          y="2890"
          width="2020"
          height="3"
          fill="#c8a553"
          opacity=".62"
        />
        <rect
          x="300"
          y="2930"
          width="700"
          height="330"
          rx="34"
          fill="#fffdf7"
          fillOpacity=".88"
          stroke="#c8a553"
          strokeWidth="3"
          strokeOpacity=".72"
        />
        <rect
          x="1480"
          y="2930"
          width="700"
          height="330"
          rx="34"
          fill="#fffdf7"
          fillOpacity=".88"
          stroke="#c8a553"
          strokeWidth="3"
          strokeOpacity=".72"
        />
        <g textAnchor="middle" fill="#711b35">
          <text
            x="650"
            y="2990"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="36"
          >
            បានឃើញ និងឯកភាព
          </text>
          <text
            x="650"
            y="3070"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="36"
          >
            នាយកសាលា
          </text>
          <text
            x="1830"
            y="2982"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="32"
          >
            កាលបរិច្ឆេទ៖ {date}
          </text>
          <text
            x="1830"
            y="3066"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="36"
          >
            គ្រូប្រចាំថ្នាក់
          </text>
          <text
            x="1830"
            y="3210"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="34"
          >
            {truncateLabel(teacherName, 32)}
          </text>
        </g>
        <rect
          x={side}
          y={lineY}
          width={width - side * 2}
          height="3"
          rx="1.5"
          fill="#c8a553"
          opacity=".72"
        />
        <circle cx={side + 30} cy={brandY - 4} r="28" fill="#711b35" />
        <path
          d={`M${side + 15} ${brandY - 4}l15-9 15 9-15 9zm5 9v12c6 5 13 5 20 0V${brandY + 5}`}
          fill="none"
          stroke="#fffaf0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={side + 78}
          y={brandY - 12}
          fontFamily="Arial, sans-serif"
          fontSize="28"
          fontWeight="700"
          letterSpacing="5"
          fill="#711b35"
        >
          STUNITY
        </text>
        <text
          x={side + 78}
          y={brandY + 22}
          fontFamily="Battambang, sans-serif"
          fontSize="18"
          fontWeight="700"
          fill="#0f5b57"
        >
          CELEBRATING STUDENT ACHIEVEMENT
        </text>
        <text
          x={width - side}
          y={brandY - 13}
          textAnchor="end"
          fontFamily="Battambang, sans-serif"
          fontSize="22"
          fontWeight="700"
          fill="#711b35"
        >
          {truncateLabel(data?.school.phone || "", 28)}
        </text>
        <text
          x={width - side}
          y={brandY + 22}
          textAnchor="end"
          fontFamily="Battambang, sans-serif"
          fontSize="19"
          fontWeight="700"
          fill="#6f6452"
        >
          {truncateLabel(data?.school.address || "", 48)}
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
          x="180"
          y="1840"
          width="1800"
          height="3"
          fill="#c8a553"
          opacity=".62"
        />
        <rect
          x="225"
          y="1858"
          width="670"
          height="172"
          rx="28"
          fill="#fffdf7"
          fillOpacity=".9"
          stroke="#c8a553"
          strokeWidth="3"
          strokeOpacity=".72"
        />
        <rect
          x="1265"
          y="1858"
          width="670"
          height="172"
          rx="28"
          fill="#fffdf7"
          fillOpacity=".9"
          stroke="#c8a553"
          strokeWidth="3"
          strokeOpacity=".72"
        />
        <g textAnchor="middle" fill="#711b35">
          <text
            x="560"
            y="1898"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="29"
          >
            បានឃើញ និងឯកភាព
          </text>
          <text
            x="560"
            y="1970"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="31"
          >
            នាយកសាលា
          </text>
          <text
            x="1600"
            y="1891"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="24"
          >
            កាលបរិច្ឆេទ៖ {date}
          </text>
          <text
            x="1600"
            y="1940"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="29"
          >
            គ្រូប្រចាំថ្នាក់
          </text>
          <text
            x="1600"
            y="1993"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="26"
          >
            {truncateLabel(teacherName, 28)}
          </text>
        </g>
        <rect
          x={side}
          y="2052"
          width={width - side * 2}
          height="3"
          rx="1.5"
          fill="#c8a553"
          opacity=".72"
        />
        <circle cx={side + 30} cy="2104" r="28" fill="#711b35" />
        <path
          d={`M${side + 15} 2104l15-9 15 9-15 9zm5 9v12c6 5 13 5 20 0v-12`}
          fill="none"
          stroke="#fffaf0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={side + 78}
          y="2096"
          fontFamily="Arial, sans-serif"
          fontSize="28"
          fontWeight="700"
          letterSpacing="5"
          fill="#711b35"
        >
          STUNITY
        </text>
        <text
          x={width - side}
          y="2108"
          textAnchor="end"
          fontFamily="Battambang, sans-serif"
          fontSize="20"
          fontWeight="700"
          fill="#6f6452"
        >
          {truncateLabel(data?.school.address || "", 48)}
        </text>
      </g>
    );
  }

  return (
    <g data-poster-footer="true">
      <rect
        x={side}
        y={lineY}
        width={width - side * 2}
        height="3"
        rx="1.5"
        fill="#c8a553"
        opacity=".72"
      />
      <circle cx={side + 30} cy={brandY - 4} r="28" fill="#711b35" />
      <path
        d={`M${side + 15} ${brandY - 4}l15-9 15 9-15 9zm5 9v12c6 5 13 5 20 0V${brandY + 5}`}
        fill="none"
        stroke="#fffaf0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={side + 78}
        y={brandY - 12}
        fontFamily="Arial, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="5"
        fill="#711b35"
      >
        STUNITY
      </text>
      <text
        x={side + 78}
        y={brandY + 22}
        fontFamily="Battambang, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#0f5b57"
      >
        CELEBRATING STUDENT ACHIEVEMENT
      </text>
      <text
        x={width - side}
        y={brandY - 13}
        textAnchor="end"
        fontFamily="Battambang, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="#711b35"
      >
        {truncateLabel(data?.school.phone || "", 28)}
      </text>
      <text
        x={width - side}
        y={brandY + 22}
        textAnchor="end"
        fontFamily="Battambang, sans-serif"
        fontSize="19"
        fontWeight="700"
        fill="#6f6452"
      >
        {truncateLabel(
          data?.school.address || "",
          ratio === "landscape" ? 74 : 48,
        )}
      </text>
    </g>
  );
}

export default function HeritageHonorsCanvas(props: PosterCanvasProps) {
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
  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visibleRecipients = recipients.slice(0, 10);
  const slots = getSlots(ratio, visibleRecipients.length);
  const schoolName = data?.school.name || placeholderSchoolName;

  return (
    <svg
      data-poster-svg="true"
      data-poster-template="heritage-honors"
      data-poster-ratio={ratio}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
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
          id="heritage-honors-shadow"
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="14"
            floodColor="#481020"
            floodOpacity=".14"
          />
        </filter>
        <filter
          id="heritage-honors-card-shadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="16"
            floodColor="#35131d"
            floodOpacity=".12"
          />
        </filter>
        <linearGradient
          id="heritage-honors-title-rule"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0" stopColor="#b88a3b" stopOpacity="0" />
          <stop offset=".22" stopColor="#b88a3b" />
          <stop offset=".46" stopColor="#711b35" />
          <stop offset=".54" stopColor="#0f5b57" />
          <stop offset=".78" stopColor="#b88a3b" />
          <stop offset="1" stopColor="#b88a3b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <image
        href={BACKGROUNDS[ratio]}
        x="0"
        y="0"
        width={width}
        height={height}
        preserveAspectRatio="none"
      />
      <HeritageHeader
        ratio={ratio}
        data={data}
        content={content}
        schoolName={schoolName}
        academicYearLabel={academicYearLabel}
      />
      {visibleRecipients.length > 0 ? (
        <g data-poster-students="true">
          {visibleRecipients.map((recipient, index) => (
            <HeritageStudentCard
              key={`${recipient.classId}-${recipient.studentId}`}
              recipient={recipient}
              slot={slots[index]}
              index={index}
              content={content}
              ratio={ratio}
            />
          ))}
        </g>
      ) : (
        <g data-poster-empty-state="true">
          <circle
            cx={width / 2}
            cy={height / 2}
            r={ratio === "landscape" ? 150 : 130}
            fill="#fffdf7"
            stroke="#b88a3b"
            strokeWidth="6"
            filter="url(#heritage-honors-shadow)"
          />
          <path
            d={`M${width / 2 - 70} ${height / 2}h140v76c-41 32-98 32-140 0zm-20-42 90-48 90 48-90 48z`}
            fill="#711b35"
          />
          <text
            x={width / 2}
            y={height / 2 + 210}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Battambang, sans-serif"
            fontSize="38"
            fontWeight="700"
            fill="#711b35"
          >
            សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
          </text>
        </g>
      )}
      <HeritageFooter ratio={ratio} data={data} />
    </svg>
  );
}
