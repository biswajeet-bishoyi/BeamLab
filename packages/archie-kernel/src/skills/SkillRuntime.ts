import { ISkill } from '../interfaces/ISkill';

export class SkillRuntime {
  private loadedSkills: Map<string, ISkill> = new Map();

  registerSkill(skill: ISkill): void {
    this.loadedSkills.set(skill.id, skill);
  }

  async invokeSkill(skillId: string, args: any, context?: any): Promise<any> {
    const skill = this.loadedSkills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} is not loaded or registered.`);
    }
    return skill.execute(args, context);
  }
}
