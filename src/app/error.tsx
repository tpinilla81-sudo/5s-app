'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">
        !
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
        Ha ocurrido un error. Esto puede deberse a que el servidor se está reiniciando.
        Intenta de nuevo en unos segundos.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md transition-all"
      >
        Reintentar
      </button>
    </div>
  )
}
