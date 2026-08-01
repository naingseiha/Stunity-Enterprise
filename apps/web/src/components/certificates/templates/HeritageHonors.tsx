import type { CertificateCanvasProps } from "../types";

export default function HeritageHonors({
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
  const bgImage = `/poster-templates/heritage-honors/background-${ratio}.png`;

  return (
    <div
      className="flex h-full w-full flex-col p-12 text-[#4a3b22] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${bgImage})`,
        fontFamily: '"Battambang", sans-serif',
      }}
    >
      {/* Inner spacing without drawing our own borders since background has it */}
      <div className="relative flex h-full w-full flex-col items-center justify-between p-24">
        {/* Header */}
        <div className="relative z-10 text-center w-full mt-4">
          <div className="flex items-center justify-center gap-6 mt-8">
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt="Logo"
                className="h-32 w-32 object-contain"
              />
            )}
          </div>
          <h3
            className="mt-8 text-[3rem] font-normal text-[#0f5b57]"
            style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
          >
            {schoolName}
          </h3>

          <div className="mx-auto mt-16 px-16 py-6 bg-[#0f5b57] text-white rounded-t-3xl rounded-b-lg shadow-lg max-w-4xl">
            <h2
              className="text-[4rem] font-normal tracking-widest"
              style={{ fontFamily: '"Koulen", "Battambang", sans-serif' }}
            >
              {content.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 flex flex-col items-center text-center mt-12 w-full">
          <p className="text-[3rem] font-bold text-[#b88a3b]">
            {content.subtitle || "សូមបញ្ជាក់ថា"}
          </p>
          <div
            className="my-12 text-[7.5rem] font-normal text-[#0f5b57]"
            style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
          >
            {recipientName}
          </div>
          {detailItems.length > 0 && (
            <div className="mb-8 flex flex-wrap justify-center gap-4 text-[1.6rem] font-bold text-[#0f5b57]">
              {detailItems.map((item) => (
                <span key={item} className="rounded-full border-2 border-[#b88a3b]/60 bg-white/60 px-7 py-2">
                  {item}
                </span>
              ))}
            </div>
          )}
          <p className="max-w-5xl text-[2rem] leading-[4rem] text-[#4a3b22] font-bold">
            បានបញ្ចប់ការសិក្សាដោយជោគជ័យ និងទទួលបាននិទ្ទេសល្អប្រសើរ
            ក្នុងឆ្នាំសិក្សា {academicYearLabel}។
            សូមជូនពរឱ្យទទួលបានជោគជ័យក្នុងការសិក្សាបន្ត។
          </p>
        </div>

        {/* Footer Signatures */}
        <div className="relative z-10 mt-auto flex w-full max-w-6xl justify-between px-16 pb-16">
          <div className="flex flex-col items-center text-center pt-24">
            <p
              className="text-[2rem] font-normal text-[#0f5b57]"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {content.teacherName || "គ្រូបន្ទុកថ្នាក់"}
            </p>
            <div className="mt-4 h-[3px] w-80 bg-[#b88a3b] border-dashed border-b border-[#b88a3b]" />
          </div>

          <div className="flex flex-col items-center text-center pt-10">
            <p className="text-[1.8rem] text-[#4a3b22] mb-6 font-bold">
              ធ្វើនៅថ្ងៃទី ......................
            </p>
            <div className="h-32 w-32 flex items-center justify-center rounded-full border-[4px] border-dashed border-[#0f5b57] bg-white/40">
              <span
                className="text-xl font-bold text-[#0f5b57]"
                style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
              >
                ត្រាសាលា
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center pt-24">
            <p
              className="text-[2rem] font-normal text-[#0f5b57]"
              style={{ fontFamily: '"Moul", "Khmer OS Muol Light", serif' }}
            >
              {content.principalName || "នាយកសាលា"}
            </p>
            <div className="mt-4 h-[3px] w-80 bg-[#b88a3b] border-dashed border-b border-[#b88a3b]" />
          </div>
        </div>
      </div>
    </div>
  );
}
