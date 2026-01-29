"use client";

import { Users, UserCheck, UserX } from "lucide-react";

interface ParentStatisticsProps {
  totalParents: number;
  withAccounts: number;
  withoutAccounts: number;
  linkedStudents: number;
}

export default function ParentStatistics({
  totalParents,
  withAccounts,
  withoutAccounts,
  linkedStudents,
}: ParentStatisticsProps) {
  const stats = [
    {
      label: "សរុប",
      value: totalParents,
      icon: Users,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "មានគណនី",
      value: withAccounts,
      icon: UserCheck,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "គ្មានគណនី",
      value: withoutAccounts,
      icon: UserX,
      color: "red",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "សិស្សបានភ្ជាប់",
      value: linkedStudents,
      icon: Users,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl
              transition-all border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <h3 className="font-khmer-body text-sm text-gray-600 mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
