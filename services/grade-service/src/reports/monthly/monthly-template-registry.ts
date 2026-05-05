import type { PrismaClient } from '@prisma/client';
import { buildKhmMoeysMonthlyReport, type MonthlyReportQuery } from './build-khm-moeys-monthly-report';

export class MonthlyReportNotImplementedError extends Error {
  constructor(public readonly templateId: string) {
    super(`Monthly report template not implemented: ${templateId}`);
    this.name = 'MonthlyReportNotImplementedError';
  }
}

/** Normalize query override or school model to template id */
export function resolveMonthlyTemplateId(
  requested: string | undefined,
  schoolModel: string | null | undefined
): string {
  const raw = (requested || schoolModel || 'KHM_MOEYS').toString().trim().toUpperCase();
  return raw.replace(/-/g, '_');
}

export async function executeMonthlyReport(
  prisma: PrismaClient,
  schoolId: string,
  query: MonthlyReportQuery,
  schoolEducationModel: string | null | undefined
) {
  const templateId = resolveMonthlyTemplateId(query.template as string | undefined, schoolEducationModel);

  switch (templateId) {
    case 'KHM_MOEYS':
      return buildKhmMoeysMonthlyReport(prisma, schoolId, query);
    case 'EU_STANDARD':
    case 'INT_BACC':
    case 'CUSTOM':
      throw new MonthlyReportNotImplementedError(templateId);
    default:
      throw new MonthlyReportNotImplementedError(templateId);
  }
}
