"use client";

import type { PosterRecipient, ReportPeriodType } from "@/lib/api/reports";
import {
  LandscapePosterCanvas,
  SquarePosterCanvas,
} from "./PosterRatioCanvases";
import HeritageHonorsCanvas from "./HeritageHonorsCanvas";
import ModernKhmerExcellenceCanvas from "./ModernKhmerExcellenceCanvas";
import AngkorLaureatesCanvas from "./AngkorLaureatesCanvas";
import type { PosterCanvasProps } from "./types";

const TEMPLATE_ASSET_ROOT = "/poster-templates/clean-achievers";
const BACKGROUND_ASSET = `${TEMPLATE_ASSET_ROOT}/background-portrait-4x5@2x.png`;
const STUDENT_FRAME_ASSET = `${TEMPLATE_ASSET_ROOT}/student-frame-portrait@2x.png`;
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

function getStudentSlots(total: number): StudentSlot[] {
  const frameWidth = 260;
  const frameHeight = 325;

  if (total <= 1) {
    return [{ x: 410, y: 455, width: frameWidth, height: frameHeight }];
  }
  if (total === 2) {
    return [
      { x: 245, y: 455, width: frameWidth, height: frameHeight },
      { x: 575, y: 455, width: frameWidth, height: frameHeight },
    ];
  }
  if (total === 3) {
    return [80, 410, 740].map((x) => ({
      x,
      y: 455,
      width: frameWidth,
      height: frameHeight,
    }));
  }
  if (total === 4) {
    return [
      { x: 245, y: 330, width: frameWidth, height: frameHeight },
      { x: 575, y: 330, width: frameWidth, height: frameHeight },
      { x: 245, y: 700, width: frameWidth, height: frameHeight },
      { x: 575, y: 700, width: frameWidth, height: frameHeight },
    ];
  }

  return [
    { x: 80, y: 330, width: frameWidth, height: frameHeight },
    { x: 410, y: 330, width: frameWidth, height: frameHeight },
    { x: 740, y: 330, width: frameWidth, height: frameHeight },
    { x: 245, y: 700, width: frameWidth, height: frameHeight },
    { x: 575, y: 700, width: frameWidth, height: frameHeight },
  ];
}

function StudentCard({
  recipient,
  slot,
  index,
  showRanks,
  showScores,
  showClassNames,
}: {
  recipient: PosterRecipient;
  slot: StudentSlot;
  index: number;
  showRanks: boolean;
  showScores: boolean;
  showClassNames: boolean;
}) {
  const photoCenterX = slot.x + slot.width / 2;
  const photoCenterY = slot.y + 121;
  const photoRadius = 72;
  const clipId = `clean-achiever-photo-${index}`;
  const studentName = truncateLabel(displayName(recipient), 24);
  const nameFontSize = Array.from(studentName).length > 17 ? 12 : 14;

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
        <g>
          <circle
            cx={photoCenterX}
            cy={photoCenterY}
            r={photoRadius}
            fill="#f1dfb5"
          />
          <circle
            cx={photoCenterX}
            cy={photoCenterY}
            r={photoRadius - 5}
            fill="#f8eed5"
            stroke="#d3aa52"
            strokeWidth="2"
          />
          <text
            x={photoCenterX}
            y={photoCenterY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Battambang, sans-serif"
            fontWeight="700"
            fontSize="34"
            fill="#6b132b"
          >
            {initials(recipient) || "S"}
          </text>
        </g>
      )}

      <image
        href={STUDENT_FRAME_ASSET}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        preserveAspectRatio="none"
      />

      {showRanks && (
        <g data-rank-badge={recipient.rank}>
          <circle
            cx={slot.x + 51}
            cy={slot.y + 64}
            r="23"
            fill="#6b132b"
            stroke="#e0bd6a"
            strokeWidth="3"
          />
          <text
            x={slot.x + 51}
            y={slot.y + 64}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Moul, Khmer OS Muol Light, serif"
            fontSize="17"
            fontWeight="400"
            fill="#ffffff"
          >
            {toKhmerNumerals(recipient.rank)}
          </text>
        </g>
      )}

      <text
        x={slot.x + slot.width / 2}
        y={slot.y + 230}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Moul, Khmer OS Muol Light, serif"
        fontSize={nameFontSize}
        fontWeight="400"
        fill="#62152a"
      >
        {studentName}
      </text>

      {showClassNames && (
        <text
          x={slot.x + slot.width / 2}
          y={slot.y + 260}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill="#0e5552"
        >
          {truncateLabel(recipient.className, 24)}
        </text>
      )}

      {showScores && (
        <g data-score-pill="true">
          <rect
            x={slot.x + 69}
            y={slot.y + 276}
            width="122"
            height="29"
            rx="14.5"
            fill="#fffaf0"
            fillOpacity="0.96"
            stroke="#d9b35b"
            strokeWidth="1.5"
          />
          <text
            x={slot.x + slot.width / 2}
            y={slot.y + 291}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Battambang, sans-serif"
            fontSize="14"
            fontWeight="700"
            fill="#76551f"
          >
            ពិន្ទុ {recipient.average}
          </text>
        </g>
      )}
    </g>
  );
}

export default function PosterCanvas(props: PosterCanvasProps) {
  const {
    data,
    width,
    height,
    content,
    placeholderSchoolName,
    academicYearLabel,
  } = props;

  if (props.template === "heritage-honors") {
    return <HeritageHonorsCanvas {...props} />;
  }

  if (props.template === "modern-khmer-excellence") {
    return <ModernKhmerExcellenceCanvas {...props} />;
  }

  if (props.template === "angkor-laureates") {
    return <AngkorLaureatesCanvas {...props} />;
  }

  if (width === height) return <SquarePosterCanvas {...props} />;
  if (width > height) return <LandscapePosterCanvas {...props} />;

  const recipients = data?.groups.flatMap((group) => group.recipients) || [];
  const visibleRecipients = recipients.slice(0, 5);
  const slots = getStudentSlots(visibleRecipients.length);
  const schoolName = data?.school.name || placeholderSchoolName;
  const periodLabel =
    content.subtitle || data?.period.khmerLabel || data?.period.label || "";
  const honorRollPeriod = data
    ? officialPeriodLabel(data.period.type, periodLabel)
    : periodLabel;
  const officialName = officialSchoolName(schoolName);
  const titleFontSize = Array.from(content.title).length > 22 ? 31 : 35;

  return (
    <svg
      data-poster-svg="true"
      width={width}
      height={height}
      viewBox="0 0 1080 1528"
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
        <clipPath id="clean-achievers-school-logo">
          <circle cx="74" cy="142" r="33" />
        </clipPath>
        <filter
          id="clean-achievers-soft-shadow"
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
          id="clean-achievers-title-rule"
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

      <image
        href={BACKGROUND_ASSET}
        x="0"
        y="0"
        width="1080"
        height="1528"
        preserveAspectRatio="xMidYMid slice"
      />

      <g data-poster-header="true">
        <text
          x="540"
          y="31"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="17"
          fill="#68162d"
        >
          ព្រះរាជាណាចក្រកម្ពុជា
        </text>
        <text
          x="540"
          y="64"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="17"
          fill="#68162d"
        >
          ជាតិ សាសនា ព្រះមហាក្សត្រ
        </text>
        <text
          x="540"
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
          cx="74"
          cy="142"
          r="37"
          fill="#fffaf0"
          stroke="#d8b35f"
          strokeWidth="2.5"
          filter="url(#clean-achievers-soft-shadow)"
        />
        {data?.school.logo ? (
          <image
            href={data.school.logo}
            x="41"
            y="109"
            width="66"
            height="66"
            preserveAspectRatio="xMidYMid contain"
            clipPath="url(#clean-achievers-school-logo)"
            crossOrigin="anonymous"
          />
        ) : (
          <text
            x="74"
            y="143"
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

        <text
          x="125"
          y="120"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="13"
          fontWeight="400"
          fill="#65172c"
        >
          {EDUCATION_DEPARTMENT}
        </text>
        <text
          x="125"
          y="149"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="13"
          fontWeight="400"
          fill="#65172c"
        >
          {EDUCATION_PROVINCE}
        </text>
        <text
          x="125"
          y="178"
          fontFamily="Moul, Khmer OS Muol Light, serif"
          fontSize="13"
          fontWeight="400"
          fill="#65172c"
        >
          {truncateLabel(officialName, 31)}
        </text>

        <text
          x="540"
          y="148"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Koulen, Battambang, sans-serif"
          fontSize={titleFontSize}
          fontWeight="400"
          fill="#68162d"
        >
          {truncateLabel(content.title, 42)}
        </text>

        <text
          x="540"
          y="201"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="18"
          fontWeight="700"
          fill="#68162d"
        >
          {truncateLabel(honorRollPeriod, 30)}
        </text>
        <text
          x="540"
          y="239"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Battambang, sans-serif"
          fontSize="17"
          fontWeight="700"
          fill="#755623"
        >
          ឆ្នាំសិក្សា៖ {academicYearLabel || "—"}
        </text>

        <rect
          x="120"
          y="280"
          width="840"
          height="3"
          rx="1.5"
          fill="url(#clean-achievers-title-rule)"
        />
      </g>

      {visibleRecipients.length === 0 ? (
        <g data-poster-empty-state="true">
          <circle
            cx="540"
            cy="615"
            r="94"
            fill="#fffaf0"
            stroke="#d8b35f"
            strokeWidth="4"
            filter="url(#clean-achievers-soft-shadow)"
          />
          <path
            d="M498 614h84v47c-25 20-59 20-84 0zm-12-26 54-29 54 29-54 29z"
            fill="#6b132b"
          />
          <text
            x="540"
            y="755"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Battambang, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="#68162d"
          >
            សូមបង្កើត Poster ដើម្បីបង្ហាញសិស្សឆ្នើម
          </text>
        </g>
      ) : (
        <g data-poster-students="true">
          {visibleRecipients.map((recipient, index) => (
            <StudentCard
              key={`${recipient.classId}-${recipient.studentId}`}
              recipient={recipient}
              slot={slots[index]}
              index={index}
              showRanks={content.showRanks}
              showScores={content.showScores}
              showClassNames={content.showClassNames}
            />
          ))}
        </g>
      )}

      <g data-poster-footer="true">
        <rect x="70" y="1355" width="940" height="2" rx="1" fill="#d9bc79" />
        <circle cx="92" cy="1435" r="20" fill="#6b132b" />
        <path
          d="M80 1435l12-7 12 7-12 7zm4 7v9c5 4 11 4 16 0v-9"
          fill="none"
          stroke="#fffaf0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="126"
          y="1428"
          fontFamily="Arial, sans-serif"
          fontSize="18"
          fontWeight="700"
          letterSpacing="3"
          fill="#68162d"
        >
          STUNITY
        </text>
        <text
          x="126"
          y="1453"
          fontFamily="Battambang, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#0e5552"
        >
          CELEBRATING STUDENT ACHIEVEMENT
        </text>

        <text
          x="990"
          y="1423"
          textAnchor="end"
          fontFamily="Battambang, sans-serif"
          fontSize="13"
          fontWeight="700"
          fill="#68162d"
        >
          {truncateLabel(data?.school.phone || "", 24)}
        </text>
        <text
          x="990"
          y="1450"
          textAnchor="end"
          fontFamily="Battambang, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#6f6452"
        >
          {truncateLabel(data?.school.address || "", 48)}
        </text>
      </g>
    </svg>
  );
}
