import React from 'react';
import type { Vertex as VertexData } from '../../game/types';
import { PLAYER_COLORS } from '../../game/types';
import { hexToPixel, hexCorner, HEX_SIZE } from '../../game/hexMath';
import { hexFromKey } from '../../game/hexMath';

interface Props {
  vertex: VertexData;
  clickable: boolean;
  onClick?: (vertexId: string) => void;
}

/** Find the pixel position of a vertex (average of its hex centers) */
function vertexPixel(vertex: VertexData): { x: number; y: number } {
  if (vertex.adjHexKeys.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (const hk of vertex.adjHexKeys) {
    const p = hexToPixel(hexFromKey(hk));
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / vertex.adjHexKeys.length, y: sy / vertex.adjHexKeys.length };
}

export default function Vertex({ vertex, clickable, onClick }: Props) {
  const { x, y } = vertexPixel(vertex);
  const building = vertex.building;

  if (!building && !clickable) return null;

  const size = building?.type === 'warren' ? 13 : 10;
  const color = building ? PLAYER_COLORS[building.type === 'warren'
    ? building.playerId as never  // color passed separately in real use
    : building.playerId as never
  ] : 'transparent';

  // Color from building playerId via store — for now use a placeholder
  const fillColor = building
    ? (building.type === 'warren' ? '#gold' : '#aaa')
    : (clickable ? 'rgba(255,255,255,0.6)' : 'transparent');

  return (
    <g
      onClick={() => clickable && onClick?.(vertex.id)}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      {building?.type === 'warren' ? (
        // Warren = house shape
        <polygon
          points={`${x},${y - size * 1.5} ${x + size},${y - size * 0.3} ${x + size},${y + size * 0.7} ${x - size},${y + size * 0.7} ${x - size},${y - size * 0.3}`}
          fill="#FFD700"
          stroke="#4a3520"
          strokeWidth={2}
        />
      ) : building?.type === 'burrow' ? (
        // Burrow = circle with hole emoji
        <>
          <circle cx={x} cy={y} r={size} fill="#a0522d" stroke="#4a3520" strokeWidth={2} />
          <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11}
            style={{ pointerEvents: 'none', userSelect: 'none' }}>🐾</text>
        </>
      ) : (
        // Empty clickable spot
        <circle
          cx={x}
          cy={y}
          r={9}
          fill="rgba(255,255,255,0.55)"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2}
          strokeDasharray={clickable ? '3 2' : undefined}
        />
      )}
    </g>
  );
}
