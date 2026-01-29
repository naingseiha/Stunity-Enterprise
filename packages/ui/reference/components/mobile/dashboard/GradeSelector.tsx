"use client";

interface GradeSelectorProps {
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
  gradeCounts?: { [key: string]: number };
}

export default function GradeSelector({
  selectedGrade,
  onGradeChange,
  gradeCounts = {},
}: GradeSelectorProps) {
  const grades = ["7", "8", "9", "10", "11", "12"];

  const gradeColors = {
    "7": "from-pink-500 to-rose-500",
    "8": "from-purple-500 to-violet-500",
    "9": "from-blue-500 to-indigo-500",
    "10": "from-cyan-500 to-teal-500",
    "11": "from-green-500 to-emerald-500",
    "12": "from-orange-500 to-amber-500",
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-khmer-title text-sm font-bold text-gray-700">
          ជ្រើសរើសថ្នាក់
        </h3>
      </div>

      {/* Horizontal Scrollable Grade Pills */}
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
        <div className="flex gap-3 pb-2">
          {grades.map((grade) => {
            const isSelected = selectedGrade === grade;
            const count = gradeCounts[grade] || 0;
            const colorClass = gradeColors[grade as keyof typeof gradeColors];

            return (
              <button
                key={grade}
                onClick={() => onGradeChange(grade)}
                className={`flex-shrink-0 relative group transition-all duration-300 ${
                  isSelected ? "scale-105" : "scale-100 hover:scale-102"
                }`}
              >
                <div
                  className={`relative overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 ${
                    isSelected ? "shadow-xl" : "shadow-md hover:shadow-lg"
                  }`}
                >
                  {/* Gradient Background */}
                  <div
                    className={`bg-gradient-to-br ${colorClass} p-4 min-w-[100px]`}
                  >
                    {/* Decorative Circle */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>

                    <div className="relative z-10">
                      <div className="flex flex-col items-center">
                        <span className="font-khmer-title text-white/90 text-xs font-bold mb-1">
                          ថ្នាក់ទី
                        </span>
                        <span className="font-black text-white text-3xl leading-none mb-2">
                          {grade}
                        </span>
                        {count > 0 && (
                          <div className="bg-white/25 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                            <span className="font-khmer-body text-white text-xs font-bold">
                              {count} សិស្ស
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                  )}
                </div>

                {/* Glow Effect on Hover */}
                {isSelected && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-20 blur-xl -z-10 rounded-2xl`}
                  ></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
