import { describe, it, expect } from 'vitest';
import { computeGraphTopology, getLaneColor } from '../src/components/views/git/GitGraphRenderer';
import { parseUnifiedDiff, buildSideBySideLines } from '../src/components/views/git/GitDiffModal';

describe('Git Inspector - Graph Topology Suite', () => {
  it('should compute linear commit topology with 1 lane', () => {
    const commits = [
      { hash: 'c3', parents: ['c2'], message: 'feat: three' },
      { hash: 'c2', parents: ['c1'], message: 'feat: two' },
      { hash: 'c1', parents: [], message: 'initial commit' }
    ];

    const result = computeGraphTopology(commits);
    expect(result.nodeCoords.length).toBe(3);
    expect(result.maxLanes).toBe(1);
    expect(result.connections.length).toBe(2);
    expect(result.nodeCoords[0].isHead).toBe(true);
    expect(result.nodeCoords[1].isHead).toBe(false);
  });

  it('should compute branched and merge commits topology with multiple lanes', () => {
    const commits = [
      { hash: 'c4', parents: ['c3', 'b1'], message: 'Merge branch feature' },
      { hash: 'b1', parents: ['c2'], message: 'feat: branch work' },
      { hash: 'c3', parents: ['c2'], message: 'fix: main work' },
      { hash: 'c2', parents: ['c1'], message: 'initial base' },
      { hash: 'c1', parents: [], message: 'root' }
    ];

    const result = computeGraphTopology(commits);
    expect(result.maxLanes).toBeGreaterThanOrEqual(2);
    expect(result.nodeCoords[0].isMerge).toBe(true);
    expect(result.nodeCoords[1].isMerge).toBe(false);
    expect(result.connections.some(c => c.isMerge)).toBe(true);
  });

  it('should cycle lane colors consistently', () => {
    const color0 = getLaneColor(0);
    const color7 = getLaneColor(7);
    expect(color0.stroke).toBe(color7.stroke);
  });
});

describe('Git Inspector - Unified & Split Diff Parser Suite', () => {
  it('should parse standard unified diff hunks correctly', () => {
    const sampleDiff = `diff --git a/src/App.jsx b/src/App.jsx
index 1111111..2222222 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -10,3 +10,4 @@ function App() {
  const a = 1;
-const b = 2;
+const b = 42;
+const c = 100;
  return a + b;`;

    const hunks = parseUnifiedDiff(sampleDiff);
    expect(hunks.length).toBe(1);
    expect(hunks[0].lines.length).toBe(5);

    const types = hunks[0].lines.map(l => l.type);
    expect(types).toEqual(['normal', 'del', 'add', 'add', 'normal']);

    const addLines = hunks[0].lines.filter(l => l.type === 'add');
    expect(addLines.length).toBe(2);
    expect(addLines[0].content).toBe('const b = 42;');
    expect(addLines[1].content).toBe('const c = 100;');
  });

  it('should pair lines for side-by-side view correctly', () => {
    const sampleDiff = `@@ -1,2 +1,2 @@
-hello old
+hello new
 normal line`;
    const hunks = parseUnifiedDiff(sampleDiff);
    const pairs = buildSideBySideLines(hunks[0].lines);

    expect(pairs.length).toBe(2);
    expect(pairs[0].left?.type).toBe('del');
    expect(pairs[0].right?.type).toBe('add');
    expect(pairs[1].left?.type).toBe('normal');
    expect(pairs[1].right?.type).toBe('normal');
  });

  it('should handle empty or untracked diff gracefully', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff(null)).toEqual([]);
  });
});
