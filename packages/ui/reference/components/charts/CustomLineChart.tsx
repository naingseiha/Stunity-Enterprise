import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CustomLineChartProps {
  data: any[];
  xKey: string;
  yKey: string | string[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
  data,
  xKey,
  yKey,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  yAxisLabel,
}) => {
  const yKeys = Array.isArray(yKey) ? yKey : [yKey];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-gray-200">
          <p className="font-khmer-body font-bold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-khmer-body text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
        {showLegend && (
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontFamily: 'Khmer OS Siemreap',
              fontSize: '12px',
            }}
          />
        )}
        {yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
            animationDuration={1000}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
