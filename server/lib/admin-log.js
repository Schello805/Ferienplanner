export function createAdminLogStore({ maxEntries = 200, retentionMs = 1000 * 60 * 60 * 24 * 90 } = {}) {
  const entries = [];

  const prune = () => {
    const cutoff = Date.now() - retentionMs;
    if (entries.length === 0) return;

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const ts = Date.parse(entries[i]?.ts);
      if (!Number.isFinite(ts) || ts < cutoff) {
        entries.splice(i, 1);
      }
    }
  };

  const push = (event, detail = '', meta = null) => {
    prune();
    entries.push({
      ts: new Date().toISOString(),
      event: String(event),
      detail: String(detail || ''),
      meta,
    });
    if (entries.length > maxEntries) {
      entries.splice(0, entries.length - maxEntries);
    }
  };

  const list = () => {
    prune();
    return entries.slice(-maxEntries);
  };

  return {
    push,
    list,
  };
}
