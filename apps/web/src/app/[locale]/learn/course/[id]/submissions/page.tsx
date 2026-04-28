import SubmissionsDashboard from '@/components/learn/SubmissionsDashboard';

export default async function CourseSubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SubmissionsDashboard courseId={id} locale={locale} />
      </div>
    </div>
  );
}
