type MessageTree = Record<string, unknown>;

/**
 * Applies flat dot-notation translation overrides onto a nested message tree.
 * Remote DB values always win over bundled JSON defaults.
 */
export function applyFlatTranslationOverrides(
  baseMessages: MessageTree,
  flatOverrides: Record<string, string>
): MessageTree {
  const merged = structuredClone(baseMessages) as MessageTree;

  for (const [key, value] of Object.entries(flatOverrides)) {
    if (!key) continue;

    const parts = key.split('.');
    let current: MessageTree = merged;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = current[part];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        current[part] = {};
      }
      current = current[part] as MessageTree;
    }

    const leaf = parts[parts.length - 1];
    current[leaf] = value;
  }

  return merged;
}

export function getTranslationCacheTag(app: string, locale: string): string {
  return `translations-${app}-${locale}`;
}
