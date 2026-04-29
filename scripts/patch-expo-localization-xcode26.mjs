import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [
  join(process.cwd(), 'apps/mobile/node_modules/expo-localization/ios/LocalizationModule.swift'),
  join(process.cwd(), 'node_modules/expo-localization/ios/LocalizationModule.swift'),
];

const target = candidates.find((path) => existsSync(path));

if (!target) {
  console.warn('[postinstall] expo-localization Swift source not found; skipping Xcode 26 patch.');
  process.exit(0);
}

const source = readFileSync(target, 'utf8');

if (source.includes('@unknown default:\n      return String(describing: calendar.identifier)')) {
  process.exit(0);
}

const patched = source.includes('@unknown default:\n      return calendar.identifier.identifier')
  ? source.replace(
      '@unknown default:\n      return calendar.identifier.identifier',
      '@unknown default:\n      return String(describing: calendar.identifier)',
    )
  : source.replace(
  `    case .iso8601:
      return "iso8601"
    }
`,
  `    case .iso8601:
      return "iso8601"
    @unknown default:
      return String(describing: calendar.identifier)
    }
`,
  );

if (patched === source) {
  console.warn('[postinstall] expo-localization Xcode 26 patch pattern not found; source may have changed.');
  process.exit(0);
}

writeFileSync(target, patched);
console.log('[postinstall] Patched expo-localization Calendar.Identifier switch for Xcode 26.');
