import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { 
  parseTransientDiagnostic, 
  isCleanCompilationLog 
} from '../src/utils/syntaxGuardParser';
import SyntaxGuardBadge from '../src/components/common/SyntaxGuardBadge';

describe('SyntaxGuard - Transient Error Parser Suite', () => {
  it('should parse Vite / Rollup transient syntax errors correctly', () => {
    const rawViteError = `
[vite] Internal server error: Failed to parse source for import analysis because the content contains invalid JS syntax.
c:/Users/desau/project/src/App.tsx:42:15: ERROR: Expected "," but found "}"
  41 |   const user = { name: "test"
  42 |   return <div>{user.name}</div>
     |               ^
`;
    const diag = parseTransientDiagnostic(rawViteError, 'test-project');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('SYNTAX_ERROR');
    expect(diag.errorName).toBe('SyntaxError');
    expect(diag.file).toContain('src/App.tsx');
    expect(diag.line).toBe(42);
    expect(diag.column).toBe(15);
    expect(diag.summary).toContain('Expected "," but found "}"');
    expect(diag.rawExcerpt).toBeDefined();
    expect(diag.rawExcerpt).toContain('41 |');
  });

  it('should parse Node.js SyntaxError logs correctly', () => {
    const rawNodeError = `
/var/app/src/server.js:18
const result = calculate(
                        ^
SyntaxError: Unexpected token ')'
    at wrapSafe (internal/modules/cjs/loader.js:988:16)
`;
    const diag = parseTransientDiagnostic(rawNodeError, 'node-app');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('SYNTAX_ERROR');
    expect(diag.errorName).toBe('SyntaxError');
    expect(diag.line).toBe(18);
    expect(diag.summary).toContain("Unexpected token ')'");
    expect(diag.rawExcerpt).toContain('^');
  });

  it('should parse Node.js ReferenceError as UNRESOLVED_REFERENCE', () => {
    const rawRefError = `
src/index.js:25:3
ReferenceError: fetchData is not defined
    at Object.<anonymous> (src/index.js:25:3)
`;
    const diag = parseTransientDiagnostic(rawRefError, 'proj-1');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('UNRESOLVED_REFERENCE');
    expect(diag.errorName).toBe('ReferenceError');
    expect(diag.line).toBe(25);
    expect(diag.summary).toContain('fetchData is not defined');
  });

  it('should parse Webpack / Next.js compile errors', () => {
    const rawWebpackError = `
ERROR in ./src/components/Card.jsx 12:8
Module parse failed: Unexpected token (12:8)
You may need an appropriate loader to handle this file type.
|   return (
|     <div className="card">
`;
    const diag = parseTransientDiagnostic(rawWebpackError, 'webpack-proj');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('SYNTAX_ERROR');
    expect(diag.file).toContain('src/components/Card.jsx');
    expect(diag.line).toBe(12);
  });

  it('should parse TypeScript compiler errors', () => {
    const rawTsError = `src/types/user.ts(15,7): error TS1005: ';' expected.`;
    const diag = parseTransientDiagnostic(rawTsError, 'ts-app');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('COMPILER_ERROR');
    expect(diag.line).toBe(15);
    expect(diag.column).toBe(7);
    expect(diag.summary).toContain("';' expected");
  });

  it('should parse Python syntax errors', () => {
    const rawPyError = `
  File "src/main.py", line 14
    def calculate(x
                  ^
SyntaxError: invalid syntax
`;
    const diag = parseTransientDiagnostic(rawPyError, 'py-app');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('SYNTAX_ERROR');
    expect(diag.file).toContain('src/main.py');
    expect(diag.line).toBe(14);
    expect(diag.summary).toContain('invalid syntax');
  });

  it('should parse PHP parse errors', () => {
    const rawPhpError = `Parse error: syntax error, unexpected '}' in /var/www/index.php on line 45`;
    const diag = parseTransientDiagnostic(rawPhpError, 'php-app');
    expect(diag).not.toBeNull();
    expect(diag.type).toBe('SYNTAX_ERROR');
    expect(diag.file).toContain('index.php');
    expect(diag.line).toBe(45);
    expect(diag.summary).toContain("unexpected '}'");
  });

  it('should detect clean compilation and HMR recovery logs', () => {
    expect(isCleanCompilationLog('[vite] hmr update /src/App.tsx')).toBe(true);
    expect(isCleanCompilationLog('webpack compiled successfully in 120 ms')).toBe(true);
    expect(isCleanCompilationLog('compiled in 240ms')).toBe(true);
    expect(isCleanCompilationLog('ready in 320ms')).toBe(true);
    expect(isCleanCompilationLog('Server running at http://localhost:3000')).toBe(true);
    expect(isCleanCompilationLog('Random console.log output')).toBe(false);
  });
});

describe('SyntaxGuard - UI Badge & Aesthetics Compliance Suite', () => {
  const sampleDiagnostic = {
    id: 'test-proj-App.tsx-42',
    projectId: 'test-proj',
    timestamp: Date.now(),
    type: 'SYNTAX_ERROR',
    errorName: 'SyntaxError',
    file: 'src/App.tsx',
    line: 42,
    column: 15,
    summary: 'Unexpected token, expected ","',
    rawExcerpt: '41 | const a = 1\n42 | return <div>\n   |        ^',
    rawLog: 'Error log'
  };

  it('should render null when no diagnostic is active', () => {
    const html = renderToString(<SyntaxGuardBadge diagnostic={null} />);
    expect(html).toBe('');
  });

  it('should render developer-grade telemetry badge with file and line', () => {
    const html = renderToString(
      <SyntaxGuardBadge 
        diagnostic={sampleDiagnostic} 
        projectPath="C:/repo"
        theme="dark"
        language="es"
      />
    );
    expect(html).toContain('[ SYNTAX_GUARD ]');
    expect(html).toContain('App.tsx:42');
  });

  it('should STRICTLY NOT contain any emojis (no ⚡, ⚠️, 🤖, ✨, etc.)', () => {
    const html = renderToString(
      <SyntaxGuardBadge 
        diagnostic={sampleDiagnostic} 
        projectPath="C:/repo"
        theme="dark"
        language="es"
      />
    );
    // Unicode emoji ranges check
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(html)).toBe(false);
  });

  it('should STRICTLY NOT contain AI branding tropes (no Copilot, AI Assistant, Magic)', () => {
    const html = renderToString(
      <SyntaxGuardBadge 
        diagnostic={sampleDiagnostic} 
        projectPath="C:/repo"
        theme="dark"
        language="es"
      />
    );
    expect(html).not.toMatch(/copilot/i);
    expect(html).not.toMatch(/ai assistant/i);
    expect(html).not.toMatch(/magic/i);
  });
});
