'use client';

import { motion } from 'framer-motion';
import { S_STEPS, MINI_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';

interface Board5SProps {
  onSStepClick: (sStep: number) => void;
}

export default function Board5S({ onSStepClick }: Board5SProps) {
  const { getMiniStepStatus, isQuesitoEarned } = use5SStore();

  const cx = 400;
  const cy = 400;
  const outerR = 320;
  const innerR = 96;
  const midR = (outerR + innerR) / 2;
  const stepR = 227;
  const sliceAngle = 360 / 5;

  // Pentagon vertex at a given angle
  const pentagonVertex = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  // Get the path for a pentagon "slice" (triangular section from center to two vertices)
  const getPentagonSlice = (index: number, oR: number, iR: number): string => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);

    const oStart = pentagonVertex(startAngle, oR);
    const oEnd = pentagonVertex(endAngle, oR);
    const iStart = pentagonVertex(startAngle, iR);
    const iEnd = pentagonVertex(endAngle, iR);

    return `M ${oStart.x} ${oStart.y} L ${oEnd.x} ${oEnd.y} L ${iEnd.x} ${iEnd.y} L ${iStart.x} ${iStart.y} Z`;
  };

  // Pentagon outline path (5 vertices connected)
  const getPentagonOutline = (r: number): string => {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * sliceAngle - 90) * (Math.PI / 180);
      const p = pentagonVertex(angle, r);
      points.push(`${p.x},${p.y}`);
    }
    return `M ${points.join(' L ')} Z`;
  };

  const getDotPos = (si: number, mi: number) => {
    const angle = (si * sliceAngle + (mi + 0.5) * (sliceAngle / 5) - 90) * (Math.PI / 180);
    return { x: cx + stepR * Math.cos(angle), y: cy + stepR * Math.sin(angle) };
  };

  const getLabelPos = (i: number) => {
    const angle = (i * sliceAngle + sliceAngle / 2 - 90) * (Math.PI / 180);
    return { x: cx + midR * 0.85 * Math.cos(angle), y: cy + midR * 0.85 * Math.sin(angle) };
  };

  // Circular wedge path for center circle quesitos
  const getCircleWedgePath = (index: number): string => {
    const wIn = 18;
    const wOut = 66;
    const gap = 0.06;
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180) + gap;
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180) - gap;

    const os = { x: cx + wOut * Math.cos(startAngle), y: cy + wOut * Math.sin(startAngle) };
    const oe = { x: cx + wOut * Math.cos(endAngle), y: cy + wOut * Math.sin(endAngle) };
    const ie = { x: cx + wIn * Math.cos(endAngle), y: cy + wIn * Math.sin(endAngle) };
    const is_ = { x: cx + wIn * Math.cos(startAngle), y: cy + wIn * Math.sin(startAngle) };

    return `M ${os.x} ${os.y} A ${wOut} ${wOut} 0 0 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${wIn} ${wIn} 0 0 0 ${is_.x} ${is_.y} Z`;
  };

  return (
    <div className="w-full flex justify-center items-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[750px] max-h-full aspect-square mx-auto"
      >
        <svg viewBox="0 0 800 800" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {S_STEPS.map((s, i) => (
              <linearGradient key={`grad-${i}`} id={`sg${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.75" />
              </linearGradient>
            ))}
            <filter id="shadow1" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#00000025" />
            </filter>
            <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#00000030" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0fdf4" stopOpacity="1" />
              <stop offset="100%" stopColor="#dcfce7" stopOpacity="0.8" />
            </radialGradient>
          </defs>

          {/* Outer glow - pentagon shape */}
          <path d={getPentagonOutline(outerR + 14)} fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5" />
          <path d={getPentagonOutline(outerR + 7)} fill="none" stroke="#d1d5db" strokeWidth="2" opacity="0.3" />

          {/* Background pentagon */}
          <path d={getPentagonOutline(outerR + 2)} fill="#f9fafb" filter="url(#shadow2)" />

          {/* Pentagon slices */}
          {S_STEPS.map((s, i) => {
            const earned = isQuesitoEarned(s.id);

            let completedMiniSteps = 0;
            for (let ms = 1; ms <= 5; ms++) {
              const st = getMiniStepStatus(s.id, ms);
              if (st === 'completed' || st === 'completed_viewonly') completedMiniSteps++;
            }
            const pct = Math.min(Math.round((completedMiniSteps / 5) * 100), 100);
            const allCompleted = earned;

            return (
              <g key={`slice-${i}`}>
                {/* Green glow ring for completed S-steps */}
                {allCompleted && (
                  <path
                    d={getPentagonSlice(i, outerR + 6, outerR - 2)}
                    fill="#22c55e"
                    opacity="0.35"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {allCompleted && (
                  <path
                    d={getPentagonSlice(i, outerR + 3, outerR)}
                    fill="#16a34a"
                    opacity="0.9"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Slice background (pentagon section) */}
                <path
                  d={getPentagonSlice(i, outerR, innerR)}
                  fill={`url(#sg${i})`}
                  stroke={allCompleted ? '#16a34a' : 'white'}
                  strokeWidth={allCompleted ? '3' : '2.5'}
                  filter="url(#shadow1)"
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onClick={() => onSStepClick(s.id)}
                  onMouseEnter={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '1'; }}
                />

                {/* Green overlay for completed slices */}
                {allCompleted && (
                  <path
                    d={getPentagonSlice(i, outerR, innerR)}
                    fill="#22c55e"
                    opacity="0.2"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Inner highlight */}
                <path
                  d={getPentagonSlice(i, outerR - 47, innerR + 7)}
                  fill="white"
                  opacity="0.08"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Mini-step dots */}
                {MINI_STEPS.map((m, j) => {
                  const pos = getDotPos(i, j);
                  const status = getMiniStepStatus(s.id, m.id);
                  const isCompleted = status === 'completed' || status === 'completed_viewonly';
                  const isAvailable = status === 'available';
                  return (
                    <g key={`dot-${i}-${j}`}>
                      {isAvailable && !isCompleted && (
                        <circle cx={pos.x} cy={pos.y} r="21" fill={s.color} opacity="0.15" />
                      )}
                      {isCompleted && (
                        <circle cx={pos.x} cy={pos.y} r="20" fill="#22c55e" opacity="0.2" />
                      )}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isCompleted ? 16 : isAvailable ? 15 : 13}
                        fill={isCompleted ? '#22c55e' : isAvailable ? 'white' : 'rgba(255,255,255,0.25)'}
                        stroke={isCompleted ? '#16a34a' : isAvailable ? s.color : 'rgba(255,255,255,0.6)'}
                        strokeWidth={isCompleted ? '3' : isAvailable ? '3' : '2'}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isCompleted ? 'white' : isAvailable ? s.color : 'rgba(255,255,255,0.4)'}
                        fontSize={isCompleted ? '16' : '13'}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
                      >
                        {isCompleted ? '✓' : m.id}
                      </text>
                    </g>
                  );
                })}

                {/* Earned quesito star indicator */}
                {earned && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle
                      cx={cx + (outerR - 30) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      cy={cy + (outerR - 30) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      r="24"
                      fill="#22c55e"
                      opacity="0.3"
                    />
                    <circle
                      cx={cx + (outerR - 30) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      cy={cy + (outerR - 30) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      r="21"
                      fill="#fbbf24"
                      stroke="#16a34a"
                      strokeWidth="4"
                      filter="url(#glow)"
                    />
                    <text
                      x={cx + (outerR - 30) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      y={cy + (outerR - 30) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180)) + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                      style={{ fontFamily: 'system-ui' }}
                    >
                      ★
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Center circle (instead of inner pentagon) */}
          <circle cx={cx} cy={cy} r={innerR} fill="url(#centerGrad)" stroke="#16a34a" strokeWidth="3.5" filter="url(#shadow1)" />

          {/* Quesito wedges in center circle */}
          {S_STEPS.map((s, i) => {
            const earned = isQuesitoEarned(s.id);
            return (
              <path
                key={`wedge-${i}`}
                d={getCircleWedgePath(i)}
                fill={earned ? s.color : '#d1d5db'}
                stroke="white"
                strokeWidth="1.5"
                opacity={earned ? 1 : 0.35}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Center logo image - fitted to inner circle */}
          <clipPath id="circleClip">
            <circle cx={cx} cy={cy} r={innerR - 4} />
          </clipPath>
          <image
            href="/5s-logo.png"
            x={cx - innerR + 4}
            y={cy - innerR + 4}
            width={(innerR - 4) * 2}
            height={(innerR - 4) * 2}
            clipPath="url(#circleClip)"
            style={{ pointerEvents: 'none' }}
            preserveAspectRatio="xMidYMid meet"
          />


        </svg>
      </motion.div>
    </div>
  );
}
