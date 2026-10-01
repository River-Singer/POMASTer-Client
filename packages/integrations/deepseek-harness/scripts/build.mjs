/**
 * Bundle build (esbuild): three artifacts, mirroring the DSH repo contracts.
 *
 * 1. dist/index.js  — host half, ESM/node, @deepseek-ai peers stay external
 *                     (resolved from the harness runtime), workbench-model +
 *                     client-contract are INLINED (self-contained package).
 * 2. dist/tools.js  — tool registration, same externals.
 * 3. dist/client.js — browser half, factory-form CJS with the exact
 *                     window.__ModuleLoader__ banner/intro/footer contract
 *                     reproduced from packages/client/tsdown.client.ts
 *                     (clientConfig, lines ~618-625):
 *                       banner: window.__ModuleLoader__.load({ id, factory: (require) => {
 *                       intro:  var module = { exports: {} }; var exports = module.exports;
 *                       footer: return module.exports; } });
 *                     externals = PLATFORM_MODULES baseline only (react);
 *                     everything else inlines. Zero @deepseek-ai imports —
 *                     purity gate satisfied by construction.
 */
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => join(packageRoot, 'src', p)
const out = (p) => join(packageRoot, 'dist', p)

// Type gate first (esbuild strips types without checking — the missing-import
// class of bug only surfaces at runtime otherwise).
const tsc = join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc')
const check = spawnSync(process.execPath, [tsc, '-p', join(packageRoot, 'tsconfig.json')], { stdio: 'inherit' })
if (check.status !== 0) {
  console.error('bundle build: type gate failed')
  process.exit(1)
}

const nodeExternal = ['@deepseek-ai/cordis', '@deepseek-ai/schemastery', '@deepseek-ai/dsh-tools']

const BUNDLE_ID = '@pomaster/dsh-bundle'
const clientBanner = `window.__ModuleLoader__.load({ id: ${JSON.stringify(BUNDLE_ID)}, factory: (require) => {`
const clientIntro = 'var module = { exports: {} }; var exports = module.exports;'
const clientFooter = 'return module.exports; } });'

await build({
  entryPoints: [src('index.ts')],
  outfile: out('index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: nodeExternal,
  sourcemap: true,
  logLevel: 'info',
})

await build({
  entryPoints: [src('host/index.ts')],
  outfile: out('host.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: nodeExternal,
  sourcemap: true,
  logLevel: 'info',
})

await build({
  entryPoints: [src('tools/index.ts')],
  outfile: out('tools.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: nodeExternal,
  sourcemap: true,
  logLevel: 'info',
})

await build({
  entryPoints: [src('client/index.tsx')],
  outfile: out('client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120'],
  external: ['react', 'react-dom'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  banner: { js: `${clientIntro}\n${clientBanner}` },
  footer: { js: clientFooter },
  sourcemap: true,
  logLevel: 'info',
})
