import { GameEngine } from '../game/GameEngine';
import type { GameState } from '../game/types';
import { PLAYER_COLOR_LIST, EMPTY_RESOURCES } from '../game/types';

interface RoomPlayer {
  id: string;
  name: string;
  socketId: string;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  engine: GameEngine | null;
  started: boolean;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  // socket → {roomCode, playerId}
  private socketToPlayer = new Map<string, { roomCode: string; playerId: string }>();

  // ── Room lifecycle ──────────────────────────────────────────────────────────

  createRoom(playerName: string, socketId: string): { roomCode: string; playerId: string } {
    const roomCode = this.generateCode();
    const playerId = this.generateId();
    const room: Room = {
      code: roomCode,
      players: [{ id: playerId, name: playerName, socketId }],
      engine: null,
      started: false,
    };
    this.rooms.set(roomCode, room);
    this.socketToPlayer.set(socketId, { roomCode, playerId });
    return { roomCode, playerId };
  }

  joinRoom(roomCode: string, playerName: string, socketId: string): { playerId: string } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.started) return { error: 'Game already started' };
    if (room.players.length >= 4) return { error: 'Room is full' };

    const playerId = this.generateId();
    room.players.push({ id: playerId, name: playerName, socketId });
    this.socketToPlayer.set(socketId, { roomCode, playerId });
    return { playerId };
  }

  startGame(roomCode: string): GameState | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.players.length < 2) return { error: 'Need at least 2 players' };
    if (room.started) return { error: 'Already started' };

    room.engine = new GameEngine(roomCode, room.players.map(p => ({ id: p.id, name: p.name })));
    room.started = true;
    return room.engine.getPublicState();
  }

  processAction(socketId: string, action: import('../game/types').GameAction): GameState | { error: string } {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return { error: 'Not in a room' };

    const room = this.rooms.get(info.roomCode);
    if (!room?.engine) return { error: 'Game not started' };

    const err = room.engine.process(info.playerId, action);
    if (err) return { error: err };
    return room.engine.getPublicState();
  }

  handleDisconnect(socketId: string): string | null {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return null;
    this.socketToPlayer.delete(socketId);
    return info.roomCode;
  }

  getSocketIds(roomCode: string): string[] {
    return this.rooms.get(roomCode)?.players.map(p => p.socketId) ?? [];
  }

  getRoomForSocket(socketId: string): string | null {
    return this.socketToPlayer.get(socketId)?.roomCode ?? null;
  }

  isRoomHost(roomCode: string, socketId: string): boolean {
    const room = this.rooms.get(roomCode);
    return room?.players[0]?.socketId === socketId;
  }

  getGameState(roomCode: string): GameState | null {
    return this.rooms.get(roomCode)?.engine?.getPublicState() ?? null;
  }

  /** Lobby state before game starts — lets clients show the waiting room */
  getLobbyState(roomCode: string): GameState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.engine) return room.engine.getPublicState();
    return {
      roomCode,
      players: room.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: PLAYER_COLOR_LIST[i % PLAYER_COLOR_LIST.length],
        resources: { ...EMPTY_RESOURCES },
        devCards: [],
        victoryPoints: 0,
        knightsPlayed: 0,
        longestRoad: 0,
      })),
      board: { tiles: [], vertices: {}, edges: {} },
      phase: 'lobby',
      currentPlayerIdx: 0,
      setupRound: 1,
      diceRoll: null,
      longestRoadOwner: null,
      largestArmyOwner: null,
      winner: null,
      devDeckSize: 25,
      pendingStealTargets: [],
    };
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = 'BUNNY-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
