/**
 * BeamLab Sprint B6.1 — Codified Clause Retrieval Engine
 * High-performance semantic and parameterized indexing of international design clauses.
 */

import type { CodeClause, DesignStandard, LimitState, StructuralActionType } from './DesignCodeClause';
import { EUROCODE_3_CLAUSES } from './eurocode/Eurocode3KnowledgeBase';
import { AISC_360_CLAUSES } from './aisc/AISC360KnowledgeBase';
import { IS_800_CLAUSES } from './is800/IS800KnowledgeBase';

export interface ClauseSearchOptions {
  standard?: DesignStandard;
  limitState?: LimitState;
  action?: StructuralActionType;
}

export class CodeClauseRetriever {
  private static allClauses: CodeClause[] = [
    ...EUROCODE_3_CLAUSES,
    ...AISC_360_CLAUSES,
    ...IS_800_CLAUSES,
  ];

  private static clauseMap = new Map<string, CodeClause>(
    CodeClauseRetriever.allClauses.map((c) => [c.clauseId, c])
  );

  /**
   * Retrieves a single clause by its canonical ID.
   */
  public static getClauseById(clauseId: string): CodeClause | undefined {
    return this.clauseMap.get(clauseId);
  }

  /**
   * Retrieves all clauses registered under a given design standard.
   */
  public static getClausesByStandard(standard: DesignStandard): CodeClause[] {
    return this.allClauses.filter((c) => c.standard === standard);
  }

  /**
   * Retrieves clauses governing specific structural action states (e.g. Bending, Buckling, Combined P-M).
   */
  public static getApplicableClauses(
    actions: StructuralActionType[],
    standard?: DesignStandard
  ): CodeClause[] {
    return this.allClauses.filter((c) => {
      if (standard && c.standard !== standard) return false;
      return actions.some((act) => c.applicableActions.includes(act));
    });
  }

  /**
   * Semantic search matching free-text search queries against titles, clauses, formulas, and keywords.
   */
  public static searchClauses(query: string, options?: ClauseSearchOptions): CodeClause[] {
    const rawTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (rawTokens.length === 0) {
      return this.allClauses.filter((c) => {
        if (options?.standard && c.standard !== options.standard) return false;
        if (options?.limitState && c.limitState !== options.limitState) return false;
        if (options?.action && !c.applicableActions.includes(options.action)) return false;
        return true;
      });
    }

    return this.allClauses
      .filter((clause) => {
        if (options?.standard && clause.standard !== options.standard) return false;
        if (options?.limitState && clause.limitState !== options.limitState) return false;
        if (options?.action && !clause.applicableActions.includes(options.action)) return false;

        const corpus = [
          clause.clauseId,
          clause.sectionNumber,
          clause.title,
          clause.description,
          ...clause.keywords,
          ...clause.equations.map((e) => `${e.latex} ${e.description}`),
        ]
          .join(' ')
          .toLowerCase();

        return rawTokens.some((tok) => corpus.includes(tok));
      })
      .sort((a, b) => {
        // Boost matches on title or section number
        const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
        const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
        return bTitleMatch - aTitleMatch;
      });
  }

  /**
   * Maps a clause in one standard to its direct equivalent in another standard
   * (e.g. Eurocode 3 §6.2.5 flexure -> AISC 360-16 Chapter F2 & IS 800 Section 8.2).
   */
  public static getEquivalentClauses(clauseId: string): Record<DesignStandard, CodeClause | null> {
    const source = this.getClauseById(clauseId);
    const result: Record<DesignStandard, CodeClause | null> = {
      EUROCODE_3: null,
      EUROCODE_8: null,
      AISC_360_16: null,
      ASCE_7_16: null,
      IS_800_2007: null,
    };

    if (!source) return result;
    result[source.standard] = source;

    for (const targetStd of ['EUROCODE_3', 'AISC_360_16', 'IS_800_2007'] as DesignStandard[]) {
      if (targetStd === source.standard) continue;
      const candidates = this.allClauses.filter(
        (c) =>
          c.standard === targetStd &&
          c.limitState === source.limitState &&
          source.applicableActions.some((a) => c.applicableActions.includes(a))
      );
      if (candidates.length > 0) {
        result[targetStd] = candidates[0] || null;
      }
    }

    return result;
  }
}
