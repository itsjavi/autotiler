import { autotiler13 } from "./autotiler13.ts";
import { rpgmakerA2 } from "./rpgmaker-a2.ts";
import type { Template, TemplateId } from "./types.ts";

export type { QuarterRef, Template, TemplateId, TemplateSlot } from "./types.ts";
export { autotiler13, rpgmakerA2 };

export const TEMPLATES: readonly Template[] = [autotiler13, rpgmakerA2];

export function getTemplate(id: TemplateId): Template {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`unknown template ${id}`);
  return template;
}
