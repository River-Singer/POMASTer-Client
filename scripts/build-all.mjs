/**
 * Build all workspace packages in dependency order (pnpm -r is topological):
 * client-contract (tsc) → workbench-model (tsc) → dsh-bundle (esbuild).
 */
import { spawnSync } from 'node:child_process'

const r = spawnSync('pnpm', ['-r', '--workspace-concurrency=1', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (r.status !== 0) {
  console.error('build-all: workspace build failed')
  process.exit(r.status ?? 1)
}
