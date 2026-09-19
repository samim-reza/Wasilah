/**
 * Guards the one rule that keeps the app launchable in Expo Go on Android.
 *
 * `expo-notifications` re-exports `DevicePushTokenAutoRegistration.fx` from its
 * barrel. That module registers a push-token listener while it is *evaluating*,
 * and the listener throws on Android under Expo Go since SDK 53. So a single
 * static import anywhere in the startup graph crashes the entire app before it
 * renders — which is exactly what happened.
 *
 * A type-only import is fine (erased at build time) and so is a dynamic
 * `import()` (evaluated on demand, and only where the module can work).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(__dirname, '..', '..');
const SCANNED_DIRECTORIES = ['src'];

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(path);
  }

  return files;
}

/** Strips comments so a mention in prose is not mistaken for an import. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('expo-notifications import discipline', () => {
  const files = SCANNED_DIRECTORIES.flatMap((directory) =>
    collectSourceFiles(join(PROJECT_ROOT, directory)),
  );

  it('scans a meaningful number of source files', () => {
    // A path mistake would make every assertion below vacuously pass.
    expect(files.length).toBeGreaterThan(50);
  });

  it('is never imported statically as a value', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8'));

      for (const line of source.split('\n')) {
        if (!line.includes('expo-notifications')) continue;
        // `import type ...` is erased; `import(...)` is deferred.
        if (/^\s*import\s+type\b/.test(line)) continue;
        if (line.includes('import(')) continue;
        if (/^\s*import\b/.test(line) || /\brequire\(\s*['"]expo-notifications/.test(line)) {
          offenders.push(`${file.replace(PROJECT_ROOT, '')}: ${line.trim()}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('routes every use through the gateway', () => {
    const gateway = join(
      PROJECT_ROOT,
      'src/features/notifications/services/notificationsGateway.ts',
    );
    const source = readFileSync(gateway, 'utf8');

    // The gateway is the only place allowed to reference the module directly.
    expect(source).toContain("import('expo-notifications')");
    expect(source).toContain('isRunningInExpoGo');
  });
});
