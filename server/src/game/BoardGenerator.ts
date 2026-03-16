import type { BoardState, Tile, TileType, Vertex, Edge } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexKey(q: number, r: number, s: number): string {
  return `${q},${r},${s}`;
}

function vertexId(hexes: Array<[number, number, number]>): string {
  return hexes.map(([q, r, s]) => hexKey(q, r, s)).sort().join('|');
}

function edgeId(a: [number, number, number], b: [number, number, number]): string {
  return [hexKey(...a), hexKey(...b)].sort().join('|');
}

const NEIGHBOR_DIRS: Array<[number, number, number]> = [
  [1, 0, -1], [1, -1, 0], [0, -1, 1],
  [-1, 0, 1], [-1, 1, 0], [0, 1, -1],
];

function hexesInRadius(radius: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      out.push([q, r, -q - r]);
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Tile distribution ─────────────────────────────────────────────────────────

const TILE_POOL: TileType[] = [
  'carrots', 'carrots', 'carrots', 'carrots',
  'fluff',   'fluff',   'fluff',   'fluff',
  'sticks',  'sticks',  'sticks',  'sticks',
  'clay',    'clay',    'clay',
  'pebbles', 'pebbles', 'pebbles',
  'desert',
];

const NUMBER_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

const DEV_CARD_DECK = [
  ...Array(14).fill('guard-bunny'),
  ...Array(2).fill('dig-tunnels'),
  ...Array(2).fill('spring-harvest'),
  ...Array(2).fill('hoard-carrots'),
  ...Array(5).fill('lucky-clover'),
];

// ── Main export ───────────────────────────────────────────────────────────────

export function generateBoard(): BoardState & { devDeck: string[] } {
  const coords = hexesInRadius(2); // 19 hexes
  const boardSet = new Set(coords.map(([q, r, s]) => hexKey(q, r, s)));

  const types = shuffle(TILE_POOL);
  const numbers = shuffle(NUMBER_TOKENS);
  let numIdx = 0;

  const tiles: Tile[] = coords.map(([q, r, s], i) => {
    const type = types[i];
    return {
      coord: { q, r, s },
      type,
      diceNumber: type === 'desert' ? null : numbers[numIdx++],
      hasRobber: type === 'desert',
    };
  });

  // Vertices
  const vertices: Record<string, Vertex> = {};
  for (const [q, r, s] of coords) {
    for (let ci = 0; ci < 6; ci++) {
      const [dq1, dr1, ds1] = NEIGHBOR_DIRS[(ci + 5) % 6];
      const [dq2, dr2, ds2] = NEIGHBOR_DIRS[ci];
      const candidates: Array<[number, number, number]> = [
        [q, r, s],
        [q + dq1, r + dr1, s + ds1],
        [q + dq2, r + dr2, s + ds2],
      ];
      const onBoard = candidates.filter(([a, b, c]) => boardSet.has(hexKey(a, b, c)));
      const vId = vertexId(onBoard);
      if (!vertices[vId]) {
        vertices[vId] = { id: vId, adjHexKeys: onBoard.map(([a, b, c]) => hexKey(a, b, c)), building: null };
      }
    }
  }

  // Edges
  const edges: Record<string, Edge> = {};
  for (const [q, r, s] of coords) {
    for (const [dq, dr, ds] of NEIGHBOR_DIRS) {
      const nq = q + dq, nr = r + dr, ns = s + ds;
      if (boardSet.has(hexKey(nq, nr, ns))) {
        const eId = edgeId([q, r, s], [nq, nr, ns]);
        if (!edges[eId]) {
          edges[eId] = { id: eId, adjHexKeys: [hexKey(q, r, s), hexKey(nq, nr, ns)], road: null };
        }
      }
    }
  }

  return { tiles, vertices, edges, devDeck: shuffle(DEV_CARD_DECK) };
}
