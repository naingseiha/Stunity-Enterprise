const fs = require('fs');
const glob = require('glob');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = glob.sync('apps/mobile/src/**/*.{tsx,jsx}');

console.log(`Scanning ${files.length} files across entire mobile app...`);

let issuesFound = 0;

files.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    try {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
            errorRecovery: true
        });

        traverse(ast, {
            JSXExpressionContainer(path) {
                const parent = path.parent;
                if (parent.type !== 'JSXElement') return;

                let openingName = '';
                const opening = parent.openingElement.name;
                if (opening.type === 'JSXIdentifier') {
                    openingName = opening.name;
                } else if (opening.type === 'JSXMemberExpression') {
                    openingName = `${opening.object.name}.${opening.property.name}`;
                }

                const validWrappers = ['Text', 'Animated.Text', 'AppText', 'TSpan', 'TextInput'];
                if (validWrappers.includes(openingName)) return;

                const exp = path.node.expression;

                if (exp.type === 'StringLiteral' || exp.type === 'NumericLiteral') {
                    console.log(`[SUSPECT-LITERAL] ${file}:${path.node.loc.start.line} - Literal inside <${openingName}>`);
                    issuesFound++;
                }

                if (exp.type === 'LogicalExpression' && exp.operator === '&&') {
                    let isSuspicious = false;

                    if (exp.left.type === 'MemberExpression' && exp.left.property.name === 'length') isSuspicious = true;
                    if (exp.left.type === 'StringLiteral') isSuspicious = true;
                    if (exp.left.type === 'NumericLiteral') isSuspicious = true;

                    if (isSuspicious) {
                        console.log(`[SUSPECT-LOGICAL] ${file}:${path.node.loc.start.line} - Suspicious && logic inside <${openingName}>`);
                        issuesFound++;
                    }
                }

                if (exp.type === 'ConditionalExpression') {
                    const check = (node) => node.type === 'StringLiteral' || node.type === 'NumericLiteral';
                    if (check(exp.consequent) || check(exp.alternate)) {
                        console.log(`[SUSPECT-TERNARY] ${file}:${path.node.loc.start.line} - Ternary returning literal inside <${openingName}>`);
                        issuesFound++;
                    }
                }
            },
            JSXText(path) {
                const value = path.node.value;
                if (value.trim().length > 0) {
                    const parent = path.parent;
                    if (parent.type === 'JSXElement') {
                        let openingName = '';
                        const opening = parent.openingElement.name;
                        if (opening.type === 'JSXIdentifier') {
                            openingName = opening.name;
                        } else if (opening.type === 'JSXMemberExpression') {
                            openingName = `${opening.object.name}.${opening.property.name}`;
                        }

                        const validWrappers = ['Text', 'Animated.Text', 'AppText', 'TSpan', 'TextInput'];
                        if (!validWrappers.includes(openingName)) {
                            console.log(`[SUSPECT-JSXTEXT] ${file}:${path.node.loc.start.line} - Raw text "${value.trim().substring(0, 20).replace(/\n/g, '')}" inside <${openingName}>`);
                            issuesFound++;
                        }
                    }
                }
            }
        });
    } catch (e) {
        // console.error('Error parsing: ' + file, e.message);
    }
});
console.log(`Finished! Found ${issuesFound} issues.`);
