import React, { useMemo } from 'react';

const LANE_PALETTE = [
  { stroke: '#38bdf8', fill: '#0284c7', glow: 'rgba(56, 189, 248, 0.4)' }, // Sky
  { stroke: '#10b981', fill: '#059669', glow: 'rgba(16, 185, 129, 0.4)' }, // Emerald
  { stroke: '#a855f7', fill: '#7c3aed', glow: 'rgba(168, 85, 247, 0.4)' }, // Purple
  { stroke: '#f59e0b', fill: '#d97706', glow: 'rgba(245, 158, 11, 0.4)' }, // Amber
  { stroke: '#ec4899', fill: '#db2777', glow: 'rgba(236, 72, 153, 0.4)' }, // Pink
  { stroke: '#06b6d4', fill: '#0891b2', glow: 'rgba(6, 182, 212, 0.4)' },  // Cyan
  { stroke: '#f97316', fill: '#ea580c', glow: 'rgba(249, 115, 22, 0.4)' }  // Orange
];

export function getLaneColor(laneIndex) {
  return LANE_PALETTE[Math.abs(laneIndex) % LANE_PALETTE.length];
}

/**
 * Standard topological Git graph lane allocator.
 * Guarantees that every branch has its own vertical channel, and branch/merge
 * transitions occur in a clean 1-row step rather than stretching diagonally
 * across other branches.
 */
export function computeGraphTopology(commits) {
  if (!commits || commits.length === 0) {
    return { nodeCoords: [], connections: [], maxLanes: 1 };
  }

  const activeLanes = [];
  const nodeCoords = [];
  const connections = [];
  let maxLanesUsed = 1;

  for (let r = 0; r < commits.length; r++) {
    const c = commits[r];

    // 1. Determine lane for current commit
    let lane = activeLanes.indexOf(c.hash);
    if (lane === -1) {
      lane = activeLanes.indexOf(null);
      if (lane === -1) {
        lane = activeLanes.length;
        activeLanes.push(null);
      }
    }
    maxLanesUsed = Math.max(maxLanesUsed, lane + 1, activeLanes.length);

    nodeCoords.push({
      row: r,
      lane,
      hash: c.hash,
      isHead: r === 0,
      isMerge: (c.parents || []).length > 1
    });

    const y = r;
    const yNext = r + 1;
    const parents = c.parents || [];

    // 2. Active passing branches: keep them strictly vertical in their own columns
    for (let l = 0; l < activeLanes.length; l++) {
      if (l !== lane && activeLanes[l] !== null) {
        connections.push({
          fromLane: l,
          toLane: l,
          fromRow: y,
          toRow: yNext,
          colorLane: l,
          isMerge: false
        });
      }
    }

    // 3. Connect commit to its primary parent
    if (parents.length === 0) {
      // Root commit terminates branch
      activeLanes[lane] = null;
    } else {
      const p0 = parents[0];
      const existingLane = activeLanes.indexOf(p0);

      if (existingLane !== -1 && existingLane !== lane) {
        // Merges into an already tracked branch: curve in 1 step to target lane
        connections.push({
          fromLane: lane,
          toLane: existingLane,
          fromRow: y,
          toRow: yNext,
          colorLane: lane,
          isMerge: true
        });
        activeLanes[lane] = null;
      } else {
        // Continues straight down in current lane
        activeLanes[lane] = p0;
        connections.push({
          fromLane: lane,
          toLane: lane,
          fromRow: y,
          toRow: yNext,
          colorLane: lane,
          isMerge: false
        });
      }

      // Secondary parents (Merge Commit)
      for (let pIdx = 1; pIdx < parents.length; pIdx++) {
        const secP = parents[pIdx];
        let secLane = activeLanes.indexOf(secP);
        if (secLane === -1) {
          secLane = activeLanes.indexOf(null);
          if (secLane === -1) {
            secLane = activeLanes.length;
            activeLanes.push(null);
          }
          activeLanes[secLane] = secP;
        }
        maxLanesUsed = Math.max(maxLanesUsed, secLane + 1, activeLanes.length);

        connections.push({
          fromLane: lane,
          toLane: secLane,
          fromRow: y,
          toRow: yNext,
          colorLane: secLane,
          isMerge: true
        });
      }
    }
  }

  return {
    nodeCoords,
    connections,
    maxLanes: Math.max(1, maxLanesUsed)
  };
}

export default function GitGraphRenderer({
  commits,
  rowHeight = 58,
  laneWidth = 18,
  offsetX = 14,
  focusedLane = null,
  onSelectLane,
  onHoverNode,
  onLeaveNode,
  onNodeContextMenu,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';

  const { nodeCoords, connections, maxLanes } = useMemo(() => {
    return computeGraphTopology(commits);
  }, [commits]);

  const svgWidth = Math.max(34, offsetX + maxLanes * laneWidth + 14);
  const svgHeight = commits.length * rowHeight;

  if (commits.length === 0) return null;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      className="shrink-0 select-none overflow-visible"
      style={{ minWidth: `${svgWidth}px` }}
    >
      <defs>
        {LANE_PALETTE.map((pal, idx) => (
          <filter key={idx} id={`glow-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={pal.stroke} floodOpacity="0.75" />
          </filter>
        ))}
      </defs>

      {/* 1. Branch Lines & 1-Row Smooth Transition Curves */}
      <g>
        {connections.map((conn, idx) => {
          const x1 = offsetX + conn.fromLane * laneWidth;
          const y1 = conn.fromRow * rowHeight + rowHeight / 2;
          const x2 = offsetX + conn.toLane * laneWidth;
          const y2 = conn.toRow * rowHeight + rowHeight / 2;

          const color = getLaneColor(conn.colorLane);
          const isFocused = focusedLane === null || focusedLane === conn.colorLane;

          let pathD = '';
          if (conn.fromLane === conn.toLane) {
            // Strictly vertical straight line within its own column
            pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
          } else {
            // Smooth single-row S-curve between adjacent lanes
            const midY = (y1 + y2) / 2;
            pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          }

          return (
            <path
              key={`conn-${idx}-${conn.fromRow}-${conn.fromLane}-${conn.toLane}`}
              d={pathD}
              fill="none"
              stroke={color.stroke}
              strokeWidth={isFocused && focusedLane !== null ? '3' : '2'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isFocused ? (focusedLane !== null ? 1 : 0.85) : 0.15}
              filter={isFocused && focusedLane !== null ? `url(#glow-${Math.abs(conn.colorLane) % LANE_PALETTE.length})` : undefined}
              className="pointer-events-auto cursor-pointer transition-all hover:stroke-[3px] hover:opacity-100"
              onClick={() => onSelectLane?.(conn.colorLane)}
            />
          );
        })}
      </g>

      {/* 2. Commit Nodes */}
      <g>
        {nodeCoords.map((node) => {
          const cx = offsetX + node.lane * laneWidth;
          const cy = node.row * rowHeight + rowHeight / 2;
          const color = getLaneColor(node.lane);
          const commit = commits[node.row];
          const isFocused = focusedLane === null || focusedLane === node.lane;

          return (
            <g
              key={`node-${node.hash}-${node.row}`}
              className="pointer-events-auto cursor-pointer transition-opacity"
              opacity={isFocused ? 1 : 0.2}
              onClick={() => onSelectLane?.(node.lane)}
              onMouseEnter={(e) => onHoverNode?.(e, commit, node.lane)}
              onMouseLeave={() => onLeaveNode?.()}
              onContextMenu={(e) => {
                e.preventDefault();
                onNodeContextMenu?.(e, commit);
              }}
            >
              {/* Outer halo for HEAD or Focused node */}
              {(node.isHead || (focusedLane !== null && isFocused)) && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={focusedLane !== null ? '8.5' : '7.5'}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="1.5"
                  strokeDasharray={node.isHead ? '2 2' : 'none'}
                  opacity={0.85}
                  className={node.isHead ? 'animate-pulse' : ''}
                />
              )}

              {/* Main Commit Node Dot */}
              <circle
                cx={cx}
                cy={cy}
                r={node.isMerge ? 4.5 : 4}
                fill={isDark ? '#141418' : '#ffffff'}
                stroke={color.stroke}
                strokeWidth={node.isHead ? '3' : '2'}
                filter={`url(#glow-${Math.abs(node.lane) % LANE_PALETTE.length})`}
              />

              {/* Inner core for merge commits */}
              {node.isMerge && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill={color.stroke}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
