'use client'

import { useAppStore, S_DATA, MINI_STEP_DATA } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lock, CheckCircle2, Circle, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import MiniStepModal from './MiniStepModal'

export default function SStepDetail() {
  const { selectedS, selectS, isMiniStepUnlocked, progress, openModal, activeModal } = useAppStore()

  if (!selectedS) return null

  const sData = S_DATA[selectedS - 1]
  const completedCount = progress.filter((p) => p.sStep === selectedS && p.completed).length

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => selectS(null)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
          style={{ backgroundColor: sData.color }}
        >
          {selectedS}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: sData.color }}>
            {sData.name}
          </h1>
          <p className="text-gray-500 text-sm">{sData.subtitle}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold" style={{ color: sData.color }}>
            {completedCount}/5
          </div>
          <p className="text-xs text-gray-400">mini-pasos</p>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: sData.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / 5) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {completedCount === 5 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-2 font-semibold text-sm"
            style={{ color: sData.color }}
          >
            ¡Quesito conseguido! 🎉
          </motion.p>
        )}
      </div>

      {/* Mini-steps path */}
      <div className="space-y-4">
        {MINI_STEP_DATA.map((ms, index) => {
          const isUnlocked = isMiniStepUnlocked(selectedS, ms.id)
          const isCompleted = progress.some(
            (p) => p.sStep === selectedS && p.miniStep === ms.id && p.completed
          )
          const stepProgress = progress.find(
            (p) => p.sStep === selectedS && p.miniStep === ms.id
          )

          return (
            <motion.div
              key={ms.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isUnlocked ? 1 : 0.5, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Connector line */}
              {index > 0 && (
                <div
                  className="w-0.5 h-4 ml-8"
                  style={{
                    backgroundColor: isUnlocked ? sData.color : '#e5e7eb',
                  }}
                />
              )}

              <button
                onClick={() => isUnlocked && openModal(selectedS, ms.id)}
                disabled={!isUnlocked}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  isCompleted
                    ? 'border-green-200 bg-green-50'
                    : isUnlocked
                    ? 'border-gray-200 bg-white hover:border-opacity-100 hover:shadow-lg cursor-pointer'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                )}
                style={
                  isUnlocked && !isCompleted
                    ? { borderColor: sData.color + '40' }
                    : undefined
                }
              >
                {/* Step number / status */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isUnlocked
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-400'
                  )}
                  style={
                    isUnlocked && !isCompleted
                      ? { backgroundColor: sData.color }
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : isUnlocked ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ms.icon}</span>
                    <h3 className="font-semibold text-gray-900">{ms.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{ms.description}</p>
                  {stepProgress?.score != null && (
                    <p className="text-xs mt-1" style={{ color: sData.color }}>
                      Puntuación: {stepProgress.score}%
                    </p>
                  )}
                </div>

                {/* Step number badge */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {ms.id}
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {activeModal && activeModal.sStep === selectedS && (
          <MiniStepModal sStep={activeModal.sStep} miniStep={activeModal.miniStep} />
        )}
      </AnimatePresence>
    </div>
  )
}
