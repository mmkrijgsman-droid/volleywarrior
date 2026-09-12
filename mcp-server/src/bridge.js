/**
 * WebSocket-brug tussen de MCP-server en de draaiende VolleyWarrior-app.
 *
 * De MCP-server is de WebSocket-*server*; de app (browser of Android WebView)
 * verbindt als client. Zo hoeft de app geen poort te openen en werkt het ook
 * vanaf een tablet op hetzelfde netwerk.
 *
 * Protocol (JSON per frame):
 *   app  -> server  {type:'hello',    role:'app', appVersion, userAgent}
 *   server -> app   {type:'request',  id, method, params}
 *   app  -> server  {type:'response', id, ok:true,  result}
 *                   {type:'response', id, ok:false, error}
 *   app  -> server  {type:'event',    event:'state', state}   (push bij elke render)
 *   beide           {type:'ping'} / {type:'pong'}
 */
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'node:events';

export const DEFAULT_PORT = Number(process.env.VW_BRIDGE_PORT || 7823);
const DEFAULT_TIMEOUT_MS = Number(process.env.VW_BRIDGE_TIMEOUT || 8000);

export class AppBridge extends EventEmitter {
  constructor({ port = DEFAULT_PORT, host = '0.0.0.0' } = {}) {
    super();
    this.port = port;
    this.host = host;
    this.wss = null;
    this.socket = null;          // de actieve app-verbinding
    this.clientInfo = null;
    this.lastState = null;
    this.lastStateAt = null;
    this.connectedAt = null;
    this.pending = new Map();    // id -> {resolve, reject, timer}
    this.nextId = 1;
  }

  start() {
    if (this.wss) return Promise.resolve(this.port);
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.port, host: this.host });
      const onError = (err) => { this.wss = null; reject(err); };
      wss.once('error', onError);
      wss.once('listening', () => {
        wss.off('error', onError);
        wss.on('error', (err) => this.emit('error', err));
        this.wss = wss;
        this.port = wss.address().port;
        resolve(this.port);
      });
      wss.on('connection', (ws, req) => this._onConnection(ws, req));
    });
  }

  _onConnection(ws, req) {
    // Nieuwe app neemt het over van een eventuele oude verbinding.
    if (this.socket && this.socket !== ws && this.socket.readyState === this.socket.OPEN) {
      try { this.socket.close(1000, 'vervangen door nieuwe verbinding'); } catch { /* al dicht */ }
    }
    this.socket = ws;
    this.connectedAt = new Date().toISOString();
    this.clientInfo = { remote: req?.socket?.remoteAddress || null };
    this.emit('connect', this.clientInfo);

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.emit('protocolError', `ongeldige JSON van app: ${String(raw).slice(0, 120)}`);
        return;
      }
      this._onMessage(ws, msg);
    });

    ws.on('close', () => {
      if (this.socket === ws) {
        this.socket = null;
        this.connectedAt = null;
        this.emit('disconnect');
      }
    });

    ws.on('error', (err) => this.emit('error', err));
  }

  _onMessage(ws, msg) {
    switch (msg.type) {
      case 'hello':
        this.clientInfo = { ...this.clientInfo, ...msg };
        this.emit('hello', msg);
        break;
      case 'event':
        if (msg.event === 'state') {
          this.lastState = msg.state;
          this.lastStateAt = new Date().toISOString();
        }
        this.emit('appEvent', msg);
        break;
      case 'response': {
        const entry = this.pending.get(msg.id);
        if (!entry) return; // te laat of onbekend id
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        if (msg.ok) entry.resolve(msg.result);
        else entry.reject(new Error(msg.error || 'app gaf een fout terug zonder omschrijving'));
        break;
      }
      case 'ping':
        try { ws.send(JSON.stringify({ type: 'pong' })); } catch { /* verbinding weg */ }
        break;
      case 'pong':
        break;
      default:
        this.emit('protocolError', `onbekend berichttype: ${msg.type}`);
    }
  }

  isConnected() {
    return !!this.socket && this.socket.readyState === this.socket.OPEN;
  }

  status() {
    return {
      listening: !!this.wss,
      port: this.port,
      connected: this.isConnected(),
      connectedAt: this.connectedAt,
      client: this.clientInfo,
      lastStateAt: this.lastStateAt,
      hasState: !!this.lastState,
      pendingRequests: this.pending.size,
    };
  }

  request(method, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!this.isConnected()) {
      return Promise.reject(new Error(
        'Geen app verbonden. Start de app en zet de brug aan ' +
        `(localStorage.setItem('vwMcpBridge','1') en herlaad), poort ${this.port}.`
      ));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Time-out (${timeoutMs}ms) op '${method}' — app reageerde niet.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.socket.send(JSON.stringify({ type: 'request', id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async stop() {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Brug wordt afgesloten'));
    }
    this.pending.clear();
    if (this.socket) {
      try { this.socket.close(); } catch { /* al dicht */ }
      this.socket = null;
    }
    if (this.wss) {
      const wss = this.wss;
      this.wss = null;
      await new Promise((resolve) => wss.close(resolve));
    }
  }
}
