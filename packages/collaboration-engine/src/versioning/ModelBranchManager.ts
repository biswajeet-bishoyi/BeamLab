/**
 * ModelBranchManager.ts
 *
 * Manages immutable commit graphs, named branches, tags, and commit histories
 * for structural engineering models.
 */

import {
  EngineeringModelSnapshot,
  createEmptySnapshot,
  cloneSnapshot,
  computeSnapshotHash,
} from './ModelSnapshot';

export interface CommitAuthor {
  id: string;
  name: string;
  email?: string;
}

export interface EngineeringCommit {
  commitId: string;
  branch: string;
  parentCommitIds: string[];
  message: string;
  author: CommitAuthor;
  timestamp: number;
  snapshot: EngineeringModelSnapshot;
  snapshotHash: string;
  tags: string[];
}

export interface ModelBranch {
  name: string;
  headCommitId: string;
  createdAt: number;
  updatedAt: number;
}

export interface BranchDivergence {
  ahead: number;
  behind: number;
  commonAncestorId: string | null;
}

export class ModelBranchManager {
  private currentBranchName: string;
  private readonly branches: Map<string, ModelBranch>;
  private readonly commits: Map<string, EngineeringCommit>;
  private readonly tags: Map<string, string>; // tagName -> commitId
  private readonly defaultAuthor: CommitAuthor;
  private commitCounter: number;

  constructor(
    initialSnapshot?: EngineeringModelSnapshot,
    defaultAuthor: CommitAuthor = { id: 'engineer-1', name: 'Lead Engineer' }
  ) {
    this.defaultAuthor = defaultAuthor;
    this.branches = new Map();
    this.commits = new Map();
    this.tags = new Map();
    this.commitCounter = 0;

    const snapshot = initialSnapshot ? cloneSnapshot(initialSnapshot) : createEmptySnapshot('initial_model');
    const rootCommitId = this._generateCommitId();
    const rootCommit: EngineeringCommit = {
      commitId: rootCommitId,
      branch: 'main',
      parentCommitIds: [],
      message: 'Initial model baseline',
      author: defaultAuthor,
      timestamp: Date.now(),
      snapshot,
      snapshotHash: computeSnapshotHash(snapshot),
      tags: ['root'],
    };

    this.commits.set(rootCommitId, rootCommit);
    this.branches.set('main', {
      name: 'main',
      headCommitId: rootCommitId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    this.currentBranchName = 'main';
  }

  // ─── Branch Management ─────────────────────────────────────────────────────

  public getCurrentBranch(): string {
    return this.currentBranchName;
  }

  public getHeadCommit(): EngineeringCommit {
    const branch = this.branches.get(this.currentBranchName);
    if (!branch) {
      throw new Error(`Active branch '${this.currentBranchName}' not found`);
    }
    const commit = this.commits.get(branch.headCommitId);
    if (!commit) {
      throw new Error(`Head commit '${branch.headCommitId}' not found for branch '${this.currentBranchName}'`);
    }
    return commit;
  }

  public getHeadSnapshot(): EngineeringModelSnapshot {
    return cloneSnapshot(this.getHeadCommit().snapshot);
  }

  /**
   * Creates a new branch pointing to the given commit or current branch HEAD.
   */
  public createBranch(name: string, startFromCommitId?: string): ModelBranch {
    if (this.branches.has(name)) {
      throw new Error(`Branch '${name}' already exists.`);
    }

    const targetCommitId = startFromCommitId ?? this.getHeadCommit().commitId;
    if (!this.commits.has(targetCommitId)) {
      throw new Error(`Commit '${targetCommitId}' does not exist.`);
    }

    const now = Date.now();
    const branch: ModelBranch = {
      name,
      headCommitId: targetCommitId,
      createdAt: now,
      updatedAt: now,
    };

    this.branches.set(name, branch);
    return branch;
  }

  /**
   * Switches the active working branch.
   */
  public checkout(name: string): ModelBranch {
    const branch = this.branches.get(name);
    if (!branch) {
      throw new Error(`Branch '${name}' not found.`);
    }
    this.currentBranchName = name;
    return branch;
  }

  /**
   * Deletes an existing branch (cannot delete active branch or 'main').
   */
  public deleteBranch(name: string): boolean {
    if (name === 'main') {
      throw new Error("Cannot delete protected baseline branch 'main'.");
    }
    if (name === this.currentBranchName) {
      throw new Error(`Cannot delete currently active branch '${name}'. Checkout another branch first.`);
    }
    return this.branches.delete(name);
  }

  public listBranches(): ModelBranch[] {
    return Array.from(this.branches.values());
  }

  public getBranch(name: string): ModelBranch | undefined {
    return this.branches.get(name);
  }

  // ─── Commits & Tags ────────────────────────────────────────────────────────

  /**
   * Records an immutable snapshot as a new commit on the active branch.
   */
  public commit(
    message: string,
    snapshot: EngineeringModelSnapshot,
    author?: CommitAuthor
  ): EngineeringCommit {
    const activeBranch = this.branches.get(this.currentBranchName);
    if (!activeBranch) {
      throw new Error(`Active branch '${this.currentBranchName}' not found`);
    }

    const commitId = this._generateCommitId();
    const parentId = activeBranch.headCommitId;
    const cloned = cloneSnapshot(snapshot);

    const newCommit: EngineeringCommit = {
      commitId,
      branch: this.currentBranchName,
      parentCommitIds: [parentId],
      message,
      author: author ?? this.defaultAuthor,
      timestamp: Date.now(),
      snapshot: cloned,
      snapshotHash: computeSnapshotHash(cloned),
      tags: [],
    };

    this.commits.set(commitId, newCommit);
    activeBranch.headCommitId = commitId;
    activeBranch.updatedAt = Date.now();

    return newCommit;
  }

  /**
   * Records a merge commit with dual parentage.
   */
  public createMergeCommit(
    message: string,
    snapshot: EngineeringModelSnapshot,
    sourceCommitId: string,
    targetCommitId: string,
    author?: CommitAuthor
  ): EngineeringCommit {
    const activeBranch = this.branches.get(this.currentBranchName);
    if (!activeBranch) {
      throw new Error(`Active branch '${this.currentBranchName}' not found`);
    }

    const commitId = this._generateCommitId();
    const cloned = cloneSnapshot(snapshot);

    const mergeCommit: EngineeringCommit = {
      commitId,
      branch: this.currentBranchName,
      parentCommitIds: [targetCommitId, sourceCommitId],
      message,
      author: author ?? this.defaultAuthor,
      timestamp: Date.now(),
      snapshot: cloned,
      snapshotHash: computeSnapshotHash(cloned),
      tags: [],
    };

    this.commits.set(commitId, mergeCommit);
    activeBranch.headCommitId = commitId;
    activeBranch.updatedAt = Date.now();

    return mergeCommit;
  }

  /**
   * Creates a named tag referencing a commit.
   */
  public createTag(tagName: string, commitId?: string): void {
    const targetCommit = commitId ?? this.getHeadCommit().commitId;
    const commit = this.commits.get(targetCommit);
    if (!commit) {
      throw new Error(`Commit '${targetCommit}' not found.`);
    }

    this.tags.set(tagName, targetCommit);
    if (!commit.tags.includes(tagName)) {
      commit.tags.push(tagName);
    }
  }

  public listTags(): Array<{ tag: string; commitId: string }> {
    return Array.from(this.tags.entries()).map(([tag, commitId]) => ({ tag, commitId }));
  }

  public getCommit(commitId: string): EngineeringCommit | undefined {
    return this.commits.get(commitId);
  }

  // ─── History & Ancestry ────────────────────────────────────────────────────

  /**
   * Returns commit history in reverse chronological order (newest first).
   */
  public getHistory(branchName?: string, maxCount: number = 50): EngineeringCommit[] {
    const targetBranchName = branchName ?? this.currentBranchName;
    const branch = this.branches.get(targetBranchName);
    if (!branch) return [];

    const history: EngineeringCommit[] = [];
    const queue: string[] = [branch.headCommitId];
    const visited = new Set<string>();

    while (queue.length > 0 && history.length < maxCount) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const commit = this.commits.get(currentId);
      if (!commit) continue;

      history.push(commit);
      for (const parentId of commit.parentCommitIds) {
        if (!visited.has(parentId)) {
          queue.push(parentId);
        }
      }
    }

    return history;
  }

  /**
   * Finds the Lowest Common Ancestor (LCA) between two branches using BFS ancestry traversal.
   */
  public findCommonAncestor(branchA: string, branchB: string): string | null {
    const bA = this.branches.get(branchA);
    const bB = this.branches.get(branchB);
    if (!bA || !bB) return null;

    if (bA.headCommitId === bB.headCommitId) {
      return bA.headCommitId;
    }

    const ancestorsA = this._getAncestorsSet(bA.headCommitId);

    // Traverse ancestors of B; the first one also in A is the LCA
    const queue = [bB.headCommitId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      if (ancestorsA.has(curr)) {
        return curr;
      }

      const commit = this.commits.get(curr);
      if (commit) {
        for (const p of commit.parentCommitIds) {
          queue.push(p);
        }
      }
    }

    return null;
  }

  /**
   * Computes how many commits source is ahead and behind target.
   */
  public getBranchDivergence(sourceBranch: string, targetBranch: string): BranchDivergence {
    const commonAncestorId = this.findCommonAncestor(sourceBranch, targetBranch);
    if (!commonAncestorId) {
      return { ahead: 0, behind: 0, commonAncestorId: null };
    }

    const sourceHead = this.branches.get(sourceBranch)!.headCommitId;
    const targetHead = this.branches.get(targetBranch)!.headCommitId;

    const ahead = this._countCommitsBetween(sourceHead, commonAncestorId);
    const behind = this._countCommitsBetween(targetHead, commonAncestorId);

    return { ahead, behind, commonAncestorId };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private _generateCommitId(): string {
    this.commitCounter++;
    const randomHex = Math.random().toString(16).substring(2, 8);
    return `c_${Date.now().toString(36)}_${this.commitCounter}_${randomHex}`;
  }

  private _getAncestorsSet(startCommitId: string): Set<string> {
    const ancestors = new Set<string>();
    const queue = [startCommitId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (ancestors.has(curr)) continue;
      ancestors.add(curr);

      const commit = this.commits.get(curr);
      if (commit) {
        for (const p of commit.parentCommitIds) {
          queue.push(p);
        }
      }
    }

    return ancestors;
  }

  private _countCommitsBetween(fromCommitId: string, toAncestorId: string): number {
    if (fromCommitId === toAncestorId) return 0;
    let count = 0;
    const queue = [fromCommitId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === toAncestorId || visited.has(curr)) continue;
      visited.add(curr);
      count++;

      const commit = this.commits.get(curr);
      if (commit) {
        for (const p of commit.parentCommitIds) {
          if (!visited.has(p) && p !== toAncestorId) {
            queue.push(p);
          }
        }
      }
    }

    return count;
  }
}
