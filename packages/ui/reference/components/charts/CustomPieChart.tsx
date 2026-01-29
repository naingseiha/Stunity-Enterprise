import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CustomPieChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
  data,
  nameKey,
  valueKey,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 100,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = payload[0].payload.total || data.value;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-gray-200">
          <p className="font-khmer-body font-bold text-gray-900 mb-1">{data.name}</p>
          <p className="font-khmer-body text-sm text-gray-600">
            {data.value} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    return `${entry.value}`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey={valueKey}
          animationDuration={1000}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{
              fontFamily: 'Khmer OS Siemreap',
              fontSize: '12px',
            }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};
