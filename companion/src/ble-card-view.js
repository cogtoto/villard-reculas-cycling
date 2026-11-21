// Pure view helpers for the trainer / HR cards.
// After a successful Bluetooth connection the device list is hidden so it
// does not clutter the screen; only a compact status line remains.

export function formatConnectedStatus(kind, name) {
  const label = String(name || '').trim() || 'device';
  return `${kind}: ${label} — Connected`;
}

/**
 * @param {{ phase: 'idle'|'scanning'|'pick'|'connected', kind: string, name?: string, deviceCount?: number, hasError?: boolean }} opts
 */
export function bleCardView({ phase, kind, name = '', deviceCount = 0, hasError = false } = {}) {
  const connected = phase === 'connected';
  return {
    listHidden: connected || deviceCount === 0,
    scanHidden: connected,
    hintHidden: connected || (phase === 'idle' && !hasError),
    settingsHidden: connected || !hasError,
    barHidden: !connected,
    statusLine: connected ? formatConnectedStatus(kind, name) : null,
  };
}
