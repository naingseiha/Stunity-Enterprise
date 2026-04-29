import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';

const ROOT = process.cwd();
const TARGETS = [
  {
    platform: 'web',
    root: 'apps/web/src',
    dirs: ['apps/web/src/app', 'apps/web/src/components'],
    messages: ['apps/web/src/messages/en.json', 'apps/web/src/messages/km.json'],
    importLine: "import { useTranslations } from 'next-intl';\n",
    importToken: 'useTranslations',
    hookLine: 'const autoT = useTranslations();',
  },
  {
    platform: 'mobile',
    root: 'apps/mobile/src',
    dirs: ['apps/mobile/src/screens', 'apps/mobile/src/components'],
    messages: ['apps/mobile/src/assets/locales/en.json', 'apps/mobile/src/assets/locales/km.json'],
    importLine: "import { useTranslation } from 'react-i18next';\n",
    importToken: 'useTranslation',
    hookLine: 'const { t: autoT } = useTranslation();',
  },
];

const PROP_NAMES = new Set(['placeholder', 'title', 'accessibilityLabel', 'aria-label', 'label', 'alt', 'message']);
const SKIP_PARTS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);
const SKIP_FILE_RE = /\.(backup|old)\.tsx$|\.old\.tsx$|\.backup\.tsx$/;
const IGNORE_TEXT_RE = /^(API|URL|ID|XP|OK|N\/A|AM|PM|CSV|PDF|QR|AI|UI|UX|HTTP|HTTPS)$/;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_PARTS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && fullPath.endsWith('.tsx') && !SKIP_FILE_RE.test(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isLikelyUserText(value) {
  const text = value.trim();
  if (!text || IGNORE_TEXT_RE.test(text)) return false;
  if (/^[A-Z0-9_ -]+$/.test(text) && text.length <= 3) return false;
  if (text.includes('{') || text.includes('}')) return false;
  return /[A-Za-z]/.test(text);
}

function slugify(value) {
  return value
    .replace(/\.[tj]sx$/, '')
    .replace(/^apps\/(web|mobile)\/src\//, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(-4)
    .join('_')
    .replace(/^(\d)/, '_$1')
    || 'text';
}

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
}

function setPath(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let current = obj;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  const leaf = parts[parts.length - 1];
  if (current[leaf] === undefined) current[leaf] = value;
}

function insertImport(source, target) {
  if (source.includes(target.importToken)) return source;

  const directiveMatch = source.match(/^(['"]use client['"];?\n)(\n)?/);
  if (directiveMatch) {
    const index = directiveMatch[0].length;
    return `${source.slice(0, index)}${target.importLine}${source.slice(index)}`;
  }

  return `${target.importLine}${source}`;
}

function nodeName(node) {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    return node.name?.text || '';
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  }
  return '';
}

function isFunctionLikeWithBody(node) {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)) &&
    node.body &&
    ts.isBlock(node.body)
  );
}

function findComponentBody(node) {
  const functionAncestors = [];
  let current = node.parent;
  while (current) {
    if (isFunctionLikeWithBody(current)) functionAncestors.push(current);
    current = current.parent;
  }

  const component = functionAncestors.find((fn) => {
    const name = nodeName(fn);
    return /^[A-Z]/.test(name) || name === 'Page' || name === 'Layout';
  });

  return (component || functionAncestors[0])?.body;
}

function getAttributeValue(attribute) {
  const initializer = attribute.initializer;
  if (!initializer) return null;

  if (ts.isStringLiteral(initializer)) {
    return { value: initializer.text, start: initializer.getStart(), end: initializer.end };
  }

  if (ts.isJsxExpression(initializer)) {
    const expression = initializer.expression;
    if (expression && ts.isStringLiteral(expression)) {
      return { value: expression.text, start: initializer.getStart(), end: initializer.end };
    }
  }

  return null;
}

function indentationFor(source, index) {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const match = source.slice(lineStart, index).match(/^\s*/);
  return match?.[0] || '';
}

function migrateFile(file, target, messages) {
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('/components/i18n/I18nText.tsx')) return 0;

  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = path.relative(ROOT, file);
  const fileSlug = slugify(rel);
  const replacements = [];
  const hookBodies = new Map();
  const seen = new Map();

  function makeKey(text) {
    const normalized = text.trim().replace(/\s+/g, ' ');
    const existing = seen.get(normalized);
    if (existing) return existing;

    const id = hash(`${rel}:attr:${normalized}`);
    const key = `auto.${target.platform}.${fileSlug}.k_${id}`;
    seen.set(normalized, key);
    for (const message of messages) setPath(message.data, key, normalized);
    return key;
  }

  function addHook(node) {
    const body = findComponentBody(node);
    if (!body) return false;

    const bodyText = source.slice(body.getStart(sourceFile), body.end);
    if (!bodyText.includes('autoT')) {
      const indent = indentationFor(source, body.getStart(sourceFile)) || '  ';
      hookBodies.set(body.getStart(sourceFile) + 1, `\n${indent}  ${target.hookLine}`);
    }
    return true;
  }

  function visit(node) {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && PROP_NAMES.has(node.name.text)) {
      const attr = getAttributeValue(node);
      if (attr && isLikelyUserText(attr.value) && addHook(node)) {
        const key = makeKey(attr.value);
        replacements.push({
          start: attr.start,
          end: attr.end,
          text: `{autoT("${key}")}`,
        });
      }
    }

    if (ts.isJsxText(node)) {
      const parent = node.parent;
      const isSimpleOptionText = ts.isJsxElement(parent)
        && parent.openingElement.tagName.getText(sourceFile).toLowerCase() === 'option'
        && parent.children.filter((child) => !ts.isJsxText(child) || child.getText(sourceFile).trim()).length === 1;

      const value = node.getText(sourceFile).trim().replace(/\s+/g, ' ');
      if (isSimpleOptionText && isLikelyUserText(value) && addHook(node)) {
        const key = makeKey(value);
        replacements.push({
          start: node.getStart(sourceFile),
          end: node.end,
          text: `{autoT("${key}")}`,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (replacements.length === 0 && hookBodies.size === 0) return 0;

  let next = source;
  const allReplacements = [
    ...replacements,
    ...Array.from(hookBodies.entries()).map(([start, text]) => ({ start, end: start, text })),
  ];

  for (const replacement of allReplacements.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, replacement.start)}${replacement.text}${next.slice(replacement.end)}`;
  }

  next = insertImport(next, target);
  fs.writeFileSync(file, next);
  return replacements.length;
}

let total = 0;

for (const target of TARGETS) {
  const messages = target.messages.map((messagePath) => ({
    path: path.join(ROOT, messagePath),
    data: JSON.parse(fs.readFileSync(path.join(ROOT, messagePath), 'utf8')),
  }));

  let platformTotal = 0;
  for (const dir of target.dirs) {
    for (const file of walk(path.join(ROOT, dir))) {
      platformTotal += migrateFile(file, target, messages);
    }
  }

  for (const message of messages) {
    fs.writeFileSync(message.path, `${JSON.stringify(message.data, null, 2)}\n`);
  }

  total += platformTotal;
  console.log(`${target.platform}: migrated ${platformTotal} JSX attributes/options`);
}

console.log(`Total migrated: ${total}`);
