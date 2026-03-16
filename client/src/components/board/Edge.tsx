import React from 'react';
import type { Edge as EdgeData } from '../../game/types';
import { PLAYER_COLORS } from '../../game/types';
import { hexToPixel, hexFromKey } from '../../game/hexMath';

interface Props {
  edge: EdgeData;
  clickable: boolean;
  onClick?: (edgeId: string) => void;
}

function edgeMidpoint(edge: EdgeData): { x: number; y: number } {
  const [hkA, hkB] = edge.adjHexKeys;
  const a = hexToPixel(hexFromKey(hkA));
  const b = hexToPixel(hexFromKey(hkB));
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function Edge({ edge, clickable, onClick }: Props) {
  const road = edge.road;
  if (!road && !clickable) return null;

  const { x, y } = edgeMidpoint(edge);

  const [hkA, hkB] = edge.adjHexKeys;
  const a = hexToPixel(hexFromKey(hkA));
  const b = hexToPixel(hexFromKey(hkB));

  // Direction vector for road orientation
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (road) {
    // Draw a log/stick style road
    return (
      <g
        transform={`translate(${x},${y}) rotate(${angle})`}
        style={{ pointerEvents: 'none' }}
      >
        <rect x={-22} y={-5} width={44} height={10} rx={4}
          fill="#8B4513" stroke="#4a3520" strokeWidth={1.5} />
        {/* Wood grain lines */}
        <line x1={-10} y1={-3} x2={-10} y2={3} stroke="#6B3410" strokeWidth={1} />
        <line x1={0}   y1={-3} x2={0}   y2={3} stroke="#6B3410" strokeWidth={1} />
        <line x1={10}  y1={-3} x2={10}  y2={3} stroke="#6B3410" strokeWidth={1} />
      </g>
    );
  }

  // Clickable ghost road
  return (
    <g
      transform={`translate(${x},${y}) rotate(${angle})`}
      onClick={() => onClick?.(edge.id)}
      style={{ cursor: 'pointer' }}
    >
      <rect x={-22} y={-7} width={44} height={14} rx={5}
        fill="rgba(255,255,255,0.35)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
    </g>
  );
}
