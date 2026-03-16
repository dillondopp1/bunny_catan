import React from 'react';
import type { ResourceMap } from '../../game/types';
import { RESOURCE_LABELS, TILE_COLORS } from '../../game/types';

interface Props {
  resources: ResourceMap;
}

const RESOURCE_TYPES = ['carrots', 'fluff', 'sticks', 'clay', 'pebbles'] as const;

export default function ResourceHand({ resources }: Props) {
  const total = Object.values(resources).reduce((a, b) => a + b, 0);

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
        Resources ({total})
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {RESOURCE_TYPES.map(res => (
          <div
            key={res}
            style={{
              background: TILE_COLORS[res],
              borderRadius: 8,
              padding: '4px 8px',
              minWidth: 44,
              textAlign: 'center',
              opacity: resources[res] === 0 ? 0.35 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{ fontSize: 18 }}>{RESOURCE_LABELS[res].split(' ')[0]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px #0008' }}>
              {resources[res]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
