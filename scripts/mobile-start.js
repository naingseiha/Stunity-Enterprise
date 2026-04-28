#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');

const SERVICE_PORTS = [
  3001, // auth
  3003, // student
  3004, // teacher
  3005, // class
  3007, // grade
  3008, // attendance
  3009, // timetable
  3010, // feed/media/quiz
  3011, // messaging/ws
  3012, // clubs
  3013, // notifications
  3014, // analytics
  3018, // learn
];

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

const hasCommand = (command) => {
  const result = run(command, ['--version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
};

const getConnectedAndroidTargets = () => {
  if (!hasCommand('adb')) return [];

  const result = run('adb', ['devices']);
  if (result.error || result.status !== 0) return [];

  return result.stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.endsWith('\tdevice'))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
};

const configureAdbReverse = () => {
  const targets = getConnectedAndroidTargets();
  if (targets.length === 0) {
    console.log('[mobile:start] No Android emulator/device detected. Starting Expo with automatic host detection.');
    return false;
  }

  console.log(`[mobile:start] Android target detected (${targets.join(', ')}). Preparing local service tunnels...`);

  let successfulPorts = 0;
  for (const port of SERVICE_PORTS) {
    const result = run('adb', ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore' });
    if (!result.error && result.status === 0) successfulPorts += 1;
  }

  const listResult = run('adb', ['reverse', '--list']);
  const reverseList = listResult.stdout || '';
  const feedReverseReady = reverseList.includes('tcp:3010');

  if (feedReverseReady) {
    console.log(`[mobile:start] adb reverse ready for ${successfulPorts}/${SERVICE_PORTS.length} local service ports.`);
    return true;
  }

  console.warn('[mobile:start] Android target found, but adb reverse did not become ready. Expo will use Android fallback host.');
  return false;
};

const env = { ...process.env };
const adbReverseReady = configureAdbReverse();

if (adbReverseReady) {
  env.EXPO_PUBLIC_ANDROID_USE_ADB_REVERSE = 'true';
} else if (!env.EXPO_PUBLIC_ANDROID_USE_ADB_REVERSE) {
  env.EXPO_PUBLIC_ANDROID_USE_ADB_REVERSE = 'false';
}

const expoArgs = process.argv.slice(2);
const child = spawn('npm', ['run', 'start', '--workspace', 'stunity-mobile', '--', ...expoArgs], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
