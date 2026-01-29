export interface CellState {
  studentId: string;
  subjectId: string;
  value: string;
  originalValue: number | null;
  isModified: boolean;
  isSaving: boolean;
  error: string | null;
  isEditable?: boolean;
}
