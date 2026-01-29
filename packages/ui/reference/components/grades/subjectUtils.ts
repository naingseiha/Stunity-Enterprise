export function getKhmerShortName(code: string): string {
  const baseCode = code.split("-")[0];

  const khmerNames: { [key: string]: string } = {
    WRITING: "ស.  អាន",
    WRITER: "តែង.  ក្តី",
    DICTATION: "ចំ. តាម",
    KHM: "ភាសាខ្មែរ",
    MATH: "គណិត",
    PHY: "រូប",
    CHEM: "គីមី",
    BIO: "ជីវៈ",
    EARTH: "ផែនដី",
    MORAL: "សីលធម៌",
    GEO: "ភូមិ",
    HIST: "ប្រវត្តិ",
    ENG: "ភាសា",
    HLTH: "សុខភាព",
    ECON: "សេដ្ឋកិច្ច",
    HE: "គេហ",
    SPORTS: "កីឡា",
    AGRI: "កសិកម្ម",
    ICT: "ICT",
  };

  return khmerNames[baseCode] || code;
}

export function getSubjectColor(
  code: string,
  isEditable: boolean
): { header: string; cell: string } {
  const baseCode = code.split("-")[0];

  if (!isEditable) {
    return {
      header: "bg-gray-200 text-gray-600",
      cell: "bg-gray-100/50",
    };
  }

  const colors: { [key: string]: { header: string; cell: string } } = {
    WRITING: { header: "bg-blue-100 text-blue-800", cell: "bg-blue-50/30" },
    WRITER: { header: "bg-blue-100 text-blue-800", cell: "bg-blue-50/30" },
    DICTATION: { header: "bg-blue-100 text-blue-800", cell: "bg-blue-50/30" },
    KHM: { header: "bg-sky-100 text-sky-800", cell: "bg-sky-50/30" },
    ENG: { header: "bg-cyan-100 text-cyan-800", cell: "bg-cyan-50/30" },
    MATH: { header: "bg-purple-100 text-purple-800", cell: "bg-purple-50/30" },
    PHY: { header: "bg-indigo-100 text-indigo-800", cell: "bg-indigo-50/30" },
    CHEM: { header: "bg-violet-100 text-violet-800", cell: "bg-violet-50/30" },
    BIO: { header: "bg-green-100 text-green-800", cell: "bg-green-50/30" },
    EARTH: { header: "bg-teal-100 text-teal-800", cell: "bg-teal-50/30" },
    MORAL: { header: "bg-amber-100 text-amber-800", cell: "bg-amber-50/30" },
    GEO: { header: "bg-orange-100 text-orange-800", cell: "bg-orange-50/30" },
    HIST: { header: "bg-yellow-100 text-yellow-800", cell: "bg-yellow-50/30" },
    ECON: {
      header: "bg-emerald-100 text-emerald-800",
      cell: "bg-emerald-50/30",
    },
    HLTH: { header: "bg-rose-100 text-rose-800", cell: "bg-rose-50/30" },
    HE: { header: "bg-pink-100 text-pink-800", cell: "bg-pink-50/30" },
    SPORTS: { header: "bg-red-100 text-red-800", cell: "bg-red-50/30" },
    AGRI: { header: "bg-lime-100 text-lime-800", cell: "bg-lime-50/30" },
    ICT: {
      header: "bg-fuchsia-100 text-fuchsia-800",
      cell: "bg-fuchsia-50/30",
    },
  };

  return (
    colors[baseCode] || {
      header: "bg-gray-100 text-gray-800",
      cell: "bg-gray-50/30",
    }
  );
}

export function getGradeLevelColor(level: string) {
  const colors: { [key: string]: string } = {
    A: "bg-green-600 text-white",
    B: "bg-blue-600 text-white",
    C: "bg-yellow-600 text-white",
    D: "bg-orange-600 text-white",
    E: "bg-red-500 text-white",
    F: "bg-red-700 text-white",
  };
  return colors[level] || "bg-gray-600 text-white";
}
