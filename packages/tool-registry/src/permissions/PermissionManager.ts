import { BaseTool, ToolContext } from '../interfaces/BaseTool';
import { AuthenticationError } from '@beamlab/utils';

export class PermissionManager {
  public authorize(tool: BaseTool<any, any>, context: ToolContext): void {
    const requiredPermissions = tool.security.permissions;
    if (requiredPermissions.length === 0) {
      return; // Public tool
    }

    const hasPermission = context.roles.some(role => requiredPermissions.includes(role));
    if (!hasPermission) {
      throw new AuthenticationError(`User lacks required roles to execute ${tool.metadata.id}. Required: ${requiredPermissions.join(', ')}`);
    }
  }
}

export const permissionManager = new PermissionManager();
