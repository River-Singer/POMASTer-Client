/**
 * Package root placeholder (host half): the ui-* client row points at the
 * package root so the browser roster scan finds the dsh.client manifest, and
 * the host-side import of that same row must stay harmless — the real
 * controller lives at './host' with its own patch row and config.
 * See COMPATIBILITY-MATRIX.md (dual-half self-contained bundle layout).
 */
export const name = 'pomaster-root'

export function apply(): void {}
