// ── Resource & tile types ─────────────────────────────────────────────────────

export type ResourceType = 'carrots' | 'fluff' | 'sticks' | 'clay' | 'pebbles';
export type TileType = ResourceType | 'desert';

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  carrots: '🥕 Carrots',
  fluff:   '🐇 Fluff',
  sticks:  '🪵 Sticks',
  clay:    '🏺 Clay',
  pebbles: '🪨 Pebbles',
};

export const TILE_COLORS: Record<TileType, string> = {
  carrots: '#FF8C00',
  fluff:   '#C8A2C8',
  sticks:  '#4A7C45',
  clay:    '#B05A2A',
  pebbles: '#708090',
  desert:  '#D2B48C',
};

export const TILE_EMOJI: Record<TileType, string> = {
  carrots: '🥕',
  fluff:   '🐇',
  sticks:  '🪵',
  clay:    '🏺',
  pebbles: '🪨',
  desert:  '🌵',
};

// ── Coordinates ───────────────────────────────────────────────────────────────

/** Cube coordinates: q + r + s = 0 */
export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

// ── Board structures ──────────────────────────────────────────────────────────

export interface Tile {
  coord: HexCoord;
  type: TileType;
  diceNumber: number | null; // null for desert
  hasRobber: boolean;
}

export type VertexId = string; // sorted hex-keys joined by '|'
export type EdgeId = string;   // sorted hex-keys joined by '|'

export interface Vertex {
  id: VertexId;
  adjHexKeys: string[];
  building: { type: 'burrow' | 'warren'; playerId: string } | null;
}

export interface Edge {
  id: EdgeId;
  adjHexKeys: string[];
  road: { playerId: string } | null;
}

export interface BoardState {
  tiles: Tile[];
  vertices: Record<VertexId, Vertex>;
  edges: Record<EdgeId, Edge>;
}

// ── Player ────────────────────────────────────────────────────────────────────

export type ResourceMap = Record<ResourceType, number>;

export const EMPTY_RESOURCES: ResourceMap = {
  carrots: 0, fluff: 0, sticks: 0, clay: 0, pebbles: 0,
};

export type PlayerColor = 'white' | 'orange' | 'blue' | 'red';

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  white:  '#f5f5f5',
  orange: '#FF8C00',
  blue:   '#4169E1',
  red:    '#DC143C',
};

export const PLAYER_COLOR_LIST: PlayerColor[] = ['orange', 'blue', 'red', 'white'];

export type DevCardType =
  | 'guard-bunny'    // Knight
  | 'dig-tunnels'    // Road Building
  | 'spring-harvest' // Year of Plenty
  | 'hoard-carrots'  // Monopoly
  | 'lucky-clover';  // Victory Point

export const DEV_CARD_LABELS: Record<DevCardType, string> = {
  'guard-bunny':    '🛡️ Guard Bunny',
  'dig-tunnels':    '⛏️ Dig Tunnels',
  'spring-harvest': '🌸 Spring Harvest',
  'hoard-carrots':  '🐾 Hoard Carrots',
  'lucky-clover':   '🍀 Lucky Clover',
};

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  resources: ResourceMap;
  devCards: DevCardType[];
  victoryPoints: number;
  knightsPlayed: number;
  longestRoad: number;
}

// ── Game state ────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'
  | 'setup-place'   // place burrow
  | 'setup-road'    // place first road
  | 'roll'
  | 'robber-move'
  | 'robber-steal'
  | 'main'          // trade / build / buy
  | 'game-over';

export interface GameState {
  roomCode: string;
  players: Player[];
  board: BoardState;
  phase: GamePhase;
  currentPlayerIdx: number;
  setupRound: 1 | 2;        // snake draft round
  diceRoll: [number, number] | null;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
  winner: string | null;
  devDeckSize: number;
  pendingStealTargets: string[]; // player ids that can be stolen from
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'ROLL_DICE' }
  | { type: 'PLACE_BURROW';    vertexId: VertexId }
  | { type: 'UPGRADE_WARREN';  vertexId: VertexId }
  | { type: 'PLACE_ROAD';      edgeId: EdgeId }
  | { type: 'MOVE_ROBBER';     hexKey: string }
  | { type: 'STEAL';           targetPlayerId: string }
  | { type: 'BANK_TRADE';      give: ResourceType; receive: ResourceType }
  | { type: 'BUY_DEV_CARD' }
  | { type: 'PLAY_GUARD_BUNNY' }
  | { type: 'PLAY_DIG_TUNNELS' }
  | { type: 'PLAY_SPRING_HARVEST'; r1: ResourceType; r2: ResourceType }
  | { type: 'PLAY_HOARD_CARROTS'; resource: ResourceType }
  | { type: 'END_TURN' };

// ── Building costs ────────────────────────────────────────────────────────────

export const COSTS: Record<string, Partial<ResourceMap>> = {
  burrow:     { sticks: 1, clay: 1, carrots: 1, fluff: 1 },
  road:       { sticks: 1, clay: 1 },
  warren:     { carrots: 2, pebbles: 3 },
  'dev-card': { pebbles: 1, carrots: 1, fluff: 1 },
};

// ── Socket events ─────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  game_state:  (state: GameState) => void;
  error:       (msg: string) => void;
  room_joined: (data: { roomCode: string; playerId: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (playerName: string) => void;
  join_room:   (data: { roomCode: string; playerName: string }) => void;
  game_action: (action: GameAction) => void;
}
