import { create } from 'zustand';
import type { GameState } from '../game/types';

interface GameStore {
  gameState: GameState | null;
  myPlayerId: string | null;
  roomCode: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;

  setGameState:  (state: GameState) => void;
  setMyPlayerId: (id: string) => void;
  setRoomCode:   (code: string) => void;
  setConnected:  (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setError:      (msg: string | null) => void;
  reset:         () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState:   null,
  myPlayerId:  null,
  roomCode:    null,
  connected:   false,
  connecting:  false,
  error:       null,

  setGameState:  (state) => set({ gameState: state }),
  setMyPlayerId: (id)    => set({ myPlayerId: id }),
  setRoomCode:   (code)  => set({ roomCode: code }),
  setConnected:  (v)     => set({ connected: v }),
  setConnecting: (v)     => set({ connecting: v }),
  setError:      (msg)   => set({ error: msg }),
  reset: () => set({
    gameState: null, myPlayerId: null, roomCode: null,
    connected: false, connecting: false, error: null,
  }),
}));
