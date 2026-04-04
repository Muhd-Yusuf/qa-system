type Writer = { write: (data: string) => void; end: () => void };

declare global {
  // eslint-disable-next-line no-var
  var __sseWriters: Map<string, Writer[]> | undefined;
}

// Shared across all Next.js route modules in the same process
const sseWriters: Map<string, Writer[]> =
  globalThis.__sseWriters ?? (globalThis.__sseWriters = new Map());

export function addClient(runId: string, writer: Writer) {
  if (!sseWriters.has(runId)) sseWriters.set(runId, []);
  sseWriters.get(runId)!.push(writer);
}

export function removeClient(runId: string, writer: Writer) {
  const arr = sseWriters.get(runId);
  if (!arr) return;
  const idx = arr.indexOf(writer);
  if (idx !== -1) arr.splice(idx, 1);
  if (arr.length === 0) sseWriters.delete(runId);
}

export function broadcast(runId: string, data: any) {
  const writers = sseWriters.get(runId) || [];
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  writers.forEach(w => w.write(msg));
}

export function closeAll(runId: string) {
  const writers = sseWriters.get(runId) || [];
  writers.forEach(w => w.end());
  sseWriters.delete(runId);
}
