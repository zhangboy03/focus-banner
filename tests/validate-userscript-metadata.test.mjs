import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateUserscriptMetadata as validate } from '../scripts/validate-userscript-metadata.mjs';

const moduleUrl = new URL('../scripts/validate-userscript-metadata.mjs', import.meta.url);
const cli = fileURLToPath(moduleUrl);
const entries = [
  '// @name         Focus Banner',
  '// @namespace    https://github.com/zhangboy03/focus-banner',
  '// @version      0.1.0',
  '// @description  A non-blocking focus reminder',
  '// @match        *://*/*',
  '// @grant        GM_setValue',
  '// @grant        GM_getValue',
  '// @run-at       document_idle',
];
const script = (metadata = entries) => [
  '// ==UserScript==', ...metadata, '// ==/UserScript==', '', '(() => {})();',
].join('\n');
const without = (key) => entries.filter((line) => !line.startsWith(`// @${key} `));

function tempDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'userscript-metadata-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test('accepts valid repository-style input', () => {
  assert.deepEqual(validate(script()), []);
});

test('reports a missing block, including metadata directives without delimiters', () => {
  for (const source of ['', 'console.log("no header");', entries.join('\n')]) {
    assert.match(validate(source).join('\n'), /Missing opening.*==UserScript==/);
  }
});

test('requires full-line opening and closing markers in the right order', () => {
  for (const source of [
    script().replace('// ==UserScript==', '// ==UserScript='),
    script().replace('// ==UserScript==', 'const marker = "// ==UserScript==";'),
    '// ==/UserScript==',
  ]) {
    assert.match(validate(source).join('\n'), /Missing opening/);
  }
  for (const source of [
    script().replace('// ==/UserScript==', ''),
    script().replace('// ==/UserScript==', '// ==/UserScript='),
    script().replace('// ==/UserScript==', 'const marker = "// ==/UserScript==";'),
    '// ==/UserScript==\n' + script().replace('// ==/UserScript==', ''),
  ]) {
    assert.match(validate(source).join('\n'), /Missing closing.*opened on line/);
  }
});

for (const key of ['name', 'namespace', 'version', 'match']) {
  test(`reports missing @${key}`, () => {
    assert.deepEqual(validate(script(without(key))), [
      `Missing required @${key} field in userscript metadata.`,
    ]);
  });

  test(`reports empty or whitespace-only @${key}`, () => {
    for (const whitespace of ['', ' ', '\t  ']) {
      const diagnostics = validate(script([...without(key), `// @${key}${whitespace}`]));
      assert.equal(diagnostics.length, 1);
      assert.match(diagnostics[0], new RegExp(`@${key}`));
      assert.match(diagnostics[0], /empty/);
    }
  });
}

test('reports every required field in an empty metadata block', () => {
  assert.deepEqual(validate(script([])), ['name', 'namespace', 'version', 'match'].map(
    (key) => `Missing required @${key} field in userscript metadata.`,
  ));
});

test('accepts repeated matches and grants', () => {
  assert.deepEqual(validate(script([
    ...entries, '// @match https://example.com/*', '// @match https://example.org/*',
    '// @grant GM_addStyle', '// @grant GM_getValue',
  ])), []);
});

test('requires at least one nonempty match across repeated matches', () => {
  assert.deepEqual(validate(script([...entries, '// @match', '// @match \t'])), []);
  assert.match(validate(script([...without('match'), '// @match', '// @match \t'])).join('\n'),
    /at least one nonempty @match/);
});

test('handles CRLF, a UTF-8 BOM, and a header ending without a newline', () => {
  assert.deepEqual(validate(script().replace(/\n/g, '\r\n')), []);
  assert.deepEqual(validate('\uFEFF' + script()), []);
  assert.deepEqual(validate(script().split('\n\n')[0]), []);
});

test('allows indented comments, blank lines, and unknown metadata keys', () => {
  assert.deepEqual(validate(script([
    ...entries, '', '// Header note', '// @name:zh-CN 专注横幅', '// @custom value',
  ]).split('\n').map((line) => `\t${line}`).join('\n')), []);
});

test('outside directives cannot satisfy missing or empty required metadata', () => {
  for (const key of ['name', 'namespace', 'version', 'match']) {
    for (const metadata of [without(key), [...without(key), `// @${key}`]]) {
      const source = script(metadata);
      const outside = `// @${key} outside value\n`;
      assert.deepEqual(validate(outside + source + '\n' + outside), validate(source));
      assert.equal(validate(source).length, 1);
    }
  }
});

test('ignores metadata-like text and malformed JavaScript after the first block', () => {
  const outside = '\n// @name\n// @match\n// @@broken\n// ==UserScript==\nnot JavaScript {{{';
  assert.deepEqual(validate('// @version\n// @@broken\n' + script() + outside), []);
});

test('reports malformed lines with source line numbers', () => {
  const cases = [
    ['// ==UserScript==', /Line 2: unexpected opening marker/],
    ['@name Not a comment', /Line 2: metadata must use \/\/ comments/],
    ['// @name=Malformed', /Line 2: malformed metadata directive/],
  ];
  for (const [line, expected] of cases) {
    assert.match(validate(script([line, ...entries])).join('\n'), expected);
  }
});

test('returns fresh diagnostic arrays and handles non-string input without throwing', () => {
  const diagnostics = validate(script());
  diagnostics.push('caller mutation');
  assert.deepEqual(validate(script()), []);
  for (const source of [null, undefined, 42, {}]) {
    assert.deepEqual(validate(source), ['Userscript source must be a string.']);
  }
});

test('CLI reads an explicit filename, including spaces', (t) => {
  const cwd = tempDirectory(t);
  writeFileSync(join(cwd, 'custom script.user.js'), script());
  const result = run([cli, 'custom script.user.js'], cwd);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Valid userscript metadata: custom script\.user\.js/);
});

test('CLI defaults to focus-banner.user.js in the working directory', (t) => {
  const cwd = tempDirectory(t);
  writeFileSync(join(cwd, 'focus-banner.user.js'), script());
  const result = run([cli], cwd);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Valid userscript metadata: focus-banner\.user\.js/);
});

test('CLI exits nonzero and explains invalid metadata', (t) => {
  const cwd = tempDirectory(t);
  writeFileSync(join(cwd, 'invalid.user.js'), script(without('version')));
  const result = run([cli, 'invalid.user.js'], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /invalid\.user\.js: Missing required @version/);
});

test('CLI exits nonzero and explains unreadable input', (t) => {
  const result = run([cli, 'missing.user.js'], tempDirectory(t));
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unable to read "missing\.user\.js":/);
});

test('importing does not read a default file, print CLI output, or change the exit code', (t) => {
  const code = `process.exitCode = 7; await import(${JSON.stringify(moduleUrl.href)}); process.stdout.write('imported');`;
  const result = run(['--input-type=module', '-e', code, 'missing.user.js'], tempDirectory(t));
  assert.equal(result.status, 7);
  assert.equal(result.stdout, 'imported');
  assert.equal(result.stderr, '');
});
