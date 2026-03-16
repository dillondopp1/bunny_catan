import React from 'react';
import type { BoardState, GamePhase, GameAction } from '../../game/types';
import HexTile from './HexTile';
import Vertex from './Vertex';
import Edge from './Edge';
import { hexKey } from '../../game/hexMath';

interface Props {
  board: BoardState;
  phase: GamePhase;
  myPlayerId: string;
  currentPlayerId: string;
  onAction: (action: GameAction) => void;
}

export default function HexGrid({ board, phase, myPlayerId, currentPlayerId, onAction }: Props) {
  const isMyTurn = myPlayerId === currentPlayerId;

  // Determine what's clickable based on phase
  const vertexClickable = isMyTurn && (
    phase === 'setup-place' ||
    phase === 'main'          // for build-burrow / upgrade-warren
  );

  const edgeClickable = isMyTurn && (
    phase === 'setup-road' ||
    phase === 'main'
  );

  const robberMode = isMyTurn && phase === 'robber-move';

  const handleVertexClick = (vertexId: string) => {
    const vertex = board.vertices[vertexId];
    if (!vertex) return;
    if (vertex.building?.type === 'burrow' && vertex.building.playerId === myPlayerId) {
      onAction({ type: 'UPGRADE_WARREN', vertexId });
    } else if (!vertex.building) {
      onAction({ type: 'PLACE_BURROW', vertexId });
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    onAction({ type: 'PLACE_ROAD', edgeId });
  };

  const handleRobberMove = (hk: string) => {
    onAction({ type: 'MOVE_ROBBER', hexKey: hk });
  };

  return (
    <svg
      viewBox="-380 -360 760 720"
      style={{
        width: '100%',
        maxWidth: '640px',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
      }}
    >
      {/* Background ocean */}
      <rect x={-380} y={-360} width={760} height={720} fill="#1a6aa3" rx={24} />

      {/* Hex tiles */}
      {board.tiles.map(tile => (
        <HexTile
          key={hexKey(tile.coord)}
          tile={tile}
          isRobberTarget={robberMode && !tile.hasRobber}
          onMoveRobber={handleRobberMove}
        />
      ))}

      {/* Roads / edges */}
      {Object.values(board.edges).map(edge => (
        <Edge
          key={edge.id}
          edge={edge}
          clickable={edgeClickable && !edge.road}
          onClick={handleEdgeClick}
        />
      ))}

      {/* Settlements / vertices */}
      {Object.values(board.vertices).map(vertex => (
        <Vertex
          key={vertex.id}
          vertex={vertex}
          clickable={vertexClickable && !vertex.building}
          onClick={handleVertexClick}
        />
      ))}
    </svg>
  );
}
