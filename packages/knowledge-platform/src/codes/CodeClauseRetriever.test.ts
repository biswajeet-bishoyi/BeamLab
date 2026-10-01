import { describe, it, expect } from 'vitest';
import { CodeClauseRetriever } from './CodeClauseRetriever';

describe('Sprint B6.1 — Codified Design Knowledge Engine & Semantic Clause Indexing', () => {
  it('loads and indexes clauses across Eurocode 3, AISC 360, and IS 800', () => {
    const ec3 = CodeClauseRetriever.getClausesByStandard('EUROCODE_3');
    const aisc = CodeClauseRetriever.getClausesByStandard('AISC_360_16');
    const is800 = CodeClauseRetriever.getClausesByStandard('IS_800_2007');

    expect(ec3.length).toBeGreaterThanOrEqual(7);
    expect(aisc.length).toBeGreaterThanOrEqual(5);
    expect(is800.length).toBeGreaterThanOrEqual(5);
  });

  it('retrieves specific clauses by ID with exact LaTeX equations and variables', () => {
    const clause = CodeClauseRetriever.getClauseById('EC3_6_2_5');
    expect(clause).toBeDefined();
    expect(clause?.standard).toBe('EUROCODE_3');
    expect(clause?.sectionNumber).toBe('6.2.5');
    expect(clause?.equations.length).toBeGreaterThan(0);
    expect(clause?.equations[0]?.latex).toContain('M_{c,Rd}');
    expect(clause?.safetyFactors['gamma_M0']).toBe(1.0);
  });

  it('filters applicable clauses by structural action type', () => {
    const flexureClauses = CodeClauseRetriever.getApplicableClauses(['MAJOR_FLEXURE']);
    expect(flexureClauses.length).toBeGreaterThanOrEqual(3);

    const standards = new Set(flexureClauses.map((c) => c.standard));
    expect(standards.has('EUROCODE_3')).toBe(true);
    expect(standards.has('AISC_360_16')).toBe(true);
    expect(standards.has('IS_800_2007')).toBe(true);
  });

  it('performs semantic free-text search matching engineering terminology and equations', () => {
    const ltbResults = CodeClauseRetriever.searchClauses('lateral-torsional buckling');
    expect(ltbResults.length).toBeGreaterThan(0);
    expect(ltbResults.some((c) => c.clauseId === 'EC3_6_3_2')).toBe(true);

    const pDeltaResults = CodeClauseRetriever.searchClauses('P-M interaction');
    expect(pDeltaResults.length).toBeGreaterThan(0);
    expect(pDeltaResults.some((c) => c.clauseId === 'AISC_H1')).toBe(true);
  });

  it('accurately maps equivalent clauses across Eurocode 3, AISC 360, and IS 800', () => {
    const equivalents = CodeClauseRetriever.getEquivalentClauses('EC3_6_2_5');

    expect(equivalents.EUROCODE_3?.clauseId).toBe('EC3_6_2_5');
    expect(equivalents.AISC_360_16?.sectionNumber).toBe('F2');
    expect(equivalents.IS_800_2007?.sectionNumber).toBe('8.2');
  });
});
