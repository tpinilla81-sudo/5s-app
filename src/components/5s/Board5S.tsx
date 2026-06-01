'use client';

import { motion } from 'framer-motion';
import { S_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';

interface Board5SProps {
  onSStepClick: (sStep: number) => void;
}

export default function Board5S({ onSStepClick }: Board5SProps) {
  const { isQuesitoEarned } = use5SStore();

  // 1/3 bigger: outerR from 240 -> 320, viewBox expanded to 800x800
  const cx = 400;
  const cy = 400;
  const outerR = 320;
  const innerR = 96; // circle radius (was pentagon 72, scaled up)
  const sliceAngle = 360 / 5;

  // Pentagon vertex at a given angle
  const pentagonVertex = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  // Pentagon slice path (straight edges)
  const getPentagonSlice = (index: number, oR: number, iR: number): string => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);

    const oStart = pentagonVertex(startAngle, oR);
    const oEnd = pentagonVertex(endAngle, oR);
    const iStart = pentagonVertex(startAngle, iR);
    const iEnd = pentagonVertex(endAngle, iR);

    return `M ${oStart.x} ${oStart.y} L ${oEnd.x} ${oEnd.y} L ${iEnd.x} ${iEnd.y} L ${iStart.x} ${iStart.y} Z`;
  };

  // Pentagon outline path
  const getPentagonOutline = (r: number): string => {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * sliceAngle - 90) * (Math.PI / 180);
      const p = pentagonVertex(angle, r);
      points.push(`${p.x},${p.y}`);
    }
    return `M ${points.join(' L ')} Z`;
  };

  // Label position for each slice (where the number goes)
  const getLabelPos = (i: number) => {
    const angle = (i * sliceAngle + sliceAngle / 2 - 90) * (Math.PI / 180);
    const midR = (outerR + innerR) / 2;
    return { x: cx + midR * 0.78 * Math.cos(angle), y: cy + midR * 0.78 * Math.sin(angle) };
  };

  // Circular wedge path for center circle quesitos
  const getCircleWedgePath = (index: number): string => {
    const wIn = 18;
    const wOut = 68;
    const gap = 0.06; // small gap between wedges
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180) + gap;
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180) - gap;

    const os = { x: cx + wOut * Math.cos(startAngle), y: cy + wOut * Math.sin(startAngle) };
    const oe = { x: cx + wOut * Math.cos(endAngle), y: cy + wOut * Math.sin(endAngle) };
    const ie = { x: cx + wIn * Math.cos(endAngle), y: cy + wIn * Math.sin(endAngle) };
    const is_ = { x: cx + wIn * Math.cos(startAngle), y: cy + wIn * Math.sin(startAngle) };

    // Large arc flag = 0 since each wedge is less than 180 degrees
    return `M ${os.x} ${os.y} A ${wOut} ${wOut} 0 0 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${wIn} ${wIn} 0 0 0 ${is_.x} ${is_.y} Z`;
  };

  return (
    <div className="w-full flex justify-center items-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[640px] max-h-full aspect-square mx-auto"
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
          <path d={getPentagonOutline(outerR + 18)} fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5" />
          <path d={getPentagonOutline(outerR + 9)} fill="none" stroke="#d1d5db" strokeWidth="2" opacity="0.3" />

          {/* Background pentagon */}
          <path d={getPentagonOutline(outerR + 3)} fill="#f9fafb" filter="url(#shadow2)" />

          {/* Pentagon slices */}
          {S_STEPS.map((s, i) => {
            const earned = isQuesitoEarned(s.id);

            return (
              <g key={`slice-${i}`}>
                {/* Green glow ring for completed S-steps */}
                {earned && (
                  <path
                    d={getPentagonSlice(i, outerR + 8, outerR - 2)}
                    fill="#22c55e"
                    opacity="0.35"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {earned && (
                  <path
                    d={getPentagonSlice(i, outerR + 4, outerR)}
                    fill="#16a34a"
                    opacity="0.9"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Slice background */}
                <path
                  d={getPentagonSlice(i, outerR, innerR)}
                  fill={`url(#sg${i})`}
                  stroke={earned ? '#16a34a' : 'white'}
                  strokeWidth={earned ? '3' : '2.5'}
                  filter="url(#shadow1)"
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onClick={() => onSStepClick(s.id)}
                  onMouseEnter={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { (e.currentTarget as SVGPathElement).style.opacity = '1'; }}
                />

                {/* Green overlay for completed slices */}
                {earned && (
                  <path
                    d={getPentagonSlice(i, outerR, innerR)}
                    fill="#22c55e"
                    opacity="0.2"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Inner highlight */}
                <path
                  d={getPentagonSlice(i, outerR - 45, innerR + 8)}
                  fill="white"
                  opacity="0.08"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Number label - just 1,2,3,4,5 in white */}
                <text
                  x={getLabelPos(i).x}
                  y={getLabelPos(i).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="18"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.4)', fontFamily: 'system-ui' }}
                >
                  {i + 1}
                </text>

                {/* Earned star indicator */}
                {earned && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle
                      cx={cx + (outerR - 28) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      cy={cy + (outerR - 28) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      r="22"
                      fill="#22c55e"
                      opacity="0.3"
                    />
                    <circle
                      cx={cx + (outerR - 28) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      cy={cy + (outerR - 28) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      r="20"
                      fill="#fbbf24"
                      stroke="#16a34a"
                      strokeWidth="3"
                      filter="url(#glow)"
                    />
                    <text
                      x={cx + (outerR - 28) * Math.cos(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180))}
                      y={cy + (outerR - 28) * Math.sin(((i + 0.5) * sliceAngle - 90) * (Math.PI / 180)) + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="15"
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

          {/* Center logo image */}
          <image
            href="/5s-logo.png"
            x={cx - 75}
            y={cy - 75}
            width={150}
            height={150}
            style={{ pointerEvents: 'none' }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
