// Master entry point for the field configuration system.
// Maps EducationModel values to their corresponding field configs.

import type { EducationModel } from '@/lib/educationModel';
import type { SystemFieldConfig } from './types';
import { cambodiaMoeysConfig } from './cambodia-moeys';
import { defaultConfig } from './default';

export { type SystemFieldConfig, type FieldSection, type FieldConfig, type FieldType, type SelectOption } from './types';

const configMap: Record<string, SystemFieldConfig> = {
  KHM_MOEYS: cambodiaMoeysConfig,
  EU_STANDARD: defaultConfig,
  INT_BACC: defaultConfig,
  CUSTOM: defaultConfig,
};

/**
 * Returns the field configuration for a given education model.
 * Falls back to the default (international) config if unrecognized.
 */
export function getFieldConfig(educationModel?: EducationModel | string | null): SystemFieldConfig {
  if (!educationModel) return defaultConfig;
  return configMap[educationModel] ?? defaultConfig;
}

export { cambodiaMoeysConfig, defaultConfig };
