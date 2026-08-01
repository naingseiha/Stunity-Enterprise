import type { CertificateCanvasProps } from "../types";

export default function ModernKhmerExcellence({
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
  const bgImage = `/poster-templates/modern-khmer-excellence/background-${ratio}.png`;

  return (
    <div
      className="flex h-full w-full flex-col bg-white p-20 text-slate-800 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${bgImage})`,
        fontFamily: '"Battambang", sans-serif',
      }}
    >
      {/* Background provides the layout frame, we just place the content */}
      <div className="relative flex h-full w-full flex-col p-16">
        {/* Header */}
        <div className="flex w-full items-start justify-between z-10">
          <div>
            <h1
              className="text-[3rem] font-normal uppercase tracking-widest text-slate-600"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {schoolName}
            </h1>
            <p className="mt-4 text-[2rem] text-slate-500 font-bold">
              ឆ្នាំសិក្សា {academicYearLabel}
            </p>
          </div>
          {schoolLogo && (
            <img
              src={schoolLogo}
              alt="Logo"
              className="h-28 w-28 object-contain"
            />
          )}
        </div>

        {/* Body */}
        <div className="mt-auto flex flex-col items-start z-10 w-full mb-12">
          <h2
            className="text-[6rem] font-normal text-slate-900"
            style={{ fontFamily: '"Koulen", "Battambang", sans-serif' }}
          >
            {content.title}
          </h2>
          <p className="mt-8 text-[3rem] font-bold text-slate-600">
            {content.subtitle || "បានប្រគល់ជូន"}
          </p>

          <div
            className="mt-16 text-[8.5rem] font-normal tracking-tight text-[#0f5b57]"
            style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
          >
            {recipientName}
          </div>
          {detailItems.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-4 text-[1.6rem] font-bold text-[#0f5b57]">
              {detailItems.map((item) => (
                <span key={item} className="rounded-full border-2 border-[#0f5b57]/20 bg-white/75 px-7 py-2">
                  {item}
                </span>
              ))}
            </div>
          )}

          <p className="mt-12 max-w-5xl text-[2rem] leading-[4rem] text-slate-600 font-bold">
            ចំពោះការចូលរួមយ៉ាងសកម្ម និងសមិទ្ធផលដែលសម្រេចបាននៅក្នុងកម្មវិធីសិក្សា
            ប្រកបដោយភាពច្នៃប្រឌិត និងការទទួលខុសត្រូវខ្ពស់។
          </p>
        </div>

        {/* Footer Signatures */}
        <div className="mt-auto flex w-full gap-32 z-10 items-end">
          <div className="flex flex-col">
            <p
              className="text-[2.2rem] font-normal text-slate-900"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {content.principalName || "នាយកសាលា"}
            </p>
            <p className="text-[1.5rem] text-slate-500 uppercase tracking-widest mt-2 font-bold">
              នាយកសាលា
            </p>
            <div className="mt-6 h-[3px] w-80 bg-slate-300" />
          </div>

          <div className="flex flex-col">
            <p
              className="text-[2.2rem] font-normal text-slate-900"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {content.teacherName || "គ្រូបន្ទុកថ្នាក់"}
            </p>
            <p className="text-[1.5rem] text-slate-500 uppercase tracking-widest mt-2 font-bold">
              គ្រូបន្ទុកថ្នាក់
            </p>
            <div className="mt-6 h-[3px] w-80 bg-slate-300" />
          </div>

          <div className="ml-auto flex flex-col items-end justify-end">
            <p className="text-[2rem] text-slate-500 font-bold">
              {content.issueDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
