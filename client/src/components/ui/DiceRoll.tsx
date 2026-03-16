import React, { useEffect, useState } from 'react';

interface Props {
  dice: [number, number] | null;
  canRoll: boolean;
  onRoll: () => void;
}

const FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceRoll({ dice, canRoll, onRoll }: Props) {
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<[number, number]>([1, 1]);

  useEffect(() => {
    if (dice) {
      setDisplay(dice);
      setRolling(false);
    }
  }, [dice]);

  const handleRoll = () => {
    if (!canRoll || rolling) return;
    setRolling(true);
    // Animate for 600ms
    let ticks = 0;
    const interval = setInterval(() => {
      setDisplay([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
      if (++ticks >= 6) {
        clearInterval(interval);
        onRoll();
      }
    }, 100);
  };

  const total = display[0] + display[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {display.map((d, i) => (
          <span
            key={i}
            style={{
              fontSize: 52,
              lineHeight: 1,
              filter: rolling ? 'blur(1px)' : 'none',
              transition: 'filter 0.1s',
              userSelect: 'none',
            }}
          >
            {FACE[d]}
          </span>
        ))}
      </div>

      {dice && !rolling && (
        <div style={{ color: '#f5e6c8', fontSize: 14, fontWeight: 600 }}>
          Total: <span style={{ color: total === 7 ? '#ff6b6b' : '#ffd700', fontSize: 16 }}>{total}</span>
          {total === 7 && ' 🦊 Fox!'}
        </div>
      )}

      {canRoll && (
        <button
          onClick={handleRoll}
          disabled={rolling}
          style={{
            marginTop: 4,
            padding: '8px 24px',
            background: rolling ? '#666' : '#6a3f14',
            color: '#f5e6c8',
            border: '2px solid #a0682a',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: rolling ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {rolling ? 'Rolling...' : '🎲 Roll Dice'}
        </button>
      )}
    </div>
  );
}
