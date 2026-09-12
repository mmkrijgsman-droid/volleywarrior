#!/usr/bin/env node
/**
 * VolleyWarrior MCP-server.
 *
 * Praat over stdio met de MCP-client (Claude Code) en biedt vier groepen tools:
 *   - live      : WebSocket-brug naar de draaiende app
 *   - matches   : opgeslagen wedstrijden en Pro-analyse
 *   - nevobo    : verenigingen, teams en wedstrijdschema's
 *   - build     : projectinfo, web build, cap sync en APK
 *
 * Let op: bij stdio-transport is stdout gereserveerd voor het MCP-protocol.
 * Alle logging gaat daarom naar stderr.
 */
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppBridge, DEFAULT_PORT } from './bridge.js';
import { registerLiveTools } from './tools/live.js';
import { registerMatchTools } from './tools/matches.js';
import { registerNevoboTools } from './tools/nevobo.js';
import { registerBuildTools } from './tools/build.js';

const log = (...args) => console.error('[volleywarrior-mcp]', ...args);

export function createServer({ bridge } = {}) {
  const server = new McpServer(
    { name: 'volleywarrior', version: '1.0.0' },
    {
      instructions:
        'Tools voor de VolleyWarrior volleybal-app. De vw_live_* tools werken alleen als de app ' +
        'draait en verbonden is met de brug (check met vw_live_status). De analyse-tools werken op ' +
        'een lokale datastore die je vult met vw_sync_from_app of vw_import_data.',
    }
  );

  const appBridge = bridge ?? new AppBridge();
  registerLiveTools(server, appBridge);
  registerMatchTools(server);
  registerNevoboTools(server);
  registerBuildTools(server);

  return { server, bridge: appBridge };
}

async function main() {
  const { server, bridge } = createServer();

  bridge.on('connect', () => log('app verbonden'));
  bridge.on('disconnect', () => log('app verbinding verbroken'));
  bridge.on('error', (err) => log('brugfout:', err.message));
  bridge.on('protocolError', (msg) => log('protocolfout:', msg));

  try {
    const port = await bridge.start();
    log(`live-brug luistert op ws://localhost:${port}`);
  } catch (err) {
    // Een bezette poort mag de MCP-server niet tegenhouden; de andere drie
    // toolgroepen werken prima zonder brug.
    log(`live-brug kon niet starten op poort ${DEFAULT_PORT}: ${err.message}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('MCP-server actief op stdio');

  const shutdown = async () => {
    log('afsluiten...');
    await bridge.stop().catch(() => {});
    await server.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Alleen starten wanneer dit bestand het startpunt is, zodat tests createServer
// kunnen importeren zonder een stdio-server op te tuigen.
const invokedDirectly = !!process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    log('fatale fout:', err);
    process.exit(1);
  });
}
