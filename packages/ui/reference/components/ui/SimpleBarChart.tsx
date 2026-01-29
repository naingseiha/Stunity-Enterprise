"use client";

import React from "react";

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  height = 200,
  showValues = true,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      {/* Chart area */}
      <div className="flex items-end justify-between gap-2 mb-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              {/* Value label at top */}
              {showValues && item.value > 0 && (
                <div className="text-sm font-bold text-gray-700 mb-auto">
                  {item.value}
                </div>
              )}

              {/* Bar - grows from bottom */}
              <div
                className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: item.color || "#3b82f6",
                  minHeight: item.value > 0 ? "8px" : "0px",
                }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Labels at bottom */}
      <div className="flex items-center justify-between gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-xs font-semibold text-gray-600 text-center">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

interface GroupedBarChartProps {
  data: Array<{
    label: string;
    groups: Array<{
      label: string;
      value: number;
      color: string;
    }>;
  }>;
  height?: number;
  showValues?: boolean;
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data,
  height = 200,
  showValues = true,
}) => {
  // Find max value across all groups
  const max = Math.max(
    ...data.flatMap((item) => item.groups.map((g) => g.value)),
    1
  );

  return (
    <div className="w-full">
      {/* Chart area */}
      <div className="flex items-end justify-between gap-3 mb-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex items-end justify-center gap-1 h-full">
            {item.groups.map((group, groupIndex) => {
              const percentage = (group.value / max) * 100;
              
              return (
                <div key={groupIndex} className="flex-1 flex flex-col items-center justify-end gap-1 h-full max-w-[40px]">
                  {/* Value label at top */}
                  {showValues && group.value > 0 && (
                    <div className="text-[10px] font-bold text-gray-700 mb-auto">
                      {group.value}
                    </div>
                  )}

                  {/* Bar - grows from bottom */}
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{
                      height: `${percentage}%`,
                      backgroundColor: group.color,
                      minHeight: group.value > 0 ? "8px" : "0px",
                    }}
                    title={`${group.label}: ${group.value}`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Labels at bottom */}
      <div className="flex items-center justify-between gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-xs font-semibold text-gray-600 text-center">
            {item.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {data[0]?.groups.map((group, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: group.color }}
            />
            <span className="text-xs font-medium text-gray-600">
              {group.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  size?: number;
}

export const SimplePieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div
        className="rounded-full bg-gray-200 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 text-sm">No data</span>
      </div>
    );
  }

  let currentAngle = -90; // Start from top

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pie chart */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {data.map((item, index) => {
          const percentage = item.value / total;
          const angle = percentage * 360;

          // Calculate arc path
          const radius = size / 2 - 4;
          const startAngle = (currentAngle * Math.PI) / 180;
          const endAngle = ((currentAngle + angle) * Math.PI) / 180;

          const x1 = size / 2 + radius * Math.cos(startAngle);
          const y1 = size / 2 + radius * Math.sin(startAngle);
          const x2 = size / 2 + radius * Math.cos(endAngle);
          const y2 = size / 2 + radius * Math.sin(endAngle);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${size / 2} ${size / 2}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          currentAngle += angle;

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-medium text-gray-700">
              {item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
