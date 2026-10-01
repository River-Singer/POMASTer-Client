/**
 * Bundle host-half placeholder (PR-1). The host service (cordis Service +
 * schemastery Config, service key `pomasterHost`) is deferred to M1: the
 * @deepseek-ai/* peer packages are not individually published to npm, so the
 * spike ships a zero-peer self-contained bundle instead (see
 * src/compatibility/COMPATIBILITY-MATRIX.md — deferred architecture note).
 * The '.' entry exists so the bundle's main export resolves; it contributes
 * no host rows (cordis.patch.yml references only ./tools).
 */
export const name = 'pomaster-host'

export function apply(): void {}
