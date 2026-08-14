/**
 * Pipeline template store — reusable, named pipeline configurations.
 *
 * Storage follows the same file-based pattern as custom agents
 * (server/data/pipelineTemplates.json), and the stored `pipeline` object is
 * EXACTLY the payload shape accepted by POST /api/pipeline/run:
 *
 *   {
 *     templateId: "default-rwe" | undefined,   // preserves built-in loop config
 *     agentIds:   ["custom-market-analyst", ...],
 *     dependencies: { "<agentId>": ["<agentId>", ...], ... },  // [] = independent
 *     agentConfigs: [ { id, type, name, role, personality, systemPrompt,
 *                       description, tools, requires, produces, createdAt } ]
 *   }
 *
 * Because the stored pipeline is the runnable-pipeline request itself, loading
 * a template means handing `template.pipeline` straight to the EXISTING
 * buildRunnablePipeline() + runPipeline() execution path — no second executor.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { validatePipelineRequest } from "../utils/validator.js";
import { getPipelineTemplates } from "./agentStore.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(directory, "..");
const dataDirectory = path.join(serverDirectory, "data");
const templatesPath = path.join(dataDirectory, "pipelineTemplates.json");

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

async function ensureDataDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

/**
 * Read templates. A missing file is an empty library; a corrupted file is
 * degraded to an empty library with a warning instead of crashing the app.
 */
async function readTemplates() {
  try {
    const raw = await fs.readFile(templatesPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (template) => template && typeof template === "object" && template.templateId
    );
  } catch (error) {
    if (error.code === "ENOENT") return [];
    if (error instanceof SyntaxError) {
      console.warn(
        "[templates] pipelineTemplates.json is corrupted — starting with an empty template library."
      );
      return [];
    }
    throw error;
  }
}

async function writeTemplates(templates) {
  await ensureDataDirectory();
  await fs.writeFile(templatesPath, JSON.stringify(templates, null, 2));
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "pipeline";
}

/**
 * Validate and normalize a template payload.
 * Reuses the existing pipeline request validation so a saved template is
 * guaranteed to be a pipeline the existing executor can run.
 */
function normalizeTemplatePayload(payload = {}) {
  const name = cleanText(payload.name);
  const description = cleanText(payload.description);

  if (name.length < 2) {
    throw new Error("Template name must be at least 2 characters long.");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Template name must be less than ${MAX_NAME_LENGTH} characters long.`);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Template description must be less than ${MAX_DESCRIPTION_LENGTH} characters long.`
    );
  }

  // Same validation the run endpoint applies (agent id format, 1–12 agents,
  // dependency reference format, agentConfigs normalization, templateId).
  const pipeline = validatePipelineRequest({ pipeline: payload.pipeline });
  if (!pipeline) {
    throw new Error(
      "Template must include a pipeline configuration with at least one agent."
    );
  }

  // An unknown BUILT-IN template id would silently change behavior at run
  // time — reject it at save time instead (corrupted template guard).
  if (pipeline.templateId) {
    const known = getPipelineTemplates().some(
      (template) => template.id === pipeline.templateId
    );
    if (!known) {
      throw new Error(`Unknown pipeline template id: ${pipeline.templateId}`);
    }
  }

  return { name, description, pipeline };
}

/**
 * Create a named template from a complete pipeline configuration.
 * Duplicate names are allowed — each template has its own unique templateId.
 */
export async function createTemplate(payload = {}) {
  const { name, description, pipeline } = normalizeTemplatePayload(payload);
  const now = new Date().toISOString();

  const template = {
    templateId: `tpl-${slugify(name)}-${randomUUID().slice(0, 8)}`,
    name,
    description,
    pipeline,
    createdAt: now,
    updatedAt: now
  };

  const templates = await readTemplates();
  templates.push(template);
  await writeTemplates(templates);
  return template;
}

/** Newest-updated first. */
export async function getTemplates() {
  const templates = await readTemplates();
  return templates.sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

export async function getTemplateById(templateId) {
  const id = cleanText(templateId);
  if (!id) return null;
  const templates = await readTemplates();
  return templates.find((template) => template.templateId === id) || null;
}

/** Update an existing template in place (keeps templateId + createdAt). */
export async function updateTemplate(templateId, payload = {}) {
  const id = cleanText(templateId);
  if (!id) {
    throw new Error("Template id is required.");
  }

  const templates = await readTemplates();
  const index = templates.findIndex((template) => template.templateId === id);
  if (index < 0) return null;

  const { name, description, pipeline } = normalizeTemplatePayload(payload);
  const existing = templates[index];
  const updated = {
    templateId: existing.templateId,
    name,
    description,
    pipeline,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  templates[index] = updated;
  await writeTemplates(templates);
  return updated;
}

/** Deleting a template that does not exist is a no-op (never an error). */
export async function deleteTemplate(templateId) {
  const id = cleanText(templateId);
  if (!id) {
    throw new Error("Template id is required.");
  }

  const templates = await readTemplates();
  const nextTemplates = templates.filter((template) => template.templateId !== id);
  const deleted = nextTemplates.length !== templates.length;

  if (deleted) {
    await writeTemplates(nextTemplates);
  }

  return { deleted, templateId: id };
}
