// Mirror of client/src/game/types.ts — keep in sync

export type ResourceType = 'carrots' | 'fluff' | 'sticks' | 'clay' | 'pebbles';
export type TileType = ResourceType | 'desert';

export interface HexCoord { q: number; r: number; s: number; }

export interface Tile {
  coord: HexCoord;
  type: TileType;
  diceNumber: number | null;
  hasRobber: boolean;
}

export type VertexId = string;
export type EdgeId   = string;

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
  edges:    Record<EdgeId,   Edge>;
}

export type ResourceMap = Record<ResourceType, number>;
export const EMPTY_RESOURCES: ResourceMap = { carrots: 0, fluff: 0, sticks: 0, clay: 0, pebbles: 0 };

export type PlayerColor = 'white' | 'orange' | 'blue' | 'red';
export const PLAYER_COLOR_LIST: PlayerColor[] = ['orange', 'blue', 'red', 'white'];

export type DevCardType =
  | 'guard-bunny' | 'dig-tunnels' | 'spring-harvest' | 'hoard-carrots' | 'lucky-clover';

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

export type GamePhase =
  | 'lobby' | 'setup-place' | 'setup-road'
  | 'roll' | 'robber-move' | 'robber-steal' | 'main' | 'game-over';

export interface GameState {
  roomCode: string;
  players: Player[];
  board: BoardState;
  phase: GamePhase;
  currentPlayerIdx: number;
  setupRound: 1 | 2;
  diceRoll: [number, number] | null;
  longestRoadOwner: string | null;
  largestArmyOwner: string | null;
  winner: string | null;
  devDeckSize: number;
  pendingStealTargets: string[];
}

export const COSTS: Record<string, Partial<ResourceMap>> = {
  burrow:     { sticks: 1, clay: 1, carrots: 1, fluff: 1 },
  road:       { sticks: 1, clay: 1 },
  warren:     { carrots: 2, pebbles: 3 },
  'dev-card': { pebbles: 1, carrots: 1, fluff: 1 },
};

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
