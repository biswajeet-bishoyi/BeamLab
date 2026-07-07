export enum SolverEventType {
  SolverRegistered = 'SolverRegistered',
  SolverSelected = 'SolverSelected',
  SolverSessionCreated = 'SolverSessionCreated',
  SolverJobSubmitted = 'SolverJobSubmitted',
  SolverJobStarted = 'SolverJobStarted',
  SolverProgressUpdated = 'SolverProgressUpdated',
  SolverJobCompleted = 'SolverJobCompleted',
  SolverJobFailed = 'SolverJobFailed',
  SolverJobCancelled = 'SolverJobCancelled',
  SolverHealthChanged = 'SolverHealthChanged'
}

export interface SolverEvent {
  id: string;
  type: SolverEventType;
  timestamp: number;
  payload: any;
}
