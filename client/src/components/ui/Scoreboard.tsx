import React from 'react';
import type { Player, GameState } from '../../game/types';
import { PLAYER_COLORS } from '../../game/types';

interface Props {
  players: Player[];
  currentPlayerIdx: number;
  myPlayerId: string;
  largestArmyOwner: GameState['largestArmyOwner'];
  longestRoadOwner: GameState['longestRoadOwner'];
}

export default function Scoreboard({ players, currentPlayerIdx, myPlayerId, largestArmyOwner, longestRoadOwner }: Props) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ color: '#f5e6c8', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
        Players
      </div>
      {players.map((p, idx) => {
        const isCurrent = idx === currentPlayerIdx;
        const isMe = p.id === myPlayerId;
        const colorHex = PLAYER_COLORS[p.color];
        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: isCurrent ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderRadius: 8,
              padding: '4px 8px',
              border: isCurrent ? `2px solid ${colorHex}` : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {/* Color swatch */}
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: colorHex,
              border: '1.5px solid #fff4',
              flexShrink: 0,
            }} />

            {/* Name */}
            <span style={{ color: '#f5e6c8', fontSize: 13, flex: 1, fontWeight: isMe ? 700 : 400 }}>
              {p.name}{isMe ? ' (you)' : ''}
            </span>

            {/* Badges */}
            <span style={{ fontSize: 12 }}>
              {longestRoadOwner === p.id && '🛤️'}
              {largestArmyOwner === p.id && '🛡️'}
            </span>

            {/* VP */}
            <span style={{
              background: colorHex,
              color: '#fff',
              borderRadius: 6,
              padding: '1px 7px',
              fontSize: 13,
              fontWeight: 700,
              minWidth: 28,
              textAlign: 'center',
              textShadow: '0 1px 2px #0006',
            }}>
              {p.victoryPoints} VP
            </span>
          </div>
        );
      })}
    </div>
  );
}
