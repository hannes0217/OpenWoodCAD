import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GENERATOR_LIST } from '../src/core/generators';
import { JOINT_PARAMS } from '../src/core/joints';
import { translationEntries, translate } from '../src/ui/i18n';
import { Dialogs } from '../src/ui/panels/Dialogs';
import { getState, setState } from '../src/ui/store';

const ts: typeof TypeScript = createRequire(import.meta.url)('typescript');

// Server rendering has no subscriptions; retain the real store snapshot.
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

/** Parse literals instead of matching comments or conflating t() with unrelated calls. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const path of sourceFiles(join(process.cwd(), 'src'))) {
    if (/[/\\]i18n[^/\\]*\.ts$/.test(path)) continue;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node: TypeScript.Node): void => {
      if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ProcessingType' && ts.isUnionTypeNode(node.type)) {
        for (const member of node.type.types) if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) keys.add(`proc.${member.literal.text}`);
      }
      if (ts.isStringLiteralLike(node)) {
        if (/^(warn|note|check|proc|role|param|opt|jparam|gen|group)\.[\w.]+$/.test(node.text)) keys.add(node.text);
        const parent = node.parent;
        if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) &&
            (parent.expression.text === 't' && parent.arguments[0] === node ||
             parent.expression.text === 'translate' && parent.arguments[1] === node)) keys.add(node.text);
        if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name) && parent.name.text === 'role') keys.add(`role.${node.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  // Runtime metadata covers template keys such as `param.${definition.id}`.
  for (const generator of GENERATOR_LIST) {
    keys.add(`gen.${generator.type}`); keys.add(`gen.${generator.type}.desc`);
    keys.add(`insert.cat.${generator.category}`);
    for (const param of generator.params) {
      keys.add(`param.${param.id}`); keys.add(`group.${param.group}`);
      if (param.type === 'select') for (const option of param.options) keys.add(`opt.${option}`);
    }
  }
  for (const [joint, params] of Object.entries(JOINT_PARAMS)) {
    keys.add(`joint.${joint}`);
    for (const param of params) {
      keys.add(`jparam.${param.id}`);
      // Screw sizes are language-independent dimensional identifiers.
      for (const option of param.options ?? []) if (!/^\d+x\d+$/.test(option)) keys.add(`opt.${option}`);
    }
  }
  return keys;
}

const placeholders = (text: string) => [...text.matchAll(/\{([\w]+)\}/g)].map(match => match[1]).sort();

describe('translation coverage', () => {
  it('translates source messages and generator/joint metadata in both languages without fallback', () => {
    const keys = usedKeys();
    expect(keys.size).toBeGreaterThan(200);
    for (const language of ['de', 'en'] as const) {
      const entries = translationEntries(language);
      const missing = [...keys].filter(key => !entries[key]?.trim()).sort();
      expect(missing, `${language}: untranslated source keys`).toEqual([]);
    }
  });
  it('keeps all registered keys and interpolation arguments equal in German and English', () => {
    const de = translationEntries('de'), en = translationEntries('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
    for (const key of Object.keys(de)) {
      expect(en[key]?.trim(), key).toBeTruthy();
      expect(placeholders(en[key]), key).toEqual(placeholders(de[key]));
    }
    expect(translate('en', 'status.parts', {n: 3})).toBe('3 parts');
  });
  it('renders English help and shortcut dialogs without German fallback labels', () => {
    const previous = getState();
    try {
      setState({lang:'en',dialog:{type:'about'}});
      const about = renderToStaticMarkup(createElement(Dialogs));
      expect(about).toContain('preliminary sizing'); expect(about).not.toContain('Vorbemessung');
      setState({dialog:{type:'shortcuts'}});
      const shortcuts = renderToStaticMarkup(createElement(Dialogs));
      expect(shortcuts).toContain('Ctrl+Z'); expect(shortcuts).toContain('Clear selection');
      expect(shortcuts).not.toContain('Strg'); expect(shortcuts).not.toContain('Entf');
    } finally { setState({lang:previous.lang,dialog:previous.dialog}); }
  });
});
