import React from 'react';
import type { Tile } from '../../game/types';
import { TILE_COLORS, TILE_EMOJI } from '../../game/types';
import { hexToPixel, hexCornerPoints, HEX_SIZE } from '../../game/hexMath';
import NumberToken from './NumberToken';

interface Props {
  tile: Tile;
  isRobberTarget: boolean;
  onMoveRobber?: (hexKey: string) => void;
}

export default function HexTile({ tile, isRobberTarget, onMoveRobber }: Props) {
  const { x, y } = hexToPixel(tile.coord);
  const points = hexCornerPoints(x, y);
  const color = TILE_COLORS[tile.type];
  const emoji = TILE_EMOJI[tile.type];
  const hexK = `${tile.coord.q},${tile.coord.r},${tile.coord.s}`;

  const handleClick = () => {
    if (isRobberTarget && onMoveRobber) onMoveRobber(hexK);
  };

  return (
    <g
      onClick={handleClick}
      style={{ cursor: isRobberTarget ? 'pointer' : 'default' }}
    >
      {/* Hex body */}
      <polygon
        points={points}
        fill={color}
        stroke={isRobberTarget ? '#ff4444' : '#4a3520'}
        strokeWidth={isRobberTarget ? 3 : 2}
        opacity={0.92}
      />

      {/* Resource emoji */}
      <text
        x={x}
        y={y - HEX_SIZE * 0.18}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={HEX_SIZE * 0.55}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {emoji}
      </text>

      {/* Robber */}
      {tile.hasRobber && (
        <text
          x={x + HEX_SIZE * 0.38}
          y={y - HEX_SIZE * 0.38}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={HEX_SIZE * 0.42}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          🦊
        </text>
      )}

      {/* Number token */}
      {tile.diceNumber !== null && (
        <NumberToken number={tile.diceNumber} cx={x} cy={y + HEX_SIZE * 0.3} />
      )}

      {/* Robber-target flash ring */}
      {isRobberTarget && (
        <polygon
          points={points}
          fill="none"
          stroke="#ff4444"
          strokeWidth={4}
          opacity={0.6}
          strokeDasharray="8 4"
        />
      )}
    </g>
  );
}
