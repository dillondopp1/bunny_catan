import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, GameAction } from '../game/types';
import { useGameStore } from '../store/gameStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

// In dev the Vite proxy forwards '/' → localhost:3002.
// In production set VITE_SERVER_URL to the Railway/Render server URL.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '/';

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: false });
    attachListeners(socket);
  }
  return socket;
}

function attachListeners(s: AppSocket) {
  const store = useGameStore.getState();

  s.on('connect', () => {
    useGameStore.getState().setConnected(true);
    useGameStore.getState().setConnecting(false);
  });

  s.on('disconnect', () => {
    useGameStore.getState().setConnected(false);
  });

  s.on('room_joined', ({ roomCode, playerId }) => {
    useGameStore.getState().setRoomCode(roomCode);
    useGameStore.getState().setMyPlayerId(playerId);
    useGameStore.getState().setConnecting(false);
  });

  s.on('game_state', (state) => {
    useGameStore.getState().setGameState(state);
  });

  s.on('error', (msg) => {
    useGameStore.getState().setError(msg);
    useGameStore.getState().setConnecting(false);
  });
}

export function createRoom(playerName: string) {
  const s = getSocket();
  useGameStore.getState().setConnecting(true);
  useGameStore.getState().setError(null);
  if (!s.connected) s.connect();
  s.emit('create_room', playerName);
}

export function joinRoom(roomCode: string, playerName: string) {
  const s = getSocket();
  useGameStore.getState().setConnecting(true);
  useGameStore.getState().setError(null);
  if (!s.connected) s.connect();
  s.emit('join_room', { roomCode, playerName });
}

export function sendAction(action: GameAction) {
  getSocket().emit('game_action', action);
}
