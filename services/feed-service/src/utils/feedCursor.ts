export type FeedCursorState = {
  id: string;
  createdAt: string;
  isPinned: boolean;
};

type FeedCursorSource = {
  id: string;
  createdAt: Date | string;
  isPinned: boolean;
};

export function encodeFeedCursor(cursor: FeedCursorSource): string {
  const createdAt =
    cursor.createdAt instanceof Date
      ? cursor.createdAt.toISOString()
      : new Date(cursor.createdAt).toISOString();

  return `v1.${Buffer.from(JSON.stringify({
    id: cursor.id,
    createdAt,
    isPinned: cursor.isPinned,
  })).toString('base64url')}`;
}

export function decodeFeedCursor(value: string): FeedCursorState | null {
  if (!value.startsWith('v1.')) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value.slice(3), 'base64url').toString('utf8'));
    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.createdAt !== 'string' ||
      typeof parsed?.isPinned !== 'boolean'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildFeedCursorWhere(cursor: FeedCursorState): any {
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  if (cursor.isPinned) {
    return {
      OR: [
        { isPinned: false },
        {
          isPinned: true,
          OR: [
            { createdAt: { lt: createdAt } },
            {
              createdAt,
              id: { lt: cursor.id },
            },
          ],
        },
      ],
    };
  }

  return {
    isPinned: false,
    OR: [
      { createdAt: { lt: createdAt } },
      {
        createdAt,
        id: { lt: cursor.id },
      },
    ],
  };
}
