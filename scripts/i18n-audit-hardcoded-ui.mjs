import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const TARGETS = [
  'apps/web/src/app',
  'apps/web/src/components',
  'apps/mobile/src/screens',
  'apps/mobile/src/components',
];

const SKIP_PARTS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);
const SKIP_FILE_RE = /\.(backup|old)\.tsx$|\.old\.tsx$|\.backup\.tsx$/;
const PROP_NAMES = new Set(['placeholder', 'title', 'accessibilityLabel', 'aria-label', 'label', 'alt', 'message']);
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

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function isLikelyUserText(value) {
  const text = value.trim();
  if (!text || IGNORE_TEXT_RE.test(text)) return false;
  if (/^[A-Z0-9_ -]+$/.test(text) && text.length <= 3) return false;
  if (text.includes('{') || text.includes('}')) return false;
  return /[A-Za-z]/.test(text);
}

function getAttributeValue(attribute) {
  const initializer = attribute.initializer;
  if (!initializer) return '';

  if (ts.isStringLiteral(initializer)) return initializer.text;

  if (ts.isJsxExpression(initializer)) {
    const expression = initializer.expression;
    if (expression && ts.isStringLiteral(expression)) return expression.text;
  }

  return '';
}

const findings = [];

for (const target of TARGETS) {
  for (const file of walk(path.join(ROOT, target))) {
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node) {
      if (ts.isJsxText(node)) {
        const value = node.getText(sourceFile).trim().replace(/\s+/g, ' ');
        if (isLikelyUserText(value)) {
          findings.push({
            file: path.relative(ROOT, file),
            line: lineNumber(source, node.getStart(sourceFile)),
            kind: 'text-node',
            value,
          });
        }
      }

      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && PROP_NAMES.has(node.name.text)) {
        const value = getAttributeValue(node).trim();
        if (isLikelyUserText(value)) {
          findings.push({
            file: path.relative(ROOT, file),
            line: lineNumber(source, node.getStart(sourceFile)),
            kind: node.name.text,
            value,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

const byArea = findings.reduce((acc, item) => {
  const area = item.file.startsWith('apps/mobile') ? 'mobile' : 'web';
  acc[area] = (acc[area] || 0) + 1;
  return acc;
}, {});

console.log(`Hardcoded UI text findings: ${findings.length}`);
console.log(`Web: ${byArea.web || 0}`);
console.log(`Mobile: ${byArea.mobile || 0}`);
console.log('');

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 120;

for (const item of findings.slice(0, Number.isFinite(limit) ? limit : 120)) {
  console.log(`${item.file}:${item.line} [${item.kind}] ${item.value}`);
}

if (findings.length > limit) {
  console.log(`...and ${findings.length - limit} more. Re-run with --limit=${findings.length} for the full list.`);
}

process.exitCode = findings.length > 0 ? 1 : 0;
