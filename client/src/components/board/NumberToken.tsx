import React from 'react';

interface Props {
  number: number;
  cx: number;
  cy: number;
}

// Probability dots: how many dots to show per number
const DOTS: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4,  9: 4,
  6: 5,  8: 5,
};

export default function NumberToken({ number, cx, cy }: Props) {
  const isHot = number === 6 || number === 8;
  const dots = DOTS[number] ?? 0;
  const r = 16;

  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <circle cx={cx} cy={cy} r={r} fill="#f5e6c8" stroke="#4a3520" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        fontWeight="bold"
        fill={isHot ? '#cc2200' : '#1a1a1a'}
      >
        {number}
      </text>
      {/* Probability dots */}
      <g>
        {Array.from({ length: dots }, (_, i) => {
          const totalWidth = (dots - 1) * 5;
          const x = cx - totalWidth / 2 + i * 5;
          return (
            <circle
              key={i}
              cx={x}
              cy={cy + 9}
              r={1.5}
              fill={isHot ? '#cc2200' : '#1a1a1a'}
            />
          );
        })}
      </g>
    </g>
  );
}
