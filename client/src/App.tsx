import React from 'react';
import { useGameStore } from './store/gameStore';
import { createRoom, joinRoom, sendAction } from './socket/socket';
import Lobby from './components/lobby/Lobby';
import HexGrid from './components/board/HexGrid';
import ResourceHand from './components/ui/ResourceHand';
import DiceRoll from './components/ui/DiceRoll';
import Scoreboard from './components/ui/Scoreboard';
import ActionPanel from './components/ui/ActionPanel';
import type { GameAction } from './game/types';

export default function App() {
  const { gameState, myPlayerId, roomCode, connecting, error } = useGameStore();

  // ── Lobby ───────────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <Lobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        connecting={connecting}
        error={error}
      />
    );
  }

  // ── Game ────────────────────────────────────────────────────────────────────
  const me = gameState.players.find(p => p.id === myPlayerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIdx];
  const isMyTurn = currentPlayer?.id === myPlayerId;

  const handleAction = (action: GameAction) => sendAction(action);

  const handleStartGame = () => sendAction({ type: 'START_GAME' });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a1a1a 0%, #0f2010 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid #4a3520',
      }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#f5e6c8' }}>🐰 Bunny Catan</span>
        <span style={{ fontSize: 13, color: '#b09070' }}>
          Room: <strong style={{ color: '#ffd700' }}>{roomCode}</strong>
        </span>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        overflow: 'hidden',
      }}>
        {/* Board */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          {gameState.phase === 'lobby' ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 16,
            }}>
              <div style={{ fontSize: 18, color: '#f5e6c8' }}>
                Waiting for players... ({gameState.players.length}/4)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gameState.players.map(p => (
                  <div key={p.id} style={{ color: '#b09070', fontSize: 15 }}>
                    🐾 {p.name} {p.id === myPlayerId ? '(you)' : ''}
                  </div>
                ))}
              </div>
              {gameState.players[0]?.id === myPlayerId && gameState.players.length >= 2 && (
                <button
                  onClick={handleStartGame}
                  style={{
                    padding: '12px 32px', background: '#2d6a2d',
                    color: '#f5e6c8', border: '2px solid #4a8a4a',
                    borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  🚀 Start Game
                </button>
              )}
            </div>
          ) : (
            <HexGrid
              board={gameState.board}
              phase={gameState.phase}
              myPlayerId={myPlayerId ?? ''}
              currentPlayerId={currentPlayer?.id ?? ''}
              onAction={handleAction}
            />
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
        }}>
          <Scoreboard
            players={gameState.players}
            currentPlayerIdx={gameState.currentPlayerIdx}
            myPlayerId={myPlayerId ?? ''}
            largestArmyOwner={gameState.largestArmyOwner}
            longestRoadOwner={gameState.longestRoadOwner}
          />

          {me && (
            <ResourceHand resources={me.resources} />
          )}

          {gameState.phase !== 'lobby' && gameState.phase !== 'game-over' && (
            <DiceRoll
              dice={gameState.diceRoll}
              canRoll={isMyTurn && gameState.phase === 'roll'}
              onRoll={() => handleAction({ type: 'ROLL_DICE' })}
            />
          )}

          {gameState.phase !== 'lobby' && gameState.phase !== 'game-over' && (
            <ActionPanel
              state={gameState}
              myPlayerId={myPlayerId ?? ''}
              onAction={handleAction}
            />
          )}

          {gameState.phase === 'game-over' && (
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32 }}>🏆</div>
              <div style={{ color: '#ffd700', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
                {gameState.players.find(p => p.id === gameState.winner)?.name ?? 'Someone'} wins!
              </div>
            </div>
          )}

          {/* Error toast */}
          {error && (
            <div style={{
              background: '#440000', color: '#ff9090',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
