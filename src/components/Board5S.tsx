'use client'

import { motion } from 'framer-motion'
import { S_DATA, useAppStore, MINI_STEP_DATA } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function Board5S() {
  const { selectS, progress, isQuesitoEarned } = useAppStore()

  const getCompletedSteps = (sId: number) => {
    return progress.filter((p) => p.sStep === sId && p.completed).length
  }

  return (
    <div className="w-full max-w-lg mx-auto aspect-square relative">
      <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-2xl">
        {/* Outer ring with mini-step indicators */}
        <circle cx="250" cy="250" r="240" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* 5 Pie slices */}
        {S_DATA.map((s, index) => {
          const startAngle = (index * 72 - 90) * (Math.PI / 180)
          const endAngle = ((index + 1) * 72 - 90) * (Math.PI / 180)
          const midAngle = ((index * 72 + 36) - 90) * (Math.PI / 180)
          
          const outerR = 220
          const innerR = 80
          
          // Slice path
          const x1o = 250 + outerR * Math.cos(startAngle)
          const y1o = 250 + outerR * Math.sin(startAngle)
          const x2o = 250 + outerR * Math.cos(endAngle)
          const y2o = 250 + outerR * Math.sin(endAngle)
          const x1i = 250 + innerR * Math.cos(startAngle)
          const y1i = 250 + innerR * Math.sin(startAngle)
          const x2i = 250 + innerR * Math.cos(endAngle)
          const y2i = 250 + innerR * Math.sin(endAngle)
          
          const path = `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i} Z`
          
          // Label position
          const labelR = 155
          const labelX = 250 + labelR * Math.cos(midAngle)
          const labelY = 250 + labelR * Math.sin(midAngle)
          
          // Number position
          const numR = 120
          const numX = 250 + numR * Math.cos(midAngle)
          const numY = 250 + numR * Math.sin(midAngle)
          
          const completed = getCompletedSteps(s.id)
          const quesito = isQuesitoEarned(s.id)
          
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => selectS(s.id)}>
              {/* Main slice */}
              <motion.path
                d={path}
                fill={s.color}
                fillOpacity={0.15}
                stroke={s.color}
                strokeWidth="2"
                whileHover={{ fillOpacity: 0.35, strokeWidth: 3 }}
                transition={{ duration: 0.2 }}
              />
              
              {/* Quesito fill (wedge) */}
              {quesito && (
                <motion.path
                  d={path}
                  fill={s.color}
                  fillOpacity={0.6}
                  initial={{ fillOpacity: 0 }}
                  animate={{ fillOpacity: 0.6 }}
                  transition={{ duration: 0.5 }}
                />
              )}
              
              {/* S Number */}
              <circle cx={numX} cy={numY} r="22" fill={s.color} />
              <text
                x={numX}
                y={numY}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-white font-bold"
                style={{ fontSize: '18px', fill: 'white', fontWeight: 700 }}
              >
                {s.id}
              </text>
              
              {/* S Name */}
              <text
                x={labelX}
                y={labelY - 10}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: '13px', fontWeight: 700, fill: s.color }}
              >
                {s.name}
              </text>
              <text
                x={labelX}
                y={labelY + 8}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: '10px', fill: s.color, opacity: 0.8 }}
              >
                {s.subtitle}
              </text>

              {/* Progress dots around the edge */}
              {MINI_STEP_DATA.map((ms, mi) => {
                const dotAngle = ((index * 72 + (mi + 0.5) * 14.4) - 90) * (Math.PI / 180)
                const dotR = 230
                const dx = 250 + dotR * Math.cos(dotAngle)
                const dy = 250 + dotR * Math.sin(dotAngle)
                const isCompleted = progress.some(
                  (p) => p.sStep === s.id && p.miniStep === ms.id && p.completed
                )
                return (
                  <circle
                    key={mi}
                    cx={dx}
                    cy={dy}
                    r="8"
                    fill={isCompleted ? s.color : '#e5e7eb'}
                    stroke={isCompleted ? s.color : '#d1d5db'}
                    strokeWidth="1.5"
                  />
                )
              })}
            </g>
          )
        })}
        
        {/* Center circle */}
        <motion.circle
          cx="250"
          cy="250"
          r="75"
          fill="white"
          stroke="#22c55e"
          strokeWidth="3"
          whileHover={{ scale: 1.05 }}
        />
        <text
          x="250"
          y="242"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: '32px', fontWeight: 900, fill: '#22c55e' }}
        >
          5S
        </text>
        <text
          x="250"
          y="268"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: '10px', fill: '#6b7280' }}
        >
          Metodología
        </text>
      </svg>
    </div>
  )
}
