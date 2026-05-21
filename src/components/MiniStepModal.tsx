'use client'

import { useAppStore, S_DATA, MINI_STEP_DATA } from '@/lib/store'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import FormacionModal from './FormacionModal'
import FotosModal from './FotosModal'
import InventarioModal from './InventarioModal'
import AutoevaluacionModal from './AutoevaluacionModal'
import AuditoriaModal from './AuditoriaModal'

interface Props {
  sStep: number
  miniStep: number
}

export default function MiniStepModal({ sStep, miniStep }: Props) {
  const { closeModal } = useAppStore()
  const sData = S_DATA[sStep - 1]
  const msData = MINI_STEP_DATA[miniStep - 1]

  const renderContent = () => {
    switch (miniStep) {
      case 1: return <FormacionModal sStep={sStep} />
      case 2: return <FotosModal sStep={sStep} />
      case 3: return <InventarioModal sStep={sStep} />
      case 4: return <AutoevaluacionModal sStep={sStep} />
      case 5: return <AuditoriaModal sStep={sStep} />
      default: return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: sData.color + '15' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{msData.icon}</span>
            <div>
              <h2 className="font-bold text-lg" style={{ color: sData.color }}>
                {msData.name}
              </h2>
              <p className="text-xs text-gray-500">
                {sData.name} - Paso {miniStep}/5
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </motion.div>
    </motion.div>
  )
}
