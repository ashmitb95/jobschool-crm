import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { TemplateVariables } from "@/types";

const TEMPLATES_DIR = join(process.cwd(), "src/lib/email/templates");

// In-memory cache: filename → HTML string
const cache = new Map<string, string>();

export function readTemplate(filename: string): string {
  const cached = cache.get(filename);
  if (cached) return cached;

  const filePath = join(TEMPLATES_DIR, filename);
  const html = readFileSync(filePath, "utf-8");
  cache.set(filename, html);
  return html;
}

export function renderEmail(filename: string, variables: TemplateVariables): string {
  const html = readTemplate(filename);
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

export function listAvailableTemplates(): string[] {
  try {
    return readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".html"));
  } catch {
    return [];
  }
}

export function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) || [];
  const unique = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  return unique;
}

export function clearCache() {
  cache.clear();
}
