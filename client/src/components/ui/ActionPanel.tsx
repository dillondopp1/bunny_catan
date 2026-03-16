import React from 'react';
import type { GameState, GameAction, ResourceType } from '../../game/types';
import { COSTS, RESOURCE_LABELS } from '../../game/types';

interface Props {
  state: GameState;
  myPlayerId: string;
  onAction: (action: GameAction) => void;
}

function canAfford(resources: Record<string, number>, cost: Partial<Record<string, number>>): boolean {
  return Object.entries(cost).every(([r, n]) => (resources[r] ?? 0) >= (n ?? 0));
}

export default function ActionPanel({ state, myPlayerId, onAction }: Props) {
  const { phase, currentPlayerIdx, players } = state;
  const me = players.find(p => p.id === myPlayerId);
  const isMyTurn = players[currentPlayerIdx]?.id === myPlayerId;

  if (!me) return null;

  const phaseLabel: Record<string, string> = {
    'setup-place': `Setup: Place your burrow`,
    'setup-road':  `Setup: Place your first road`,
    'roll':        `Your turn — roll the dice!`,
    'robber-move': `The Fox appeared! Move it to a new tile`,
    'robber-steal':`Choose a player to steal from`,
    'main':        `Trade, build, or end your turn`,
    'game-over':   `Game over!`,
    'lobby':       `Waiting for players...`,
  };

  const label = isMyTurn
    ? (phaseLabel[phase] ?? phase)
    : `Waiting for ${players[currentPlayerIdx]?.name}...`;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Phase label */}
      <div style={{
        color: isMyTurn ? '#ffd700' : '#aaa',
        fontSize: 13,
        fontWeight: 700,
      }}>
        {label}
      </div>

      {isMyTurn && phase === 'main' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ActionButton
            label="🐾 Burrow"
            cost="1🥕 1🏺 1🪵 1🐇"
            enabled={canAfford(me.resources, COSTS.burrow)}
            onClick={() => onAction({ type: 'PLACE_BURROW', vertexId: '' })} // vertex selected on map
            hint="Click a spot on the board"
          />
          <ActionButton
            label="🛤️ Road"
            cost="1🥕 1🏺"
            enabled={canAfford(me.resources, COSTS.road)}
            onClick={() => onAction({ type: 'PLACE_ROAD', edgeId: '' })}
            hint="Click an edge on the board"
          />
          <ActionButton
            label="🏰 Warren"
            cost="2🥕 3🪨"
            enabled={canAfford(me.resources, COSTS.warren)}
            onClick={() => onAction({ type: 'UPGRADE_WARREN', vertexId: '' })}
            hint="Click your burrow on the board"
          />
          <ActionButton
            label="🃏 Dev Card"
            cost="1🪨 1🥕 1🐇"
            enabled={canAfford(me.resources, COSTS['dev-card'])}
            onClick={() => onAction({ type: 'BUY_DEV_CARD' })}
          />
          <ActionButton
            label="End Turn"
            cost=""
            enabled
            onClick={() => onAction({ type: 'END_TURN' })}
            style={{ background: '#2d6a2d' }}
          />
        </div>
      )}

      {/* Dev cards hand */}
      {me.devCards.length > 0 && isMyTurn && phase === 'main' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <div style={{ color: '#f5e6c8', fontSize: 12, width: '100%' }}>Dev Cards:</div>
          {me.devCards.map((card, i) => (
            <DevCardButton key={i} card={card} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  cost: string;
  enabled: boolean;
  onClick: () => void;
  hint?: string;
  style?: React.CSSProperties;
}

function ActionButton({ label, cost, enabled, onClick, hint, style }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={hint}
      style={{
        background: enabled ? '#5a3010' : '#333',
        color: enabled ? '#f5e6c8' : '#777',
        border: `1.5px solid ${enabled ? '#a0682a' : '#555'}`,
        borderRadius: 8,
        padding: '5px 10px',
        fontSize: 13,
        cursor: enabled ? 'pointer' : 'not-allowed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transition: 'background 0.15s',
        ...style,
      }}
    >
      <span style={{ fontWeight: 700 }}>{label}</span>
      {cost && <span style={{ fontSize: 11, opacity: 0.8 }}>{cost}</span>}
    </button>
  );
}

import { DEV_CARD_LABELS } from '../../game/types';
import type { DevCardType } from '../../game/types';

function DevCardButton({ card, onAction }: { card: DevCardType; onAction: (a: GameAction) => void }) {
  const handlers: Record<DevCardType, () => void> = {
    'guard-bunny':    () => onAction({ type: 'PLAY_GUARD_BUNNY' }),
    'dig-tunnels':    () => onAction({ type: 'PLAY_DIG_TUNNELS' }),
    'spring-harvest': () => onAction({ type: 'PLAY_SPRING_HARVEST', r1: 'carrots', r2: 'carrots' }),
    'hoard-carrots':  () => onAction({ type: 'PLAY_HOARD_CARROTS', resource: 'carrots' }),
    'lucky-clover':   () => {},
  };

  return (
    <button
      onClick={handlers[card]}
      style={{
        background: '#1a4a1a',
        color: '#90EE90',
        border: '1.5px solid #2d8a2d',
        borderRadius: 8,
        padding: '4px 8px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {DEV_CARD_LABELS[card]}
    </button>
  );
}
