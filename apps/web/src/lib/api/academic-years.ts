const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  copiedFromYearId: string | null;
  promotionDate: string | null;
  isPromotionDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicYearData {
  name: string;
  startDate: string;
  endDate: string;
  setAsCurrent?: boolean;
}

export interface CopySettingsData {
  toAcademicYearId: string;
  copySettings: {
    subjects?: boolean;
    teachers?: boolean;
    classes?: boolean;
  };
}

export async function getAcademicYears(schoolId: string, token: string): Promise<AcademicYear[]> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch academic years');
  }

  const data = await response.json();
  return data.data;
}

export async function getCurrentAcademicYear(schoolId: string, token: string): Promise<AcademicYear | null> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch current academic year');
  }

  const data = await response.json();
  return data.data;
}

export async function createAcademicYear(
  schoolId: string,
  yearData: CreateAcademicYearData,
  token: string
): Promise<AcademicYear> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(yearData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create academic year');
  }

  const data = await response.json();
  return data.data;
}

export async function setCurrentAcademicYear(
  schoolId: string,
  yearId: string,
  token: string
): Promise<AcademicYear> {
  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}/set-current`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to set current academic year');
  }

  const data = await response.json();
  return data.data;
}

export async function getCopyPreview(schoolId: string, yearId: string, token: string) {
  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}/copy-preview`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get copy preview');
  }

  const data = await response.json();
  return data.data;
}

export async function copySettings(
  schoolId: string,
  fromYearId: string,
  copyData: CopySettingsData,
  token: string
) {
  const response = await fetch(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/copy-settings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(copyData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to copy settings');
  }

  const data = await response.json();
  return data.data;
}

export async function deleteAcademicYear(schoolId: string, yearId: string, token: string): Promise<void> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${yearId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete academic year');
  }
}
