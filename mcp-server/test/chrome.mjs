/**
 * Minimale Chrome-starter voor de end-to-end test.
 *
 * Start een headless Chrome met een eigen profiel (raakt je eigen browser dus
 * niet), praat via het DevTools-protocol met de pagina en kan localStorage
 * vullen voordat de app laadt. Gebruikt alleen `ws`, geen puppeteer.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const CANDIDATES = [
  process.env.VW_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export function findChrome() {
  return CANDIDATES.find(p => existsSync(p)) || null;
}

async function waitForEndpoint(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch { /* nog niet op */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id != null) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else {
        (this.listeners.get(msg.method) || []).forEach(fn => fn(msg.params));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP time-out op ${method}`));
      }, 20000);
    });
  }

  once(event) {
    return new Promise(resolve => {
      const list = this.listeners.get(event) || [];
      const fn = (p) => {
        this.listeners.set(event, (this.listeners.get(event) || []).filter(f => f !== fn));
        resolve(p);
      };
      list.push(fn);
      this.listeners.set(event, list);
    });
  }
}

/**
 * Start Chrome, open `url`, voer `seed` uit in de pagina en herlaad daarna.
 * Geeft een object met `close()` terug.
 */
export async function launchApp({ url, seed, port = 9333, bridge = true }) {
  const chrome = findChrome();
  if (!chrome) throw new Error('Geen Chrome gevonden. Zet VW_CHROME op het pad naar chrome.exe.');

  const profile = await mkdtemp(path.join(tmpdir(), 'vw-e2e-chrome-'));
  const proc = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  const cleanup = async () => {
    try { proc.kill(); } catch { /* al weg */ }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  if (!await waitForEndpoint(port)) {
    await cleanup();
    throw new Error(`Chrome DevTools kwam niet omhoog op poort ${port}.`);
  }

  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find(t => t.type === 'page');
  if (!page) { await cleanup(); throw new Error('Geen pagina-target in Chrome gevonden.'); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const cdp = new Cdp(ws);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // De seed moet draaien vóór de app-scripts. Zou je hem pas ná het laden
  // uitvoeren, dan heeft useMatchState zijn opslag-effect al gedraaid en
  // overschrijft de app je gegevens meteen met de standaardselectie.
  if (seed) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: seed });
  }

  const target = bridge ? `${url}${url.includes('?') ? '&' : '?'}mcpbridge=1` : url;
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: target });
  await loaded;

  return {
    close: async () => { try { ws.close(); } catch { /* al dicht */ } await cleanup(); },
    evaluate: (expression) => cdp.send('Runtime.evaluate', { expression, returnByValue: true }),
  };
}
