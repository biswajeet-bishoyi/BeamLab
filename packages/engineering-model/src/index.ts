/**
 * @beamlab/engineering-model
 *
 * Canonical Engineering Model — the single source of truth for every
 * engineering object in BeamLab.
 *
 * This package is framework-agnostic and may never depend on:
 *   - React / Vue / any UI framework
 *   - Three.js or any rendering library
 *   - Solver implementations
 *   - Engineering agents
 *   - Runtime Gateway
 *   - Developer Studio
 */

// ── Core ─────────────────────────────────────────────────────────────────────
export * from './core';

// ── Domain entities ────────────────────────────────────────────────────────
export * from './geometry';
export * from './properties';
export * from './boundary';
export * from './loading';
export * from './results';

// ── Infrastructure ────────────────────────────────────────────────────────
export * from './registries';
export * from './validation';
export * from './events';

// ── Central model ─────────────────────────────────────────────────────────
export * from './model';
