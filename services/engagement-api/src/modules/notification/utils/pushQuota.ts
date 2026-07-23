import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Anti-metric guardrail (growth-plan §7.4): never send a user more than this many
// non-urgent push notifications per day. Streak reminders and the weekly digest are
// both non-urgent and must share this budget.
export const MAX_NON_URGENT_PUSH_PER_DAY = 3;

// Types that count against the non-urgent budget. Reactive, user-triggered
// notifications (likes, follows, mentions) are urgent and excluded.
const NON_URGENT_TYPES: NotificationType[] = ['SYSTEM'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Count non-urgent notifications already created for a user today. */
export async function countNonUrgentToday(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      type: { in: NON_URGENT_TYPES },
      createdAt: { gte: startOfToday() },
    },
  });
}

/** True when the user still has non-urgent push budget left today. */
export async function hasNonUrgentBudget(userId: string): Promise<boolean> {
  const used = await countNonUrgentToday(userId);
  return used < MAX_NON_URGENT_PUSH_PER_DAY;
}
