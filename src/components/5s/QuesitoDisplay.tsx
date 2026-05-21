'use client';

import { S_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';

interface QuesitoDisplayProps {
  sStep?: number; // If provided, show only that S's quesito
  size?: number;
}

export default function QuesitoDisplay({ sStep, size = 120 }: QuesitoDisplayProps) {
  const { isQuesitoEarned } = use5SStore();

  const centerX = size / 2;
  const centerY = size / 2;
  const outerR = size / 2 - 5;
  const innerR = size / 6;

  const sliceAngle = 360 / 5;

  const getWedgePath = (index: number): string => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);
    const gap = 0.04;

    const adjStart = startAngle + gap;
    const adjEnd = endAngle - gap;

    const outerStartX = centerX + outerR * Math.cos(adjStart);
    const outerStartY = centerY + outerR * Math.sin(adjStart);
    const outerEndX = centerX + outerR * Math.cos(adjEnd);
    const outerEndY = centerY + outerR * Math.sin(adjEnd);
    const innerStartX = centerX + innerR * Math.cos(adjEnd);
    const innerStartY = centerY + innerR * Math.sin(adjEnd);
    const innerEndX = centerX + innerR * Math.cos(adjStart);
    const innerEndY = centerY + innerR * Math.sin(adjStart);

    return `M ${outerStartX} ${outerStartY} A ${outerR} ${outerR} 0 0 1 ${outerEndX} ${outerEndY} L ${innerStartX} ${innerStartY} A ${innerR} ${innerR} 0 0 0 ${innerEndX} ${innerEndY} Z`;
  };

  const steps = sStep ? [S_STEPS.find(s => s.id === sStep)!] : S_STEPS;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {steps.map((s, i) => {
        const idx = sStep ? (s.id - 1) : i;
        const earned = isQuesitoEarned(s.id);
        return (
          <path
            key={s.id}
            d={getWedgePath(idx)}
            fill={earned ? s.color : '#e5e7eb'}
            stroke="white"
            strokeWidth="2"
            opacity={earned ? 1 : 0.5}
          />
        );
      })}
      {/* Center dot */}
      <circle cx={centerX} cy={centerY} r={innerR - 2} fill="white" />
    </svg>
  );
}
