import { BaseTool, ToolContext } from '../interfaces/BaseTool';
import { logger } from '@beamlab/utils';

export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TIMEOUT';

export interface ApprovalRequest {
  id: string;
  toolId: string;
  payload: any;
  context: ToolContext;
  status: ApprovalState;
  createdAt: string;
}

export class ApprovalManager {
  private requests: Map<string, ApprovalRequest> = new Map();

  public async requestApproval(tool: BaseTool<any, any>, payload: any, context: ToolContext): Promise<boolean> {
    if (!tool.security.requiresApproval) {
      return true; // No approval needed
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const request: ApprovalRequest = {
      id: requestId,
      toolId: tool.metadata.id,
      payload,
      context,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.requests.set(requestId, request);
    logger.info({ requestId, toolId: tool.metadata.id }, 'Approval requested');

    // In a real system, this would suspend execution and wait for an out-of-band response via WebSockets/Polling.
    // For this scaffold, we simulate an immediate approval if they are an Admin.
    if (context.roles.includes('Admin')) {
      this.resolveApproval(requestId, 'APPROVED');
      return true;
    }

    throw new Error('APPROVAL_REQUIRED: Execution suspended pending approval.');
  }

  public resolveApproval(requestId: string, status: 'APPROVED' | 'REJECTED'): void {
    const request = this.requests.get(requestId);
    if (!request) throw new Error('Approval request not found');

    request.status = status;
    logger.info({ requestId, status }, 'Approval resolved');
  }
}

export const approvalManager = new ApprovalManager();
