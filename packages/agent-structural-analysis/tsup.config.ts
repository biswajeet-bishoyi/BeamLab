import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@beamstudio/agent-framework',
    '@beamstudio/memory-client',
    '@beamstudio/workspace-runtime',
    '@beamstudio/knowledge-platform',
    '@beamstudio/policy-engine',
    '@beamstudio/resource-manager'
  ]
});
