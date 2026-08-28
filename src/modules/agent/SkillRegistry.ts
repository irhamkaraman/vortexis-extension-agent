import { AgentSkillPlugin } from '../../core/types/plugin';

// Auto-discover all skills in src/plugins/skills
const skillModules = import.meta.glob('../../plugins/skills/*.ts', { eager: true });

export class SkillRegistry {
  private static skills: Map<string, AgentSkillPlugin> = new Map();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    for (const path in skillModules) {
      const mod = skillModules[path] as any;
      const skill: AgentSkillPlugin =
        mod.default || Object.values(mod).find((val: any) => val && val.name && val.instructions);
      if (skill && skill.name) {
        this.skills.set(skill.name, skill);
      }
    }

    this.initialized = true;
    console.log(`[SkillRegistry] Initialized with ${this.skills.size} skills.`);
  }

  public static getAllSkills(): AgentSkillPlugin[] {
    this.initialize();
    return Array.from(this.skills.values());
  }

  public static getSkill(name: string): AgentSkillPlugin | undefined {
    this.initialize();
    return this.skills.get(name);
  }

  public static formatSkillsForPrompt(): string {
    this.initialize();
    if (this.skills.size === 0) return '';
    return Array.from(this.skills.values())
      .map((skill) => `- **${skill.name}**: ${skill.description}\n  ${skill.instructions}`)
      .join('\n\n');
  }
}
