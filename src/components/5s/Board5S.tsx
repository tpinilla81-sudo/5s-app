'use client';

import { motion } from 'framer-motion';
import { S_STEPS, MINI_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';

interface Board5SProps {
  onSStepClick: (sStep: number) => void;
}

export default function Board5S({ onSStepClick }: Board5SProps) {
  const { getMiniStepStatus, isQuesitoEarned } = use5SStore();

  const cx = 300;
  const cy = 300;
  const outerR = 250;
  const innerR = 78;
  const midR = (outerR + innerR) / 2;
  const stepR = 190;
  const sliceAngle = 360 / 5;

  const getPath = (index: number, oR: number, iR: number): string => {
    const start = (index * sliceAngle - 90) * (Math.PI / 180);
    const end = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);
    const osx = cx + oR * Math.cos(start);
    const osy = cy + oR * Math.sin(start);
    const oex = cx + oR * Math.cos(end);
    const oey = cy + oR * Math.sin(end);
    const isx = cx + iR * Math.cos(end);
    const isy = cy + iR * Math.sin(end);
    const iex = cx + iR * Math.cos(start);
    const iey = cy + iR * Math.sin(start);
    return `M ${osx} ${osy} A ${oR} ${oR} 0 0 1 ${oex} ${oey} L ${isx} ${isy} A ${iR} ${iR} 0 0 0 ${iex} ${iey} Z`;
  };

  const getDotPos = (si: number, mi: number) => {
    const angle = (si * sliceAngle + (mi + 0.5) * (sliceAngle / 5) - 90) * (Math.PI / 180);
    return { x: cx + stepR * Math.cos(angle), y: cy + stepR * Math.sin(angle) };
  };

  const getLabelPos = (i: number) => {
    const angle = (i * sliceAngle + sliceAngle / 2 - 90) * (Math.PI / 180);
    return { x: cx + midR * 0.78 * Math.cos(angle), y: cy + midR * 0.78 * Math.sin(angle) };
  };

  const getWedgePath = (index: number): string => {
    const wIn = 14;
    const wOut = 55;
    const start = (index * sliceAngle - 90) * (Math.PI / 180) + 0.04;
    const end = ((index + 1) * sliceAngle - 90) * (Math.PI / 180) - 0.04;
    const osx = cx + wOut * Math.cos(start);
    const osy = cy + wOut * Math.sin(start);
    const oex = cx + wOut * Math.cos(end);
    const oey = cy + wOut * Math.sin(end);
    const isx = cx + wIn * Math.cos(end);
    const isy = cy + wIn * Math.sin(end);
    const iex = cx + wIn * Math.cos(start);
    const iey = cy + wIn * Math.sin(start);
    return `M ${osx} ${osy} A ${wOut} ${wOut} 0 0 1 ${oex} ${oey} L ${isx} ${isy} A ${wIn} ${wIn} 0 0 0 ${iex} ${iey} Z`;
  };

  return (
    <div className="w-full flex justify-center items-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[560px] aspect-square mx-auto"
      >
        <svg viewBox="0 0 600 600" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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

          {/* Outer glow ring */}
          <circle cx={cx} cy={cy} r={outerR + 15} fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5" />
          <circle cx={cx} cy={cy} r={outerR + 8} fill="none" stroke="#d1d5db" strokeWidth="2" opacity="0.3" />

          {/* Background circle */}
          <circle cx={cx} cy={cy} r={outerR + 2} fill="#f9fafb" filter="url(#shadow2)" />

          {/* Pie slices */}
          {S_STEPS.map((s, i) => {
            const earned = isQuesitoEarned(s.id);
            return (
              <g key={`slice-${i}`}>
                {/* Slice background (hover target) */}
                <path
                  d={getPath(i, outerR, innerR)}
                  fill={`url(#sg${i})`}
                  stroke="white"
                  strokeWidth="2.5"
                  filter="url(#shadow1)"
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onClick={() => onSStepClick(s.id)}
                  onMouseEnter={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '1'; }}
                />

                {/* Inner highlight line */}
                <path
                  d={getPath(i, outerR - 35, innerR + 5)}
                  fill="white"
                  opacity="0.08"
                  style={{ pointerEvents: 'none' }}
                />

                {/* S Name */}
                <text
                  x={getLabelPos(i).x}
                  y={getLabelPos(i).y - 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.4)', fontFamily: 'system-ui' }}
                >
                  {s.name}
                </text>
                <text
                  x={getLabelPos(i).x}
                  y={getLabelPos(i).y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="9.5"
                  opacity="0.85"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.3)', fontFamily: 'system-ui' }}
                >
                  {s.japaneseName}
                </text>

                {/* Mini-step dots */}
                {MINI_STEPS.map((m, j) => {
                  const pos = getDotPos(i, j);
                  const status = getMiniStepStatus(s.id, m.id);
                  const isCompleted = status === 'completed';
                  const isAvailable = status === 'available';
                  return (
                    <g key={`dot-${i}-${j}`}>
                      {/* Pulse ring for available steps */}
                      {isAvailable && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="16"
                          fill={s.color}
                          opacity="0.15"
                        />
                      )}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isCompleted || isAvailable ? 11 : 10}
                        fill={isCompleted ? '#22c55e' : isAvailable ? 'white' : 'rgba(255,255,255,0.25)'}
                        stroke={isAvailable ? s.color : 'rgba(255,255,255,0.6)'}
                        strokeWidth={isAvailable ? '2.5' : '1.5'}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isCompleted ? 'white' : isAvailable ? s.color : 'rgba(255,255,255,0.4)'}
                        fontSize={isCompleted ? '11' : '10'}
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
                      cx={cx + (outerR - 22) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      cy={cy + (outerR - 22) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      r="16"
                      fill="#fbbf24"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      filter="url(#glow)"
                    />
                    <text
                      x={cx + (outerR - 22) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      y={cy + (outerR - 22) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180)) + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
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

          {/* Center circle */}
          <circle cx={cx} cy={cy} r={innerR} fill="url(#centerGrad)" stroke="#16a34a" strokeWidth="3.5" filter="url(#shadow1)" />

          {/* Quesito wedges in center */}
          {S_STEPS.map((s, i) => {
            const earned = isQuesitoEarned(s.id);
            return (
              <path
                key={`wedge-${i}`}
                d={getWedgePath(i)}
                fill={earned ? s.color : '#d1d5db'}
                stroke="white"
                strokeWidth="1.5"
                opacity={earned ? 1 : 0.35}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#16a34a"
            fontSize="30"
            fontWeight="bold"
            style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
          >
            5S
          </text>
          <text
            x={cx}
            y={cy + 17}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#16a34a"
            fontSize="7.5"
            fontWeight="medium"
            opacity="0.7"
            style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
          >
            METODOLOGÍA
          </text>

          {/* Outer S labels */}
          {S_STEPS.map((s, i) => (
            <text
              key={`olabel-${i}`}
              x={cx + (outerR + 24) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
              y={cy + (outerR + 24) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={s.color}
              fontSize="13"
              fontWeight="bold"
              style={{ pointerEvents: 'none', fontFamily: 'system-ui' }}
            >
              S{i + 1}
            </text>
          ))}
        </svg>
      </motion.div>
    </div>
  );
}
