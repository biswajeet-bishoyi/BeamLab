import { UndoPayload } from '../interfaces/BaseTool';
import { logger } from '@beamlab/utils';

export class UndoManager {
  private undoStack: UndoPayload[] = [];
  private redoStack: UndoPayload[] = [];

  public push(payload: UndoPayload): void {
    this.undoStack.push(payload);
    // Clear redo stack on new action
    this.redoStack = [];
    logger.debug({ toolId: payload.toolId }, 'Pushed to undo stack');
  }

  public popUndo(): UndoPayload | undefined {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
      logger.debug({ toolId: action.toolId }, 'Popped from undo stack');
    }
    return action;
  }
}

export const undoManager = new UndoManager();
