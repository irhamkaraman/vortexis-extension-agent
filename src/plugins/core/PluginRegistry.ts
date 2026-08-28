import { AgentSkillPlugin, AgentToolPlugin } from '../../core/types/plugin';

// Auto-discover all tool plugins in src/plugins/tools
const toolModules = import.meta.glob('../tools/*.ts', { eager: true });
// Auto-discover all skill plugins in src/plugins/skills
const skillModules = import.meta.glob('../skills/*.ts', { eager: true });

export class PluginRegistry {
  private static tools: Map<string, AgentToolPlugin> = new Map();
  private static skills: Map<string, AgentSkillPlugin> = new Map();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    // Load tools
    for (const path in toolModules) {
      const mod = toolModules[path] as any;
      const plugin: AgentToolPlugin = mod.default || Object.values(mod).find((val: any) => val && val.definition && val.handler);
      if (plugin && plugin.definition?.name) {
        this.tools.set(plugin.definition.name, plugin);
      }
    }

    // Load skills
    for (const path in skillModules) {
      const mod = skillModules[path] as any;
      const skill: AgentSkillPlugin = mod.default || Object.values(mod).find((val: any) => val && val.name && val.instructions);
      if (skill && skill.name) {
        this.skills.set(skill.name, skill);
      }
    }

    this.initialized = true;
    console.log(`[PluginRegistry] Loaded ${this.tools.size} tool plugins and ${this.skills.size} skill plugins.`);
  }

  public static getToolPlugins(): AgentToolPlugin[] {
    this.initialize();
    return Array.from(this.tools.values());
  }

  public static getSkillPlugins(): AgentSkillPlugin[] {
    this.initialize();
    return Array.from(this.skills.values());
  }

  public static getTool(name: string): AgentToolPlugin | undefined {
    this.initialize();
    return this.tools.get(name);
  }

  public static formatSkillsForPrompt(): string {
    this.initialize();
    if (this.skills.size === 0) return '';
    return Array.from(this.skills.values())
      .map((skill) => `### Skill: ${skill.name} (${skill.description})\n${skill.instructions}`)
      .join('\n\n');
  }

  public static formatToolPluginsForPrompt(): string {
    this.initialize();
    if (this.tools.size === 0) return '';
    return Array.from(this.tools.values())
      .map((tool) => `"${tool.definition.name}": ${tool.definition.description} Parameters: ${JSON.stringify(tool.definition.parameters || {})}`)
      .join('\n');
  }
}
