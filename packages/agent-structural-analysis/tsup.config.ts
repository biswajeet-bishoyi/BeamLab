import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@beamlab/agent-framework',
    '@beamlab/memory-client',
    '@beamlab/workspace-runtime',
    '@beamlab/knowledge-platform',
    '@beamlab/policy-engine',
    '@beamlab/resource-manager'
  ]
});
