/**
 * Interface for the future Engineering Workflow Coordinator.
 * Orchestrates multi-agent workflows (Analysis -> Design -> Optimization -> Compliance -> Reporting).
 */
export interface IEngineeringWorkflowCoordinator {
  orchestrate(workflowRequest: any): Promise<void>;
  onAnalysisCompleted(event: any): Promise<void>;
  onDesignCompleted(event: any): Promise<void>;
  onOptimizationCompleted(event: any): Promise<void>;
  onComplianceCompleted(event: any): Promise<void>;
}
