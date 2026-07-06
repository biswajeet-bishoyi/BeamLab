export interface ISkill {
  id: string;
  name: string;
  version: string;
  execute(args: any, context?: any): Promise<any>;
}
