"use client";

import type { PosterRecipient, ReportPeriodType } from "@/lib/api/reports";
import type { PosterCanvasProps } from "./types";

const ASSET_ROOT = "/poster-templates/clean-achievers";
const SQUARE_BACKGROUND = `${ASSET_ROOT}/stunity-cambodian-school-achievement-background-2160.png`;
const LANDSCAPE_BACKGROUND = `${ASSET_ROOT}/stunity-cambodian-school-congratulations-landscape-3840x2160.png`;
const SQUARE_FRAME = `${ASSET_ROOT}/cambodian-student-portrait-frame-1400x1700.png`;
const LANDSCAPE_FRAME = `${ASSET_ROOT}/student-portrait-card-premium-transparent-1500x1650-final.png`;

const EDUCATION_DEPARTMENT = "មន្ទីរអប់រំយុវជន និងកីឡា";
const EDUCATION_PROVINCE = "ខេត្ត សៀមរាប";
const OFFICIAL_SVAYTHOM_NAME = "វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ";

type PosterVariant = "square" | "landscape";

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

function getSquareSlots(total: number): StudentSlot[] {
  const width = 250;
  const height = 304;
  const slot = (x: number, y: number) => ({ x, y, width, height });

  if (total <= 1) return [slot(415, 400)];
  if (total === 2) return [slot(245, 400), slot(585, 400)];
  if (total === 3) return [slot(75, 400), slot(415, 400), slot(755, 400)];
  if (total === 4) {
    return [slot(245, 305), slot(585, 305), slot(245, 630), slot(585, 630)];
  }
  return [
    slot(75, 305),
    slot(415, 305),
    slot(755, 305),
    slot(245, 630),
    slot(585, 630),
  ];
}

function centeredRow(
  count: number,
  width: number,
  height: number,
  gap: number,
  y: number,
): StudentSlot[] {
  const rowWidth = count * width + Math.max(0, count - 1) * gap;
  const startX = (1920 - rowWidth) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * (width + gap),
    y,
    width,
    height,
  }));
}

function getLandscapeSlots(total: number): StudentSlot[] {
  if (total <= 5) return centeredRow(Math.max(1, total), 320, 352, 50, 360);
  const firstRow = centeredRow(5, 280, 308, 80, 300);
  const secondRow = centeredRow(total - 5, 280, 308, 80, 620);
  return [...firstRow, ...secondRow];
}

function OfficialHeader({
  variant,
  data,
  schoolName,
  content,
  academicYearLabel,
}: {
  variant: PosterVariant;
  data: PosterCanvasProps["data"];
  schoolName: string;
  content: PosterCanvasProps["content"];
  academicYearLabel: string;
}) {
  const landscape = variant === "landscape";
  const centerX = landscape ? 960 : 540;
  const logoX = landscape ? 88 : 74;
  const logoY = landscape ? 142 : 142;
  const logoRadius = landscape ? 37 : 37;
  const textX = landscape ? 145 : 125;
  const titleFontSize = landscape ? 38 : 31;
  const periodLabel =
    content.subtitle || data?.period.khmerLabel || data?.period.label || "";
  const honorRollPeriod = data
    ? officialPeriodLabel(data.period.type, periodLabel)
    : periodLabel;
  const officialName = officialSchoolName(schoolName);
  const logoClipId = `clean-achievers-${variant}-school-logo`;

  return (
    <g data-poster-header="true">
      <defs>
        <clipPath id={logoClipId}>
          <circle cx={logoX} cy={logoY} r={logoRadius - 4} />
        </clipPath>
      </defs>

      {landscape && (
        <rect
          x="43"
          y="91"
          width="602"
          height="116"
          rx="22"
          fill="#fffaf0"
          fillOpacity="0.88"
          stroke="#d8b35f"
          strokeOpacity="0.46"
          filter="url(#clean-achievers-landscape-soft-shadow)"
        />
      )}

      <text
        x={centerX}
        y="31"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={landscape ? 18 : 17}
        fill="#68162d"
      >
        ព្រះរាជាណាចក្រកម្ពុជា
      </text>
      <text
        x={centerX}
        y="64"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={landscape ? 18 : 17}
        fill="#68162d"
      >
        ជាតិ សាសនា ព្រះមហាក្សត្រ
      </text>
      <text
        x={centerX}
        y="98"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Tacteng, Tacteing, serif"
        fontSize="30"
        fill="#d2aa50"
      >
        3
      </text>

      <circle
        cx={logoX}
        cy={logoY}
        r={logoRadius}
        fill="#fffaf0"
        stroke="#d8b35f"
        strokeWidth="2.5"
        filter={`url(#clean-achievers-${variant}-soft-shadow)`}
      />
      {data?.school.logo ? (
        <image
          href={data.school.logo}
          x={logoX - logoRadius + 4}
          y={logoY - logoRadius + 4}
          width={(logoRadius - 4) * 2}
          height={(logoRadius - 4) * 2}
          preserveAspectRatio="xMidYMid contain"
          clipPath={`url(#${logoClipId})`}
          crossOrigin="anonymous"
        />
      ) : (
        <text
          x={logoX}
          y={logoY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize="20"
          fontWeight="700"
          fill="#6b132b"
        >
          {schoolInitials(schoolName) || "S"}
        </text>
      )}

      {[EDUCATION_DEPARTMENT, EDUCATION_PROVINCE, officialName].map(
        (label, index) => (
          <text
            key={label}
            x={textX}
            y={120 + index * 29}
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={landscape ? 14 : 13}
            fontWeight="400"
            fill="#65172c"
          >
            {truncateLabel(label, landscape ? 38 : 31)}
          </text>
        ),
      )}

      <text
        x={centerX}
        y="148"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={landscape ? 34 : titleFontSize}
        fontWeight="400"
        fill="#68162d"
      >
        {truncateLabel(content.title, landscape ? 54 : 42)}
      </text>
      <text
        x={centerX}
        y="201"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Battambang, sans-serif"
        fontSize={landscape ? 20 : 18}
        fontWeight="700"
        fill="#68162d"
      >
        {truncateLabel(honorRollPeriod, landscape ? 42 : 30)}
      </text>
      <text
        x={centerX}
        y="239"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Battambang, sans-serif"
        fontSize={landscape ? 18 : 17}
        fontWeight="700"
        fill="#755623"
      >
        ឆ្នាំសិក្សា៖ {academicYearLabel || "—"}
      </text>
      <rect
        x={landscape ? 120 : 100}
        y="280"
        width={landscape ? 1680 : 880}
        height="3"
        rx="1.5"
        fill={`url(#clean-achievers-${variant}-title-rule)`}
      />
    </g>
  );
}

function PosterFooter({ variant }: { variant: PosterVariant }) {
  const landscape = variant === "landscape";
  const lineY = landscape ? 952 : 990;
  const brandY = landscape ? 1003 : 1037;
  const startX = landscape ? 80 : 70;
  const endX = landscape ? 1840 : 1010;

  return (
    <g data-poster-footer="true">
      <rect
        x={startX}
        y={lineY}
        width={endX - startX}
        height="2"
        rx="1"
        fill="#d9bc79"
      />
      <circle cx={startX + 22} cy={brandY} r="19" fill="#6b132b" />
      <path
        d={`M${startX + 11} ${brandY}l11-7 11 7-11 7zm4 7v8c5 4 10 4 14 0v-8`}
        fill="none"
        stroke="#fffaf0"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={startX + 56}
        y={brandY - 6}
        fontFamily="Arial, sans-serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="3"
        fill="#68162d"
      >
        STUNITY
      </text>
      <text
        x={startX + 56}
        y={brandY + 17}
        fontFamily="Battambang, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#0e5552"
      >
        CELEBRATING STUDENT ACHIEVEMENT
      </text>
    </g>
  );
}

function FallbackPhoto({
  recipient,
  centerX,
  centerY,
  radius,
}: {
  recipient: PosterRecipient;
  centerX: number;
  centerY: number;
  radius: number;
}) {
  return (
    <g>
      <circle cx={centerX} cy={centerY} r={radius} fill="#f1dfb5" />
      <circle
        cx={centerX}
        cy={centerY}
        r={radius - 4}
        fill="#f8eed5"
        stroke="#d3aa52"
        strokeWidth="2"
      />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={Math.max(25, radius * 0.43)}
        fill="#6b132b"
      >
        {initials(recipient) || "ស"}
      </text>
    </g>
  );
}

function SquareStudentCard({
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
  const photoCenterX = slot.x + slot.width * 0.5;
  const photoCenterY = slot.y + slot.height * 0.37;
  const photoRadius = slot.width * 0.295;
  const rankX = slot.x + slot.width * 0.244;
  const rankY = slot.y + slot.height * 0.188;
  const clipId = `clean-achievers-square-photo-${index}`;
  const studentName = truncateLabel(displayName(recipient), 20);
  const nameSize = Array.from(studentName).length > 15 ? 10.5 : 12;

  return (
    <g data-student-card={recipient.studentId}>
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
        <FallbackPhoto
          recipient={recipient}
          centerX={photoCenterX}
          centerY={photoCenterY}
          radius={photoRadius}
        />
      )}
      {content.showRanks && (
        <circle cx={rankX} cy={rankY} r="17" fill="#72142f" />
      )}
      <image
        href={SQUARE_FRAME}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        preserveAspectRatio="none"
      />
      {content.showRanks && (
        <text
          data-rank-text={recipient.rank}
          x={rankX}
          y={rankY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="13"
          fill="#ffffff"
        >
          {toKhmerNumerals(recipient.rank)}
        </text>
      )}
      <text
        x={slot.x + slot.width / 2}
        y={slot.y + slot.height * 0.705}
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
          y={slot.y + slot.height * 0.807}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#0e5552"
        >
          {truncateLabel(recipient.className, 22)}
        </text>
      )}
      {content.showScores && (
        <text
          x={slot.x + slot.width / 2}
          y={slot.y + slot.height * 0.9}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#76551f"
        >
          ម.ភ {recipient.average}
        </text>
      )}
    </g>
  );
}

function LandscapeStudentCard({
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
  const photoCenterX = slot.x + slot.width * 0.5;
  const photoCenterY = slot.y + slot.height * 0.36;
  const photoRadius = slot.width * 0.225;
  const rankX = slot.x + slot.width * 0.1;
  const rankY = slot.y + slot.height * 0.13;
  const rankRadius = slot.width * 0.071;
  const clipId = `clean-achievers-landscape-photo-${index}`;
  const studentName = truncateLabel(displayName(recipient), 21);
  const nameSize = Array.from(studentName).length > 15 ? 11 : 13;

  return (
    <g data-student-card={recipient.studentId}>
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
        <FallbackPhoto
          recipient={recipient}
          centerX={photoCenterX}
          centerY={photoCenterY}
          radius={photoRadius}
        />
      )}
      <image
        href={LANDSCAPE_FRAME}
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
            fill="#72142f"
            stroke="#d8b35f"
            strokeWidth="3"
          />
          <text
            x={rankX}
            y={rankY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize={slot.width > 300 ? 16 : 14}
            fill="#ffffff"
          >
            {toKhmerNumerals(recipient.rank)}
          </text>
        </g>
      )}
      <text
        x={slot.x + slot.width / 2}
        y={slot.y + slot.height * 0.64}
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
          y={slot.y + slot.height * 0.753}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#0e5552"
        >
          {truncateLabel(recipient.className, 22)}
        </text>
      )}
      {content.showScores && (
        <text
          x={slot.x + slot.width / 2}
          y={slot.y + slot.height * 0.833}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#76551f"
        >
          ម.ភ {recipient.average}
        </text>
      )}
    </g>
  );
}

function RatioCanvasDefs({ variant }: { variant: PosterVariant }) {
  return (
    <defs>
      <filter
        id={`clean-achievers-${variant}-soft-shadow`}
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
      >
        <feDropShadow
          dx="0"
          dy="6"
          stdDeviation="8"
          floodColor="#5f1728"
          floodOpacity="0.14"
        />
      </filter>
      <linearGradient
        id={`clean-achievers-${variant}-title-rule`}
        x1="0"
        y1="0"
        x2="1"
        y2="0"
      >
        <stop offset="0%" stopColor="#d8b35f" stopOpacity="0" />
        <stop offset="20%" stopColor="#d8b35f" />
        <stop offset="50%" stopColor="#6b132b" />
        <stop offset="80%" stopColor="#d8b35f" />
        <stop offset="100%" stopColor="#d8b35f" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

export function SquarePosterCanvas(props: PosterCanvasProps) {
  const { data, width, height, content, placeholderSchoolName } = props;
  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visibleRecipients = recipients.slice(0, 5);
  const slots = getSquareSlots(visibleRecipients.length);
  const schoolName = data?.school.name || placeholderSchoolName;

  return (
    <svg
      data-poster-svg="true"
      width={width}
      height={height}
      viewBox="0 0 1080 1080"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label={`${content.title} — ${schoolName}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <RatioCanvasDefs variant="square" />
      <image
        href={SQUARE_BACKGROUND}
        x="0"
        y="0"
        width="1080"
        height="1080"
        preserveAspectRatio="xMidYMid slice"
      />
      <OfficialHeader
        variant="square"
        data={data}
        schoolName={schoolName}
        content={content}
        academicYearLabel={props.academicYearLabel}
      />
      {visibleRecipients.map((recipient, index) => (
        <SquareStudentCard
          key={`${recipient.classId}-${recipient.studentId}`}
          recipient={recipient}
          slot={slots[index]}
          index={index}
          content={content}
        />
      ))}
      {visibleRecipients.length === 0 && (
        <text
          x="540"
          y="560"
          textAnchor="middle"
          fontFamily="Battambang, sans-serif"
          fontSize="22"
          fontWeight="700"
          fill="#68162d"
        >
          សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
        </text>
      )}
      <PosterFooter variant="square" />
    </svg>
  );
}

export function LandscapePosterCanvas(props: PosterCanvasProps) {
  const { data, width, height, content, placeholderSchoolName } = props;
  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visibleRecipients = recipients.slice(0, 10);
  const slots = getLandscapeSlots(visibleRecipients.length);
  const schoolName = data?.school.name || placeholderSchoolName;

  return (
    <svg
      data-poster-svg="true"
      width={width}
      height={height}
      viewBox="0 0 1920 1080"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label={`${content.title} — ${schoolName}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <RatioCanvasDefs variant="landscape" />
      <image
        href={LANDSCAPE_BACKGROUND}
        x="0"
        y="0"
        width="1920"
        height="1080"
        preserveAspectRatio="xMidYMid slice"
      />
      <OfficialHeader
        variant="landscape"
        data={data}
        schoolName={schoolName}
        content={content}
        academicYearLabel={props.academicYearLabel}
      />
      {visibleRecipients.map((recipient, index) => (
        <LandscapeStudentCard
          key={`${recipient.classId}-${recipient.studentId}`}
          recipient={recipient}
          slot={slots[index]}
          index={index}
          content={content}
        />
      ))}
      {visibleRecipients.length === 0 && (
        <text
          x="960"
          y="560"
          textAnchor="middle"
          fontFamily="Battambang, sans-serif"
          fontSize="24"
          fontWeight="700"
          fill="#68162d"
        >
          សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
        </text>
      )}
      <PosterFooter variant="landscape" />
    </svg>
  );
}
