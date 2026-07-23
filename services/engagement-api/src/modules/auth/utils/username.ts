import { PrismaClient } from '@prisma/client';

/** Lowercase, dash-separated slug with non-word characters stripped. */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

type UserDelegate = Pick<PrismaClient['user'], 'findUnique'>;

/**
 * Build a unique username from a person's name, appending an incrementing
 * suffix on collision. Falls back to a stable id-based handle if the name
 * produces an empty slug.
 */
export async function generateUniqueUsername(
  db: { user: UserDelegate },
  firstName: string,
  lastName: string,
  fallbackSeed?: string,
): Promise<string> {
  const baseSlug =
    slugify(`${firstName ?? ''}-${lastName ?? ''}`) ||
    `user-${(fallbackSeed ?? Math.random().toString(36).slice(2)).substring(0, 8)}`;

  let candidate = baseSlug;
  let counter = 1;

  // Bounded loop: in practice resolves in 1-2 iterations.
  while (await db.user.findUnique({ where: { username: candidate } })) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}
