import type { CertificateCanvasProps } from "../types";

export default function CleanAchievers({
  data,
  content,
  placeholderSchoolName,
  academicYearLabel,
  width,
  height,
}: CertificateCanvasProps) {
  const schoolName = (data?.school as any)?.nameKh || (data?.school as any)?.nameKhmer || data?.school?.name || placeholderSchoolName;
  const schoolLogo = data?.school?.logo || null;

  const recipient = data?.groups?.[0]?.recipients?.[0];
  const recipientName = recipient?.name || "ឈ្មោះសិស្ស";
  
  const ratio = width > height ? "landscape" : "portrait-a4";
  
  // Use Khmer decorative background as a frame composite
  const decorativePattern = `/poster-templates/heritage-honors/background-${ratio}.png`;

  return (
    <div 
      className="flex h-full w-full flex-col p-12 text-[#1a365d] bg-[#fdfdfc] relative overflow-hidden"
      style={{ fontFamily: '"Battambang", sans-serif' }}
    >
      {/* Decorative Khmer Pattern as Frame */}
      <div 
         className="absolute inset-4 opacity-80 mix-blend-multiply bg-cover bg-center bg-no-repeat pointer-events-none rounded-[2rem] shadow-sm border-[3px] border-[#d4af37]/40"
         style={{ backgroundImage: `url(${decorativePattern})` }}
      />
      
      {/* Inner White Frosted Card for Content Readability */}
      <div className="relative z-10 w-full h-full bg-white/85 backdrop-blur-md rounded-[2rem] border-[4px] border-white/80 shadow-xl flex flex-col items-center justify-between p-16">
        
        {/* Inner Gold Border */}
        <div className="absolute inset-6 border-[2px] border-[#d4af37]/60 rounded-[1.5rem] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 text-center w-full mt-4">
          <div className="mb-8 flex items-center justify-center gap-6">
            {schoolLogo && (
              <img src={schoolLogo} alt="Logo" className="h-28 w-28 object-contain drop-shadow-md" />
            )}
            <h1 className="text-[3.5rem] font-normal text-[#1a365d]" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>{schoolName}</h1>
          </div>
          <h2 className="mt-8 text-[4.5rem] font-normal tracking-widest text-[#d4af37] drop-shadow-sm" style={{ fontFamily: '"Koulen", "Battambang", sans-serif' }}>
            {content.title}
          </h2>
          <div className="mx-auto mt-8 h-1.5 w-40 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        </div>

        {/* Body */}
        <div className="relative z-10 flex flex-col items-center text-center mt-6">
          <p className="text-[2.5rem] italic text-slate-600 font-bold">
            {content.subtitle || "បានប្រគល់ជូន"}
          </p>
          <div className="my-12 text-[7.5rem] font-normal text-[#1a365d] drop-shadow-md" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>
            {recipientName}
          </div>
          <p className="max-w-5xl text-[2.2rem] leading-[4rem] text-slate-700 font-bold px-12">
            សម្រាប់សមិទ្ធផលឆ្នើមក្នុងការសិក្សា ក្នុងឆ្នាំសិក្សា {academicYearLabel}។ 
            ការលះបង់ និងការខិតខំប្រឹងប្រែងរបស់អ្នក គឺជាគំរូដ៏ល្អ។
          </p>
        </div>

        {/* Footer Signatures */}
        <div className="relative z-10 mt-auto flex w-full max-w-6xl justify-between px-16 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-[3px] w-80 bg-[#1a365d]/20" />
            <p className="text-[2.2rem] font-normal text-[#1a365d]" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>
              {content.teacherName || "គ្រូបន្ទុកថ្នាក់"}
            </p>
            <p className="text-[1.5rem] text-slate-500 font-bold tracking-widest mt-2 uppercase">គ្រូបន្ទុកថ្នាក់</p>
          </div>

          <div className="flex flex-col items-center text-center">
             <div className="mb-6 h-36 w-36 flex items-center justify-center rounded-full border-[6px] border-[#d4af37]/80 bg-white shadow-inner">
                <span className="text-[1.8rem] font-bold text-[#d4af37]" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>ត្រាសាលា</span>
             </div>
             <p className="text-[1.8rem] text-slate-600 font-bold">{content.issueDate || "កាលបរិច្ឆេទ"}</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-[3px] w-80 bg-[#1a365d]/20" />
            <p className="text-[2.2rem] font-normal text-[#1a365d]" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>
              {content.principalName || "នាយកសាលា"}
            </p>
            <p className="text-[1.5rem] text-slate-500 font-bold tracking-widest mt-2 uppercase">នាយកសាលា</p>
          </div>
        </div>
      </div>
    </div>
  );
}
