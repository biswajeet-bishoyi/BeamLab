/**
 * Stable, persistent identity for every engineering object.
 * Never changes once assigned. Never derived from position or order.
 */
export interface ObjectIdentity {
  /** Stable UUID v4 — never changes */
  readonly id: string;
  /** Human-readable name within its parent scope */
  name: string;
  /** Optional description */
  description?: string;
  /** Monotonically incrementing integer: starts at 1, incremented on every mutation */
  readonly version: number;
  /** Revision label (e.g., "A", "B", "Rev3") for human consumption */
  revision?: string;
  /** ISO-8601 creation timestamp */
  readonly createdAt: string;
  /** ISO-8601 last modification timestamp */
  readonly modifiedAt: string;
  /** Future: author/user id of creator */
  readonly createdBy?: string;
  /** Future: author/user id of last modifier */
  readonly modifiedBy?: string;
}
