import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OPEN = /^[ \t]*\/\/[ \t]*==UserScript==[ \t]*$/;
const CLOSE = /^[ \t]*\/\/[ \t]*==\/UserScript==[ \t]*$/;
const REQUIRED = ['name', 'namespace', 'version', 'match'];

/** Validate only the first metadata block; return diagnostics without I/O. */
export function validateUserscriptMetadata(source) {
  if (typeof source !== 'string') return ['Userscript source must be a string.'];

  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const start = lines.findIndex((line) => OPEN.test(line));
  if (start === -1) {
    return ['Missing opening userscript metadata marker: // ==UserScript==.'];
  }
  const end = lines.findIndex((line, index) => index > start && CLOSE.test(line));
  if (end === -1) {
    return [`Missing closing userscript metadata marker: // ==/UserScript== (opened on line ${start + 1}).`];
  }

  const diagnostics = [];
  const fields = new Map();
  for (let index = start + 1; index < end; index += 1) {
    const line = lines[index];
    if (OPEN.test(line)) {
      diagnostics.push(`Line ${index + 1}: unexpected opening marker inside metadata block.`);
      continue;
    }
    if (!line.trim()) continue;
    const comment = /^[ \t]*\/\/(.*)$/.exec(line);
    if (!comment) {
      diagnostics.push(`Line ${index + 1}: metadata must use // comments.`);
      continue;
    }
    const text = comment[1].trim();
    if (!text.startsWith('@')) continue;
    const entry = /^@([A-Za-z][\w:-]*)(?:[ \t]+(.*))?$/.exec(text);
    if (!entry) {
      diagnostics.push(`Line ${index + 1}: malformed metadata directive; expected @key followed by a value.`);
      continue;
    }
    const [, key, value = ''] = entry;
    if (!fields.has(key)) fields.set(key, []);
    fields.get(key).push(value.trim());
  }

  for (const key of REQUIRED) {
    const values = fields.get(key);
    if (!values) {
      diagnostics.push(`Missing required @${key} field in userscript metadata.`);
    } else if (!values.some((value) => value.length > 0)) {
      diagnostics.push(key === 'match'
        ? 'Userscript metadata must contain at least one nonempty @match.'
        : `Userscript metadata @${key} must not be empty.`);
    }
  }
  return diagnostics;
}

function runCli() {
  const filename = process.argv[2] ?? 'focus-banner.user.js';
  let source;
  try {
    source = readFileSync(filename, 'utf8');
  } catch (error) {
    console.error(`Unable to read "${filename}": ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const diagnostics = validateUserscriptMetadata(source);
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(`${filename}: ${diagnostic}`);
    process.exitCode = 1;
  } else {
    console.log(`Valid userscript metadata: ${filename}`);
  }
}

// Keep ordinary imports free of CLI reads, output, and exit-code changes.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
