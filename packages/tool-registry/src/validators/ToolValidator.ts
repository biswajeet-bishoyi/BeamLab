import { BaseTool, ToolContext, ValidationResult } from '../interfaces/BaseTool';
import { ValidationError } from '@beamlab/utils';

export class ToolValidator {
  public async validate<I, O>(tool: BaseTool<I, O>, input: any, context: ToolContext): Promise<I> {
    const result = tool.schemas.input.safeParse(input);
    if (!result.success) {
      throw new ValidationError(`Schema validation failed: ${result.error.message}`);
    }

    const parsedInput = result.data;

    if (tool.validate) {
      const customValidation: ValidationResult = await tool.validate(parsedInput, context);
      if (!customValidation.valid) {
        throw new ValidationError(`Engineering validation failed: ${customValidation.errors?.join(', ')}`);
      }
    }

    return parsedInput;
  }
}

export const validator = new ToolValidator();
