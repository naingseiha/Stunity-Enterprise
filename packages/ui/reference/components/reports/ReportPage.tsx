"use client";

interface ReportPageProps {
  pageReports: any[];
  pageNumber: number;
  totalPages: number;
  startIndex: number;
  selectedClass: any;
  subjects: any[];
  province: string;
  examCenter: string;
  roomNumber: string;
  reportTitle: string;
  examSession: string;
  reportDate: string;
  teacherName: string;
  principalName: string;
  showCircles: boolean;
  autoCircle: boolean;
  showDateOfBirth: boolean;
  showGrade: boolean;
  showOther: boolean;
  getSubjectAbbr: (name: string) => string;
}

export default function ReportPage({
  pageReports,
  pageNumber,
  totalPages,
  startIndex,
  selectedClass,
  subjects,
  province,
  examCenter,
  roomNumber,
  reportTitle,
  examSession,
  reportDate,
  teacherName,
  principalName,
  showCircles,
  autoCircle,
  showDateOfBirth,
  showGrade,
  showOther,
  getSubjectAbbr,
}: ReportPageProps) {
  return (
    <div
      className="report-page bg-white p-8 page-break"
      style={{ fontFamily: "Khmer OS Battambang" }}
    >
      <div className="text-center mb-4">
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "Khmer OS Muol Light" }}
        >
          ព្រះរាជាណាចក្រកម្ពុជា
        </h1>
        <p
          className="text-lg font-bold"
          style={{ fontFamily: "Khmer OS Muol Light" }}
        >
          ជាតិ សាសនា ព្រះមហាក្សត្រ
        </p>
        <div className="flex items-center justify-center my-2">
          <div className="h-px w-20 bg-black"></div>
          <span className="mx-2">✦✦✦</span>
          <div className="h-px w-20 bg-black"></div>
        </div>
      </div>
      <div className="text-left mb-4 text-sm">
        <p>
          ខេត្ត៖ <span className="font-semibold">{province}</span>
        </p>
        <p>
          មណ្ឌលប្រឡង៖ <span className="font-semibold">{examCenter}</span>
        </p>
        <p>
          បន្ទប់លេខ៖ <span className="font-semibold">{roomNumber}</span>
        </p>
      </div>
      <div className="text-center mb-4">
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "Khmer OS Muol Light" }}
        >
          {reportTitle}
        </h2>
        <p className="text-base font-semibold">
          សម័យប្រឡង៖ <span className="font-bold">{examSession}</span>
        </p>
        <p className="text-sm mt-1">
          ថ្នាក់៖ {selectedClass?.name} - ឆ្នាំសិក្សា {selectedClass?.year}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-600 mt-1">
            ទំព័រទី {pageNumber} / {totalPages}
          </p>
        )}
      </div>
      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="border-2 border-black">
            <th
              className="border border-black px-2 py-2 bg-gray-100"
              rowSpan={2}
            >
              ល.រ
            </th>
            <th
              className="border border-black px-2 py-2 bg-gray-100"
              rowSpan={2}
            >
              គោត្តនាម និងនាម
            </th>
            <th
              className="border border-black px-2 py-2 bg-gray-100"
              rowSpan={2}
            >
              ភេទ
            </th>
            {showDateOfBirth && (
              <th
                className="border border-black px-2 py-2 bg-gray-100"
                rowSpan={2}
              >
                ថ្ងៃខែឆ្នាំកំណើត
              </th>
            )}
            <th
              className="border border-black px-2 py-2 bg-gray-100"
              colSpan={subjects.length}
            >
              ពិន្ទុតាមវិជ្ជា
            </th>
            <th
              className="border border-black px-2 py-2 bg-gray-100"
              rowSpan={2}
            >
              សរុប
            </th>
            {showGrade && (
              <th
                className="border border-black px-2 py-2 bg-gray-100"
                rowSpan={2}
              >
                និទ្ទេស
              </th>
            )}
            {showOther && (
              <th
                className="border border-black px-2 py-2 bg-gray-100"
                rowSpan={2}
              >
                ផ្សេងៗ
              </th>
            )}
          </tr>
          <tr className="border-2 border-black">
            {subjects.map((subject) => (
              <th
                key={subject.id}
                className="border border-black px-1 py-1 bg-gray-100 text-xs"
              >
                {getSubjectAbbr(subject.name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageReports.map((report: any, index: number) => {
            const isPassed = report.average >= 50;
            const absoluteIndex = startIndex + index;
            return (
              <tr key={report.student.id} className="border border-black">
                <td className="border border-black px-2 py-2 text-center font-bold relative">
                  {showCircles && autoCircle && isPassed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-green-600 rounded-full"></div>
                    </div>
                  )}
                  {showCircles && autoCircle && !isPassed && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-600 text-2xl font-bold">
                      ✗
                    </div>
                  )}
                  <span className="relative z-10">{absoluteIndex + 1}</span>
                </td>
                <td className="border border-black px-2 py-2">
                  {report.student.lastName} {report.student.firstName}
                </td>
                <td className="border border-black px-2 py-2 text-center">
                  {report.student.gender === "male" ? "ប្រុស" : "ស្រី"}
                </td>
                {showDateOfBirth && (
                  <td className="border border-black px-2 py-2 text-center text-xs">
                    {report.student.dateOfBirth || "-"}
                  </td>
                )}
                {subjects.map((subject) => {
                  const grade = report.grades.find(
                    (g: any) => g.subjectId === subject.id
                  );
                  return (
                    <td
                      key={subject.id}
                      className="border border-black px-1 py-2 text-center"
                    >
                      {grade ? grade.score : "-"}
                    </td>
                  );
                })}
                <td className="border border-black px-2 py-2 text-center font-semibold">
                  {report.total.toFixed(2)}
                </td>
                {showGrade && (
                  <td className="border border-black px-2 py-2 text-center font-semibold">
                    {report.letterGrade}
                  </td>
                )}
                {showOther && (
                  <td className="border border-black px-2 py-2"></td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-8 text-center text-sm mt-8">
        <div>
          <p className="mb-1">{reportDate}</p>
          <p className="mb-16">ត្រួតពិនិត្យ</p>
          <div className="border-t-2 border-black pt-1 inline-block px-8">
            <p
              className="font-semibold"
              style={{ fontFamily: "Khmer OS Muol Light" }}
            >
              {teacherName}
            </p>
          </div>
        </div>
        <div>
          <p className="mb-1">{reportDate}</p>
          <p className="mb-16">អនុញ្ញាត</p>
          <div className="border-t-2 border-black pt-1 inline-block px-8">
            <p
              className="font-semibold"
              style={{ fontFamily: "Khmer OS Muol Light" }}
            >
              {principalName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
