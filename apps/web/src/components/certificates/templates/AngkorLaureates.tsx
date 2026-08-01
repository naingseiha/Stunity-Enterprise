import type { CertificateCanvasProps } from "../types";

export default function AngkorLaureates({
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
  const detailItems = [
    content.showStudentId && recipient?.studentId ? `ID: ${recipient.studentId}` : null,
    content.showRanks && recipient?.rank ? `លំដាប់ទី ${recipient.rank}` : null,
    content.showScores && recipient?.average ? `ពិន្ទុមធ្យម ${recipient.average.toFixed(2)}` : null,
  ].filter(Boolean);

  const ratio = width > height ? "landscape" : "portrait-a4";
  const bgImage = `/poster-templates/angkor-laureates/background-${ratio}.png`;

  return (
    <div
      className="flex h-full w-full flex-col p-8 text-[#e2e8f0] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${bgImage})`,
        fontFamily: '"Battambang", sans-serif',
      }}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-between p-2">
        <div className="relative flex h-full w-full flex-col items-center p-24">
          {/* Header */}
          <div className="relative z-10 flex w-full justify-between items-start">
            <div className="flex items-center gap-6">
              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt="Logo"
                  className="h-32 w-32 object-contain brightness-200 contrast-125"
                />
              )}
              <div>
                <h1
                  className="text-[2.5rem] font-normal text-[#fbbf24] tracking-widest"
                  style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
                >
                  {schoolName}
                </h1>
                <p className="mt-4 text-[1.5rem] text-slate-300 font-bold">ឆ្នាំសិក្សា {academicYearLabel}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[1.8rem] text-[#fbbf24] font-bold" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>វិញ្ញាបនបត្រ</p>
              <h2 className="text-[4rem] font-normal text-white mt-4" style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}>
                សិស្សឆ្នើម
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="relative z-10 flex flex-col items-center text-center mt-32 w-full">
            <p className="text-[3rem] font-bold tracking-widest text-slate-200">
              {content.subtitle || "សូមប្រគល់ជូន"}
            </p>
            <div
              className="my-16 text-[8rem] font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#b45309]"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {recipientName}
            </div>
            {detailItems.length > 0 && (
              <div className="mb-8 flex flex-wrap justify-center gap-4 text-[1.6rem] font-bold text-[#fbbf24]">
                {detailItems.map((item) => (
                  <span key={item} className="rounded-full border-2 border-[#fbbf24]/50 bg-black/20 px-7 py-2">
                    {item}
                  </span>
                ))}
              </div>
            )}
            <p className="max-w-5xl text-[2rem] leading-[4rem] font-bold text-slate-300">
              ចំពោះសមិទ្ធផលសិក្សាដ៏ឆ្នើម ការខិតខំប្រឹងប្រែង ការលះបង់ 
              និងអាកប្បកិរិយាជាគំរូក្នុងឆ្នាំសិក្សានេះ។ ការខិតខំរបស់អ្នកគឺជាគំរូដ៏ល្អ។
            </p>
          </div>

          {/* Footer Signatures */}
          <div className="relative z-10 mt-auto flex w-full max-w-6xl justify-between px-16 pb-16">
            <div className="flex flex-col items-center text-center w-80">
              <div className="mb-6 h-[3px] w-full bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent" />
              <p
                className="text-[2.2rem] font-normal text-white"
                style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
              >
                {content.teacherName || "គ្រូបន្ទុកថ្នាក់"}
              </p>
              <p className="text-[1.5rem] text-[#fbbf24] uppercase tracking-widest mt-2 font-bold">
                គ្រូបន្ទុកថ្នាក់
              </p>
            </div>

            <div className="flex flex-col items-center text-center w-80">
              <div className="mb-6 h-[3px] w-full bg-gradient-to-r from-transparent via-[#fbbf24] to-transparent" />
              <p
                className="text-[2.2rem] font-normal text-white"
                style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
              >
                {content.principalName || "នាយកសាលា"}
              </p>
              <p className="text-[1.5rem] text-[#fbbf24] uppercase tracking-widest mt-2 font-bold">
                នាយកសាលា
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
