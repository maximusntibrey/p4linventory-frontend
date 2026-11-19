// Test helper: reads the vendored OpenAPI contract and validates a value against a response
// schema. A deliberately small JSON Schema subset, enough for this contract (3.1): $ref, type
// (including null), enum, pattern, format uuid/date-time, minimum/maximum, min/maxItems, required,
// properties, additionalProperties false, items, oneOf, allOf. Test code only.
import { readFileSync } from 'node:fs';

import { load } from 'js-yaml';

type Json = Record<string, unknown>;

export const contract = load(
  readFileSync(new URL('../../openapi/openapi.yaml', import.meta.url), 'utf8'),
) as Json;

function pointer(ref: string): unknown {
  let node: unknown = contract;
  for (const part of ref.replace(/^#\//, '').split('/')) node = (node as Json)[part];
  return node;
}

function resolve(node: unknown): Json {
  let current = node as Json;
  while (typeof current.$ref === 'string') current = pointer(current.$ref) as Json;
  return current;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function typeOk(type: string, value: unknown): boolean {
  switch (type) {
    case 'null':
      return value === null;
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/** Returns a list of problems (empty = the value conforms). */
export function validate(schemaNode: unknown, value: unknown, at = '$'): string[] {
  const schema = resolve(schemaNode);
  const problems: string[] = [];

  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf as unknown[]) problems.push(...validate(part, value, at));
  }
  if (Array.isArray(schema.oneOf)) {
    const branches = (schema.oneOf as unknown[]).map((s) => validate(s, value, at));
    if (!branches.some((p) => p.length === 0)) {
      problems.push(`${at}: matches none of oneOf (${branches.map((p) => p[0]).join(' | ')})`);
    }
  }
  const types =
    schema.type === undefined ? [] : ([] as string[]).concat(schema.type as string | string[]);
  if (types.length > 0 && !types.some((t) => typeOk(t, value))) {
    return [...problems, `${at}: expected ${types.join('|')}, got ${JSON.stringify(value)}`];
  }
  if (Array.isArray(schema.enum) && !(schema.enum as unknown[]).includes(value)) {
    problems.push(`${at}: ${JSON.stringify(value)} not in enum`);
  }
  if (typeof value === 'string') {
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      problems.push(`${at}: "${value}" does not match ${schema.pattern}`);
    }
    if (schema.format === 'uuid' && !UUID.test(value)) problems.push(`${at}: not a uuid`);
    if (schema.format === 'date-time' && !DATE_TIME.test(value))
      problems.push(`${at}: not a date-time`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum)
      problems.push(`${at}: below minimum`);
    if (typeof schema.maximum === 'number' && value > schema.maximum)
      problems.push(`${at}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems)
      problems.push(`${at}: too many items`);
    if (typeof schema.minItems === 'number' && value.length < schema.minItems)
      problems.push(`${at}: too few items`);
    if (schema.items !== undefined) {
      value.forEach((item, i) =>
        problems.push(...validate(schema.items, item, `${at}[${String(i)}]`)),
      );
    }
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as Json;
    const properties = (schema.properties ?? {}) as Json;
    for (const name of (schema.required ?? []) as string[]) {
      if (!(name in record)) problems.push(`${at}: missing required "${name}"`);
    }
    for (const [name, child] of Object.entries(record)) {
      if (name in properties) problems.push(...validate(properties[name], child, `${at}.${name}`));
      else if (schema.additionalProperties === false) problems.push(`${at}: unexpected "${name}"`);
    }
  }
  return problems;
}

/** The JSON response schema the contract declares for method + path + status, or undefined. */
export function responseSchema(path: string, method: string, status: number): unknown {
  const operation = ((contract.paths as Json)[path] as Json | undefined)?.[method] as
    Json | undefined;
  const response = (operation?.responses as Json | undefined)?.[String(status)];
  if (response === undefined) return undefined;
  const content = resolve(response).content as Json | undefined;
  return (content?.['application/json'] as Json | undefined)?.schema;
}

export function declaresStatus(path: string, method: string, status: number): boolean {
  const operation = ((contract.paths as Json)[path] as Json | undefined)?.[method] as
    Json | undefined;
  return (operation?.responses as Json | undefined)?.[String(status)] !== undefined;
}
