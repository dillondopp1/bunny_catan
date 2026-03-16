import { HexCoord } from './types';

// Pointy-top hexagons, cube coordinates (q + r + s = 0)
export const HEX_SIZE = 58; // px, center → corner

// ── Coordinate utils ──────────────────────────────────────────────────────────

export function hexKey(h: HexCoord): string {
  return `${h.q},${h.r},${h.s}`;
}

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function hexFromKey(k: string): HexCoord {
  const [q, r, s] = k.split(',').map(Number);
  return { q, r, s };
}

// ── Pixel conversion (pointy-top) ─────────────────────────────────────────────

export function hexToPixel(h: HexCoord, size = HEX_SIZE): { x: number; y: number } {
  return {
    x: size * (Math.sqrt(3) * h.q + (Math.sqrt(3) / 2) * h.r),
    y: size * (1.5 * h.r),
  };
}

// ── Corner points of a pointy-top hex (for SVG polygon) ──────────────────────

export function hexCornerPoints(cx: number, cy: number, size = HEX_SIZE): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // start at top-right
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');
}

/** Returns [x,y] of corner i around center (cx,cy) */
export function hexCorner(cx: number, cy: number, i: number, size = HEX_SIZE): [number, number] {
  const angle = (Math.PI / 3) * i - Math.PI / 6;
  return [cx + size * Math.cos(angle), cy + size * Math.sin(angle)];
}

// ── Neighbors ─────────────────────────────────────────────────────────────────

const NEIGHBOR_DIRS: HexCoord[] = [
  { q:  1, r:  0, s: -1 },
  { q:  1, r: -1, s:  0 },
  { q:  0, r: -1, s:  1 },
  { q: -1, r:  0, s:  1 },
  { q: -1, r:  1, s:  0 },
  { q:  0, r:  1, s: -1 },
];

export function hexNeighbors(h: HexCoord): HexCoord[] {
  return NEIGHBOR_DIRS.map(d => ({ q: h.q + d.q, r: h.r + d.r, s: h.s + d.s }));
}

// ── Board coverage ────────────────────────────────────────────────────────────

/** All cube coords within Manhattan radius (standard Catan = 2 → 19 hexes) */
export function hexesInRadius(radius: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      out.push({ q, r, s: -q - r });
    }
  }
  return out;
}

// ── Vertex & edge IDs ─────────────────────────────────────────────────────────

/**
 * A vertex is shared by up to 3 hexes.
 * ID = sorted hex keys joined with '|'.
 */
export function vertexId(hexes: HexCoord[]): string {
  return hexes.map(hexKey).sort().join('|');
}

/**
 * An edge is shared by 2 hexes.
 * ID = sorted hex keys joined with '|'.
 */
export function edgeId(a: HexCoord, b: HexCoord): string {
  return [hexKey(a), hexKey(b)].sort().join('|');
}

/**
 * For each of the 6 corners of `hex`, return the up-to-3 hexes that share it.
 * Corner i is shared between hex, neighbor[(i+5)%6], and neighbor[i].
 */
export function hexVertexHexes(hex: HexCoord, boardSet: Set<string>): Array<HexCoord[]> {
  const neighbors = hexNeighbors(hex);
  return Array.from({ length: 6 }, (_, i) => {
    const candidates = [hex, neighbors[(i + 5) % 6], neighbors[i]];
    return candidates.filter(h => boardSet.has(hexKey(h)));
  });
}

// ── Road length (BFS/DFS) ─────────────────────────────────────────────────────

/**
 * Compute the longest road for a player using DFS on the edge graph.
 * Edges are edges the player owns. Vertices with opponent buildings break the chain.
 */
export function computeLongestRoad(
  playerId: string,
  edges: Record<string, { adjHexKeys: string[]; road: { playerId: string } | null }>,
  vertices: Record<string, { id: string; adjHexKeys: string[]; building: { type: string; playerId: string } | null }>,
): number {
  // Build adjacency: vertexId → [edgeId] for this player
  const playerEdges = Object.values(edges).filter(e => e.road?.playerId === playerId);
  if (playerEdges.length === 0) return 0;

  // Find vertices involved in player roads
  // Each edge connects two vertices: the shared vertex is found by intersecting adjHexKeys pairs
  // For simplicity, represent as vertex-to-vertex adjacency via edges

  // Build vertex adjacency graph
  const adj: Map<string, Set<string>> = new Map();
  for (const edge of playerEdges) {
    // Find the two vertices on this edge (each vertex's adjHexKeys is a superset of the edge's two hexes)
    const [hkA, hkB] = edge.adjHexKeys;
    const edgeVertices = Object.values(vertices).filter(v => {
      const s = new Set(v.adjHexKeys);
      return s.has(hkA) && s.has(hkB);
    });
    if (edgeVertices.length < 2) continue;
    const [v0, v1] = edgeVertices;
    if (!adj.has(v0.id)) adj.set(v0.id, new Set());
    if (!adj.has(v1.id)) adj.set(v1.id, new Set());
    adj.get(v0.id)!.add(v1.id);
    adj.get(v1.id)!.add(v0.id);
  }

  // DFS from each vertex
  let best = 0;
  const dfs = (cur: string, prev: string | null, visited: Set<string>): number => {
    const v = vertices[cur];
    // Opponent building breaks the road
    if (v?.building && v.building.playerId !== playerId && prev !== null) return 0;
    visited.add(cur);
    let max = 0;
    for (const next of (adj.get(cur) ?? [])) {
      if (!visited.has(next)) {
        max = Math.max(max, 1 + dfs(next, cur, visited));
      }
    }
    visited.delete(cur);
    return max;
  };

  for (const start of adj.keys()) {
    best = Math.max(best, dfs(start, null, new Set()));
  }
  return best;
}
