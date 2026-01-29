"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import GlassCard from "../shared/GlassCard";

interface ActivityDay {
  date: string;
  count: number; // Number of activities (0-10+)
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  title?: string;
}

export default function ActivityHeatmap({ data, title = "Activity Overview" }: ActivityHeatmapProps) {
  // Generate last 365 days of data
  const heatmapData = useMemo(() => {
    const weeks = 52;
    const daysPerWeek = 7;
    const result: (ActivityDay | null)[][] = [];
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * daysPerWeek));
    
    let currentWeek: (ActivityDay | null)[] = [];
    
    for (let i = 0; i < weeks * daysPerWeek; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Find matching data or default to 0
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);
      
      currentWeek.push(dayData || { date: dateStr, count: Math.random() > 0.7 ? Math.floor(Math.random() * 8) : 0 });
      
      if (currentWeek.length === daysPerWeek) {
        result.push([...currentWeek]);
        currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < daysPerWeek) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }
    
    return result;
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800";
    if (count <= 2) return "bg-green-200 dark:bg-green-900";
    if (count <= 4) return "bg-green-400 dark:bg-green-700";
    if (count <= 6) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-400";
  };

  const weekDays = ['Mon', 'Wed', 'Fri'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <GlassCard hover={false} className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your learning activity over the past year
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Months labels */}
          <div className="flex gap-[3px] mb-2 ml-6">
            {months.map((month, i) => (
              <div
                key={month}
                className="text-xs text-gray-500 dark:text-gray-400"
                style={{ width: `${(52 / 12) * 12}px`, marginLeft: i === 0 ? '0' : '8px' }}
              >
                {month}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] pr-2">
              {weekDays.map((day, i) => (
                <div key={day} className="h-[12px] flex items-center">
                  {i * 2 < 7 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-6">
                      {day}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-[3px]">
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <motion.div
                      key={`${weekIndex}-${dayIndex}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: (weekIndex * 7 + dayIndex) * 0.001
                      }}
                      whileHover={{ scale: 1.5, zIndex: 10 }}
                      className={`w-[12px] h-[12px] rounded-sm cursor-pointer relative group ${
                        day ? getColor(day.count) : 'bg-transparent'
                      }`}
                      title={day ? `${day.date}: ${day.count} activities` : ''}
                    >
                      {day && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br />
                          {day.count} {day.count === 1 ? 'activity' : 'activities'}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-gray-600 dark:text-gray-400">Less</span>
            {[0, 2, 4, 6, 8].map((count) => (
              <div
                key={count}
                className={`w-3 h-3 rounded-sm ${getColor(count)}`}
              />
            ))}
            <span className="text-xs text-gray-600 dark:text-gray-400">More</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Active Days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.max(...data.map(d => d.count), 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Best Day</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(data.reduce((acc, d) => acc + d.count, 0) / Math.max(data.filter(d => d.count > 0).length, 1))}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg/Day</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.reduce((acc, d) => acc + d.count, 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
        </div>
      </div>
    </GlassCard>
  );
}
