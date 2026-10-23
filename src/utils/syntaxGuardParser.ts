/**
 * Lummo Studio - Syntax Guard & Transient Error Parser
 * Telemetry parser for compiler, bundler and runtime transient errors (Vite, Webpack, Node, TS, Python, PHP).
 * Strictly technical: extracts file, line, column, error type and code excerpt without touching user disk files.
 */

export interface SyntaxGuardDiagnostic {
  id: string;
  projectId?: string;
  timestamp: number;
  type: 'SYNTAX_ERROR' | 'UNRESOLVED_REFERENCE' | 'TYPE_MISMATCH' | 'COMPILER_ERROR';
  errorName: string;
  file: string;
  line: number | null;
  column: number | null;
  summary: string;
  rawExcerpt?: string;
  rawLog: string;
}

// Regex patterns for various development tools and runtimes
const VITE_SYNTAX_REGEX = /(?:\[vite\]\s+Internal server error:[\s\S]*?)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):(\d+):(\d+):\s*(?:ERROR:\s*)?(?:\[plugin:[^\]]+\]\s*)?([^\n]+)/i;
const NODE_SYNTAX_REGEX = /([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?\r?\n(?:[\s\S]*?)?(SyntaxError|ReferenceError|TypeError):\s*([^\n]+)/i;
const WEBPACK_PARSE_REGEX = /ERROR in\s+([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)(?:\s+(\d+):(\d+))?[\s\S]*?(?:Module parse failed|SyntaxError):\s*([^\n]+)/i;
const TS_COMPILER_REGEX = /([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*([^\n]+)/i;
const PYTHON_SYNTAX_REGEX = /File\s+"([^"]+)",\s+line\s+(\d+)[\s\S]*?(SyntaxError|NameError):\s*([^\n]+)/i;
const PHP_PARSE_REGEX = /Parse error:\s*syntax error,\s*([^\n]+)\s+in\s+([^\n]+)\s+on line\s+(\d+)/i;

// Recovery patterns indicating a clean build / HMR update
const RECOVERY_PATTERNS = [
  /\[vite\]\s+(?:page reload|hmr update)/i,
  /compiled successfully/i,
  /compiled in \d+/i,
  /webpack compiled/i,
  /ready in \d+/i,
  /server running at/i,
  /listening on port/i,
  /fast refresh/i,
  /watching for file changes/i
];

/**
 * Checks if a log line represents a recovery or clean compilation event
 */
export function isCleanCompilationLog(log: string): boolean {
  if (!log) return false;
  return RECOVERY_PATTERNS.some(pattern => pattern.test(log));
}

/**
 * Parses a raw log string to detect transient syntax / reference errors
 */
export function parseTransientDiagnostic(rawLog: string, projectId = 'default'): SyntaxGuardDiagnostic | null {
  if (!rawLog || typeof rawLog !== 'string') return null;

  // Clean ANSI terminal escape codes
  const clean = rawLog.replace(/\u001b\[[0-9;]*m/g, '');

  // 1. Vite / Rollup / esbuild
  const viteMatch = clean.match(VITE_SYNTAX_REGEX);
  if (viteMatch) {
    const [, file, lineStr, colStr, summary] = viteMatch;
    return {
      id: `${projectId}-${file}-${lineStr}`,
      projectId,
      timestamp: Date.now(),
      type: 'SYNTAX_ERROR',
      errorName: 'SyntaxError',
      file: normalizeFilePath(file),
      line: parseInt(lineStr, 10) || null,
      column: parseInt(colStr, 10) || null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  // 2. Node.js Standard (SyntaxError, ReferenceError, TypeError)
  const nodeMatch = clean.match(NODE_SYNTAX_REGEX);
  if (nodeMatch) {
    const [, file, lineStr, colStr, errName, summary] = nodeMatch;
    const type = errName === 'ReferenceError' 
      ? 'UNRESOLVED_REFERENCE' 
      : errName === 'TypeError' 
      ? 'TYPE_MISMATCH' 
      : 'SYNTAX_ERROR';

    return {
      id: `${projectId}-${file}-${lineStr}`,
      projectId,
      timestamp: Date.now(),
      type,
      errorName: errName,
      file: normalizeFilePath(file),
      line: parseInt(lineStr, 10) || null,
      column: colStr ? parseInt(colStr, 10) : null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  // 3. Webpack / Next.js
  const webpackMatch = clean.match(WEBPACK_PARSE_REGEX);
  if (webpackMatch) {
    const [, file, lineStr, colStr, summary] = webpackMatch;
    return {
      id: `${projectId}-${file}-${lineStr || '0'}`,
      projectId,
      timestamp: Date.now(),
      type: 'SYNTAX_ERROR',
      errorName: 'SyntaxError',
      file: normalizeFilePath(file),
      line: lineStr ? parseInt(lineStr, 10) : null,
      column: colStr ? parseInt(colStr, 10) : null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  // 4. TypeScript Compiler (tsc)
  const tsMatch = clean.match(TS_COMPILER_REGEX);
  if (tsMatch) {
    const [, file, lineStr, colStr, summary] = tsMatch;
    return {
      id: `${projectId}-${file}-${lineStr}`,
      projectId,
      timestamp: Date.now(),
      type: 'COMPILER_ERROR',
      errorName: 'TypeScriptError',
      file: normalizeFilePath(file),
      line: parseInt(lineStr, 10) || null,
      column: parseInt(colStr, 10) || null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  // 5. Python (SyntaxError, NameError)
  const pyMatch = clean.match(PYTHON_SYNTAX_REGEX);
  if (pyMatch) {
    const [, file, lineStr, errName, summary] = pyMatch;
    return {
      id: `${projectId}-${file}-${lineStr}`,
      projectId,
      timestamp: Date.now(),
      type: errName === 'NameError' ? 'UNRESOLVED_REFERENCE' : 'SYNTAX_ERROR',
      errorName: errName,
      file: normalizeFilePath(file),
      line: parseInt(lineStr, 10) || null,
      column: null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  // 6. PHP (Parse error)
  const phpMatch = clean.match(PHP_PARSE_REGEX);
  if (phpMatch) {
    const [, summary, file, lineStr] = phpMatch;
    return {
      id: `${projectId}-${file}-${lineStr}`,
      projectId,
      timestamp: Date.now(),
      type: 'SYNTAX_ERROR',
      errorName: 'ParseError',
      file: normalizeFilePath(file),
      line: parseInt(lineStr, 10) || null,
      column: null,
      summary: cleanSummary(summary),
      rawExcerpt: extractExcerpt(clean),
      rawLog: clean
    };
  }

  return null;
}

function normalizeFilePath(rawPath: string): string {
  let p = rawPath.trim().replace(/\\/g, '/');
  // Remove query params or bundler loaders if any
  p = p.split('?')[0];
  // Strip common noisy prefixes
  p = p.replace(/^.*\/src\//i, 'src/');
  return p;
}

function cleanSummary(rawSummary: string): string {
  if (!rawSummary) return 'Transient syntax error';
  return rawSummary
    .trim()
    .replace(/^error:\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .trim();
}

function extractExcerpt(cleanLog: string): string | undefined {
  const lines = cleanLog.split(/\r?\n/);
  // Look for lines containing code line numbers or caret pointer `^`
  const excerptLines = lines.filter(l => /^\s*\d+\s*\|/.test(l) || /^\s*\^/.test(l));
  if (excerptLines.length > 0) {
    return excerptLines.slice(0, 4).join('\n');
  }
  return undefined;
}
