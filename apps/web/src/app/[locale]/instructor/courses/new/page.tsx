import { redirect } from 'next/navigation';

export default async function InstructorNewCourseRedirect(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  redirect(`/${params.locale}/learn/create`);
}
