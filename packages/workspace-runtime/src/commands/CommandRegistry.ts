import { WorkspaceEventBus } from '../events/WorkspaceEventBus';

export interface CommandContext {
  selection: string[];
  focus: string | null;
  [key: string]: any;
}

export interface WorkspaceCommand {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  category: 'analysis' | 'design' | 'view' | 'report' | 'export';
  isAvailable: (context: CommandContext) => boolean;
  execute: (context: CommandContext) => Promise<void>;
}

export class CommandRegistry {
  private commands: Map<string, WorkspaceCommand> = new Map();
  private eventBus: WorkspaceEventBus;

  constructor(eventBus: WorkspaceEventBus) {
    this.eventBus = eventBus;
  }

  register(command: WorkspaceCommand) {
    this.commands.set(command.id, command);
  }

  unregister(id: string) {
    this.commands.delete(id);
  }

  getAvailableCommands(context: CommandContext): WorkspaceCommand[] {
    const available: WorkspaceCommand[] = [];
    this.commands.forEach(cmd => {
      if (cmd.isAvailable(context)) {
        available.push(cmd);
      }
    });
    return available;
  }

  async executeCommand(id: string, context: CommandContext): Promise<void> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command ${id} not found`);
    }

    if (!command.isAvailable(context)) {
      throw new Error(`Command ${id} is not currently available`);
    }

    this.eventBus.emit('CommandStarted', { id, context });
    
    try {
      await command.execute(context);
      this.eventBus.emit('CommandCompleted', { id, success: true });
    } catch (error) {
      this.eventBus.emit('CommandCompleted', { id, success: false, error });
      throw error;
    }
  }
}
