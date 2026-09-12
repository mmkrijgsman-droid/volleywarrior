/** Build- en devtools voor het VolleyWarrior-project. */
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { ok, handler } from './_util.js';
import { APP_ROOT } from '../lib/store.js';

const MAX_OUTPUT = 20000; // knip lange buildlogs af, anders loopt het contextvenster vol

/**
 * Draait een commando in de projectmap en levert exitcode, stdout en stderr.
 * Verwerpt nooit op een niet-nul exitcode: de caller beslist wat een fout is.
 */
function run(command, args, { cwd = APP_ROOT, timeout = 300000, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true, // nodig op Windows voor npm/npx/gradlew
      env: { ...process.env, ...env },
      windowsHide: true,
    });

    let stdout = '', stderr = '', done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill();
      reject(new Error(`Time-out na ${timeout}ms: ${command} ${args.join(' ')}`));
    }, timeout);

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', err => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', code => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const clip = (s) => s.length > MAX_OUTPUT ? `${s.slice(0, MAX_OUTPUT)}\n... (${s.length - MAX_OUTPUT} tekens afgekapt)` : s;
      resolve({ command: `${command} ${args.join(' ')}`, exitCode: code, stdout: clip(stdout), stderr: clip(stderr) });
    });
  });
}

export function registerBuildTools(server) {
  server.registerTool('vw_app_info', {
    title: 'Projectinfo',
    description:
      'Overzicht van het VolleyWarrior-project: versie uit package.json, Capacitor app-id, ' +
      'git-branch met openstaande wijzigingen, en de aanwezige APK-bestanden met datum.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async () => {
    const pkg = JSON.parse(await readFile(path.join(APP_ROOT, 'package.json'), 'utf8'));

    let appId = null;
    try {
      const cap = await readFile(path.join(APP_ROOT, 'capacitor.config.ts'), 'utf8');
      appId = cap.match(/appId:\s*['"]([^'"]+)['"]/)?.[1] || null;
    } catch { /* config ontbreekt */ }

    const [branch, status] = await Promise.all([
      run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 15000 }),
      run('git', ['status', '--porcelain'], { timeout: 15000 }),
    ]);

    const entries = await readdir(APP_ROOT);
    const apks = [];
    for (const name of entries.filter(n => n.endsWith('.apk'))) {
      const s = await stat(path.join(APP_ROOT, name));
      apks.push({ name, sizeMB: +(s.size / 1024 / 1024).toFixed(1), modified: s.mtime.toISOString() });
    }
    apks.sort((a, b) => b.modified.localeCompare(a.modified));

    const changed = status.stdout.trim().split('\n').filter(Boolean);
    return ok({
      root: APP_ROOT,
      name: pkg.name,
      version: pkg.version,
      appId,
      git: { branch: branch.stdout.trim(), changedFiles: changed.length, files: changed.slice(0, 30) },
      apks,
    });
  }));

  server.registerTool('vw_build_web', {
    title: 'Web build',
    description: 'Draait "npm run build" (Vite productiebuild naar dist/).',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, handler(async () => {
    const res = await run('npm', ['run', 'build'], { timeout: 300000 });
    if (res.exitCode !== 0) throw new Error(`Build mislukt (exit ${res.exitCode}):\n${res.stderr || res.stdout}`);
    return ok({ ...res, result: 'Build geslaagd' });
  }));

  server.registerTool('vw_cap_sync', {
    title: 'Capacitor sync',
    description: 'Draait "npx cap sync" zodat de webbuild in het Android-project terechtkomt.',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, handler(async () => {
    const res = await run('npx', ['cap', 'sync'], { timeout: 300000 });
    if (res.exitCode !== 0) throw new Error(`cap sync mislukt (exit ${res.exitCode}):\n${res.stderr || res.stdout}`);
    return ok({ ...res, result: 'Sync geslaagd' });
  }));

  server.registerTool('vw_build_apk', {
    title: 'APK bouwen',
    description:
      'Volledige APK-build: npm run build, android-overrides kopieren, npx cap sync en gradlew assembleDebug. ' +
      'Duurt enkele minuten. Zet confirm op true om hem echt te draaien; anders krijg je alleen het stappenplan terug.',
    inputSchema: {
      confirm: z.boolean().default(false).describe('true = daadwerkelijk bouwen'),
      timeoutMinutes: z.number().int().min(1).max(30).default(15),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, handler(async ({ confirm, timeoutMinutes }) => {
    const steps = ['npm run build', 'cp -r android-overrides/* android/', 'npx cap sync', 'gradlew assembleDebug'];
    if (!confirm) {
      return ok({
        dryRun: true,
        steps,
        output: 'android/app/build/outputs/apk/debug/app-debug.apk',
        hint: 'Roep opnieuw aan met confirm=true om de build te starten.',
      });
    }

    const timeout = timeoutMinutes * 60000;
    const log = [];

    const web = await run('npm', ['run', 'build'], { timeout });
    log.push(web);
    if (web.exitCode !== 0) throw new Error(`npm run build mislukt:\n${web.stderr || web.stdout}`);

    const copy = await run('cp', ['-r', 'android-overrides/.', 'android/'], { timeout: 60000 });
    log.push(copy);

    const sync = await run('npx', ['cap', 'sync'], { timeout });
    log.push(sync);
    if (sync.exitCode !== 0) throw new Error(`cap sync mislukt:\n${sync.stderr || sync.stdout}`);

    const gradle = await run('./gradlew', ['assembleDebug'], {
      cwd: path.join(APP_ROOT, 'android'),
      timeout,
      env: { JAVA_HOME: process.env.JAVA_HOME || 'C:/Program Files/Android/Android Studio/jbr' },
    });
    log.push(gradle);
    if (gradle.exitCode !== 0) throw new Error(`gradlew assembleDebug mislukt:\n${gradle.stderr || gradle.stdout}`);

    return ok({
      result: 'APK gebouwd',
      apk: path.join(APP_ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
      steps: log.map(s => ({ command: s.command, exitCode: s.exitCode })),
    });
  }));
}
