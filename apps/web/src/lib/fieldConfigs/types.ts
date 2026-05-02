// ─── Field Configuration Types ──────────────────────────────────────────────
// Defines the shape of dynamic field configurations used by StudentModal and
// TeacherModal to render the correct fields per education system.

export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'tel' | 'email' | 'number';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  /** The key used in the flat formData object. Maps to either a top-level DB column
   *  (e.g. "firstName", "dateOfBirth") or a customFields.regional key (e.g. "fatherName"). */
  key: string;
  /** Display label */
  label: string;
  /** Input type */
  type: FieldType;
  /** Whether this field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** For select fields */
  options?: SelectOption[];
  /** Whether this field is stored in customFields.regional (vs top-level DB column) */
  isCustomField?: boolean;
  /** Column span: 1 = full width, 2 = half width (default: 2) */
  span?: 1 | 2;
}

export interface FieldSection {
  id: string;
  label: string;
  /** Tab icon (emoji or lucide icon name) */
  icon?: string;
  fields: FieldConfig[];
}

export interface EntityFieldConfig {
  sections: FieldSection[];
}

export interface SystemFieldConfig {
  student: EntityFieldConfig;
  teacher: EntityFieldConfig;
}
