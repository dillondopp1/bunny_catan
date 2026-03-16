import type { BoardState, Tile, TileType, Vertex, Edge } from './types';
import { hexesInRadius, hexKey, hexNeighbors, vertexId, edgeId, hexVertexHexes } from './hexMath';

// ── Tile distribution ─────────────────────────────────────────────────────────

const TILE_POOL: TileType[] = [
  'carrots', 'carrots', 'carrots', 'carrots',
  'fluff',   'fluff',   'fluff',   'fluff',
  'sticks',  'sticks',  'sticks',  'sticks',
  'clay',    'clay',    'clay',
  'pebbles', 'pebbles', 'pebbles',
  'desert',
];

// Number tokens (18 — one per non-desert tile), arranged by probability
const NUMBER_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateBoard(): BoardState {
  const hexCoords = hexesInRadius(2); // 19 hexes
  const boardSet = new Set(hexCoords.map(hexKey));

  // Assign types and numbers
  const types = shuffle(TILE_POOL);
  const numbers = shuffle(NUMBER_TOKENS);
  let numIdx = 0;

  const tiles: Tile[] = hexCoords.map((coord, i) => {
    const type = types[i];
    return {
      coord,
      type,
      diceNumber: type === 'desert' ? null : numbers[numIdx++],
      hasRobber: type === 'desert',
    };
  });

  // ── Build vertex map ────────────────────────────────────────────────────────
  const vertices: Record<string, Vertex> = {};

  for (const hex of hexCoords) {
    const cornerGroups = hexVertexHexes(hex, boardSet);
    for (const hexGroup of cornerGroups) {
      const vId = vertexId(hexGroup);
      if (!vertices[vId]) {
        vertices[vId] = {
          id: vId,
          adjHexKeys: hexGroup.map(hexKey),
          building: null,
        };
      }
    }
  }

  // ── Build edge map ──────────────────────────────────────────────────────────
  const edges: Record<string, Edge> = {};

  for (const hex of hexCoords) {
    for (const neighbor of hexNeighbors(hex)) {
      if (boardSet.has(hexKey(neighbor))) {
        const eId = edgeId(hex, neighbor);
        if (!edges[eId]) {
          edges[eId] = {
            id: eId,
            adjHexKeys: [hexKey(hex), hexKey(neighbor)],
            road: null,
          };
        }
      }
    }
  }

  return { tiles, vertices, edges };
}

// ── Helpers for validation (used by GameEngine too) ───────────────────────────

/** Vertices adjacent to a given vertex (share an edge in vertex graph) */
export function adjacentVertices(
  vId: string,
  vertices: Record<string, Vertex>,
  edges: Record<string, Edge>,
): string[] {
  return Object.values(edges)
    .filter(e => {
      // Edge is adjacent to vertex if vertex's adjHexKeys overlaps the edge's adjHexKeys
      const v = vertices[vId];
      if (!v) return false;
      const vSet = new Set(v.adjHexKeys);
      return e.adjHexKeys.every(hk => vSet.has(hk));
    })
    .flatMap(e => {
      // The other vertex on this edge
      return Object.values(vertices).filter(v2 => {
        if (v2.id === vId) return false;
        const v2Set = new Set(v2.adjHexKeys);
        return e.adjHexKeys.every(hk => v2Set.has(hk));
      }).map(v => v.id);
    });
}

/** Edges adjacent to a vertex */
export function edgesForVertex(
  vId: string,
  vertices: Record<string, Vertex>,
  edges: Record<string, Edge>,
): string[] {
  const v = vertices[vId];
  if (!v) return [];
  return Object.values(edges)
    .filter(e => e.adjHexKeys.every(hk => new Set(v.adjHexKeys).has(hk)))
    .map(e => e.id);
}

/** Vertices on a given hex */
export function verticesForHex(hexK: string, vertices: Record<string, Vertex>): string[] {
  return Object.values(vertices)
    .filter(v => v.adjHexKeys.includes(hexK))
    .map(v => v.id);
}
