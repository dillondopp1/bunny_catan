import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ServerToClientEvents, ClientToServerEvents } from './game/types';
import { RoomManager } from './lobby/RoomManager';

const app = express();
const ALLOWED_ORIGINS = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

const rooms = new RoomManager();

// ── REST: health check ────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // ── Create room ─────────────────────────────────────────────────────────────
  socket.on('create_room', (playerName) => {
    try {
      const { roomCode, playerId } = rooms.createRoom(playerName, socket.id);
      socket.join(roomCode);
      socket.emit('room_joined', { roomCode, playerId });
      const lobbyState = rooms.getLobbyState(roomCode);
      if (lobbyState) socket.emit('game_state', lobbyState);
      console.log(`  Room ${roomCode} created by "${playerName}"`);
    } catch (e) {
      socket.emit('error', String(e));
    }
  });

  // ── Join room ───────────────────────────────────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName }) => {
    try {
      const result = rooms.joinRoom(roomCode, playerName, socket.id);
      if ('error' in result) { socket.emit('error', result.error); return; }

      socket.join(roomCode);
      socket.emit('room_joined', { roomCode, playerId: result.playerId });
      console.log(`  "${playerName}" joined ${roomCode}`);

      // Broadcast updated lobby/game state to entire room
      const state = rooms.getLobbyState(roomCode);
      if (state) io.to(roomCode).emit('game_state', state);
    } catch (e) {
      socket.emit('error', String(e));
    }
  });

  // ── Game action ─────────────────────────────────────────────────────────────
  socket.on('game_action', (action) => {
    try {
      const roomCode = rooms.getRoomForSocket(socket.id);
      if (!roomCode) { socket.emit('error', 'Not in a room'); return; }

      // START_GAME is handled specially
      if (action.type === 'START_GAME') {
        if (!rooms.isRoomHost(roomCode, socket.id)) {
          socket.emit('error', 'Only the host can start the game');
          return;
        }
        const result = rooms.startGame(roomCode);
        if ('error' in result) { socket.emit('error', result.error); return; }
        io.to(roomCode).emit('game_state', result);
        return;
      }

      const result = rooms.processAction(socket.id, action);
      if ('error' in result) { socket.emit('error', result.error); return; }
      io.to(roomCode).emit('game_state', result);
    } catch (e) {
      console.error(e);
      socket.emit('error', 'Internal server error');
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomCode = rooms.handleDisconnect(socket.id);
    if (roomCode) {
      console.log(`[-] ${socket.id} left ${roomCode}`);
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Bunny Catan server running on http://localhost:${PORT}`);
});
