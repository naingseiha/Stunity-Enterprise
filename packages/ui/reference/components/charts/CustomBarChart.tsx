import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CustomBarChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  colors?: string[];
  height?: number;
  comparisonMode?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  tooltipFormatter?: (value: any) => string;
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  xKey,
  yKey,
  colors = DEFAULT_COLORS,
  height = 300,
  comparisonMode = false,
  showLegend = true,
  yAxisLabel,
  tooltipFormatter,
}) => {
  const yKeys = Array.isArray(yKey) ? yKey : [yKey];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-gray-200">
          <p className="font-khmer-body font-bold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-khmer-body text-sm" style={{ color: entry.color }}>
              {entry.name}: {tooltipFormatter ? tooltipFormatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex items-center justify-center gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-khmer-body text-sm font-semibold text-gray-700">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'Khmer OS Siemreap' }}
          stroke="#d1d5db"
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          stroke="#d1d5db"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend content={<CustomLegend />} />}
        {yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
