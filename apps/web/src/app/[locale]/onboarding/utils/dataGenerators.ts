// Sample data generators for onboarding

// Khmer names
const KHMER_FIRST_NAMES = [
  'Sophal', 'Sreyleak', 'Dara', 'Sophea', 'Bopha',
  'Raksa', 'Veasna', 'Socheata', 'Chanthy', 'Sothea',
  'Piseth', 'Sokunthea', 'Vanna', 'Rithy', 'Sovan',
];

const KHMER_LAST_NAMES = [
  'Chan', 'Kem', 'Sok', 'Chea', 'Heng',
  'Pov', 'Meas', 'Lay', 'Sam', 'Kong',
  'Seng', 'Chhouk', 'Horn', 'Kim', 'Lim',
];

// Generate sample teachers
export function generateSampleTeachers(count: number = 10, schoolSlug: string = 'school') {
  return Array.from({ length: count }, (_, i) => ({
    firstName: KHMER_FIRST_NAMES[i % KHMER_FIRST_NAMES.length],
    lastName: KHMER_LAST_NAMES[i % KHMER_LAST_NAMES.length],
    email: `teacher${i + 1}@${schoolSlug}.edu.kh`,
    phone: `+855 ${(12 + (i % 10)).toString().padStart(2, '0')} ${String(i * 11).padStart(3, '0')} ${String(i * 13).padStart(3, '0')}`,
    gender: i % 2 === 0 ? 'M' : 'F',
    dateOfBirth: new Date(1980 + (i % 15), (i % 12), 1 + (i % 28)).toISOString().split('T')[0],
    address: `Phnom Penh, Cambodia`,
  }));
}

// Generate classes
export function generateClasses(
  grades: string[],
  sectionsPerGrade: number,
  academicYearId: string
) {
  const sections = ['A', 'B', 'C', 'D', 'E'];
  const classes = [];

  for (const grade of grades) {
    for (let i = 0; i < sectionsPerGrade; i++) {
      const section = sections[i];
      classes.push({
        name: `Grade ${grade}${section}`,
        nameKh: `ថ្នាក់ទី ${grade}${section}`,
        grade: grade,
        section: section,
        capacity: 40,
        academicYearId: academicYearId,
      });
    }
  }

  return classes;
}

// Generate sample students
export function generateSampleStudents(
  count: number = 50,
  classIds: string[],
  grades: string[] = ['10', '11', '12']
) {
  return Array.from({ length: count }, (_, i) => ({
    firstName: KHMER_FIRST_NAMES[i % KHMER_FIRST_NAMES.length],
    lastName: KHMER_LAST_NAMES[Math.floor(i / 2) % KHMER_LAST_NAMES.length],
    gender: i % 2 === 0 ? 'M' : 'F',
    dateOfBirth: new Date(
      2006 + Math.floor(i / 20), // Birth year
      (i % 12), // Month
      1 + (i % 28) // Day
    ).toISOString().split('T')[0],
    grade: grades[Math.floor(i / (count / grades.length))],
    classId: classIds[i % classIds.length],
    parentPhone: `+855 ${(90 + (i % 10)).toString().padStart(2, '0')} ${String(i * 7).padStart(3, '0')} ${String(i * 11).padStart(3, '0')}`,
  }));
}

// CSV template generators
export function generateTeachersCSVTemplate(): string {
  return `firstName,lastName,email,phone,gender,dateOfBirth,address
Sophal,Chan,sophal.chan@school.edu.kh,+855 12 345 678,M,1985-05-15,Phnom Penh
Sreyleak,Kem,sreyleak.kem@school.edu.kh,+855 98 765 432,F,1990-08-22,Phnom Penh`;
}

export function generateStudentsCSVTemplate(): string {
  return `firstName,lastName,gender,dateOfBirth,grade,parentPhone
Dara,Sok,M,2008-05-15,10,+855 12 111 222
Sophea,Chea,F,2007-08-22,11,+855 98 333 444`;
}

// Download CSV file
export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
