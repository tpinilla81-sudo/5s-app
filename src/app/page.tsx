'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';
import Board5S from '@/components/5s/Board5S';
import SStepDetail from '@/components/5s/SStepDetail';
import ProgressDashboard from '@/components/5s/ProgressDashboard';
import FormacionModal from '@/components/5s/FormacionModal';
import FotosModal from '@/components/5s/FotosModal';
import InventarioModal from '@/components/5s/InventarioModal';
import AutoevaluacionModal from '@/components/5s/AutoevaluacionModal';
import AuditoriaModal from '@/components/5s/AuditoriaModal';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

const MODAL_MAP: Record<string, React.ComponentType<{
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}>> = {
  formacion: FormacionModal,
  fotos: FotosModal,
  inventario: InventarioModal,
  autoevaluacion: AutoevaluacionModal,
  auditoria: AuditoriaModal,
};

export default function HomePage() {
  const {
    currentView,
    selectedSStep,
    activeModal,
    activeMiniStep,
    selectSStep,
    setCurrentView,
    openModal,
    closeModal,
    seedDatabase,
  } = use5SStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/progress');
        const json = await res.json();

        if (json.success && json.data && json.data.length > 0) {
          use5SStore.setState({ progress: json.data, isLoadingProgress: false });
          setIsInitialized(true);
        } else {
          setIsSeeding(true);
          await seedDatabase();
          setIsSeeding(false);
          setIsInitialized(true);
        }
      } catch {
        setIsSeeding(true);
        await seedDatabase();
        setIsSeeding(false);
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  const handleSStepClick = (sStep: number) => {
    selectSStep(sStep);
  };

  const handleBack = () => {
    selectSStep(null);
    setCurrentView('board');
  };

  const handleOpenModal = (type: 'formacion' | 'fotos' | 'inventario' | 'autoevaluacion' | 'auditoria', miniStep: number) => {
    openModal(type, miniStep);
  };

  const handleReseed = async () => {
    setIsSeeding(true);
    await seedDatabase();
    setIsSeeding(false);
  };

  const ActiveModalComponent = activeModal ? MODAL_MAP[activeModal] : null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              5S
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Metodología 5S</h1>
              <p className="text-xs text-muted-foreground">Juego de Mesa - Implementación</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReseed}
              disabled={isSeeding}
              className="text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSeeding ? 'animate-spin' : ''}`} />
              Reiniciar
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {!isInitialized || isSeeding ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
            <p className="text-muted-foreground">
              {isSeeding ? 'Inicializando datos...' : 'Cargando...'}
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {currentView === 'board' && (
                <motion.div
                  key="board"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Board */}
                  <div className="mb-6">
                    <Board5S onSStepClick={handleSStepClick} />
                  </div>

                  {/* Instructions */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground">
                      Haga clic en una sección del tablero para ver los mini-pasos de cada S
                    </p>
                  </div>

                  {/* Color legend */}
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {S_STEPS.map(s => (
                      <button
                        key={s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:shadow-sm transition-shadow text-sm"
                        style={{ borderColor: s.color + '40' }}
                        onClick={() => handleSStepClick(s.id)}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-medium" style={{ color: s.color }}>
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Progress Dashboard */}
                  <ProgressDashboard />
                </motion.div>
              )}

              {currentView === 'detail' && selectedSStep && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <SStepDetail
                    sStep={selectedSStep}
                    onBack={handleBack}
                    onOpenModal={handleOpenModal}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Metodología 5S — Juego de Mesa para la Implementación
          </p>
        </div>
      </footer>

      {/* Modals */}
      {ActiveModalComponent && selectedSStep && activeMiniStep && (
        <ActiveModalComponent
          open={activeModal !== null}
          onClose={closeModal}
          sStep={selectedSStep}
          miniStep={activeMiniStep}
        />
      )}
    </div>
  );
}
