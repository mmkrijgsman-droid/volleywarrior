/** Gedeelde helpers voor de tool-modules. */

export function ok(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

export function fail(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Fout: ${msg}` }], isError: true };
}

/**
 * Wikkelt een tool-handler zodat een gegooide fout een nette MCP-foutrespons
 * wordt in plaats van een protocol-crash.
 */
export function handler(fn) {
  return async (args, extra) => {
    try {
      return await fn(args ?? {}, extra);
    } catch (err) {
      return fail(err);
    }
  };
}
