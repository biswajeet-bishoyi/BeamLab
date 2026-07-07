import { ISolverSession } from '@beamlab/solver-client';

export class SolverSessionManager {
  private sessions: Map<string, ISolverSession> = new Map();

  public createSession(solverId: string): ISolverSession {
    const session: ISolverSession = {
      id: crypto.randomUUID(),
      solverId,
      status: 'active',
      createdAt: Date.now()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(sessionId: string): ISolverSession | undefined {
    return this.sessions.get(sessionId);
  }

  public closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      this.sessions.set(sessionId, session);
    }
  }
}
