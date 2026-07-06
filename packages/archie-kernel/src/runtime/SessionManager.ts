import { SessionConfig } from '../api/IArchieKernel';

export class SessionManager {
  private sessions: Map<string, SessionConfig> = new Map();

  async createSession(config: SessionConfig): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, config);
    return sessionId;
  }

  getSession(sessionId: string): SessionConfig | undefined {
    return this.sessions.get(sessionId);
  }

  async endSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }
}
