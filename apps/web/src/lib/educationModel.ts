export type EducationModel = 'KHM_MOEYS' | 'EU_STANDARD' | 'INT_BACC' | 'CUSTOM';

export function formatEducationModelLabel(model?: string | null): string {
  switch (model) {
    case 'KHM_MOEYS':
      return 'Cambodia MoEYS';
    case 'EU_STANDARD':
      return 'EU Standard';
    case 'INT_BACC':
      return 'International Baccalaureate';
    case 'CUSTOM':
      return 'Custom Model';
    default:
      return 'Cambodia MoEYS';
  }
}
