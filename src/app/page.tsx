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
import ActionPlanModal from '@/components/5s/ActionPlanModal';
import AutoevaluacionModal from '@/components/5s/AutoevaluacionModal';
import AuditoriaModal from '@/components/5s/AuditoriaModal';
import LoginPage from '@/components/auth/LoginPage';
import ProjectSetup from '@/components/auth/ProjectSetup';
import TeamManagement from '@/components/auth/TeamManagement';
import RolePermissions from '@/components/auth/RolePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AdminPanel from '@/components/admin/AdminPanel';
import MaintenanceView from '@/components/5s/MaintenanceView';
import GerentePanel from '@/components/auth/GerentePanel';
import { Loader2, RefreshCw, LogOut, Settings, ChevronDown, Shield, Unlock, Lock, LayoutDashboard, Wrench, Sparkles, BarChart3, FileText, MapPin } from 'lucide-react';

const MODAL_MAP: Record<string, React.ComponentType<{
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}>> = {
  formacion: FormacionModal,
  fotos: FotosModal,
  inventario: InventarioModal,
  actionplan: ActionPlanModal,
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
    // Auth & project state
    currentUser,
    currentProject,
    authView,
    isAuthLoading,
    checkSession,
    logout,
    // Admin navigation
    adminFreeNavigation,
    setAdminFreeNavigation,
    // Zone
    currentZone,
    setCurrentZone,
    // 5S completion
    is5SCompleted,
  } = use5SStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showRolePermissions, setShowRolePermissions] = useState(false);

  // Check session on mount - only once
  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize board data when auth view is board - with retry
  useEffect(() => {
    if (authView === 'board' && !isInitialized) {
      const init = async (retries = 3) => {
        try {
          const res = await fetch('/api/progress');
          if (!res.ok && retries > 0) {
            // Server might be restarting, wait and retry
            await new Promise(r => setTimeout(r, 2000));
            return init(retries - 1);
          }
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
          if (retries > 0) {
            // Server might be restarting, wait and retry
            await new Promise(r => setTimeout(r, 2000));
            return init(retries - 1);
          }
          setIsSeeding(true);
          await seedDatabase();
          setIsSeeding(false);
          setIsInitialized(true);
        }
      };
      init();
    }
  }, [authView, isInitialized, seedDatabase]);

  const handleSStepClick = (sStep: number) => {
    selectSStep(sStep);
  };

  const handleBack = () => {
    selectSStep(null);
    setCurrentView('board');
  };

  const handleOpenModal = (type: 'formacion' | 'fotos' | 'inventario' | 'actionplan' | 'autoevaluacion' | 'auditoria', miniStep: number) => {
    openModal(type, miniStep);
  };

  const handleReseed = async () => {
    setIsSeeding(true);
    await seedDatabase();
    setIsSeeding(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsInitialized(false);
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Administrador',
      gerente: 'Gerente',
      responsable: 'Responsable',
      empleado: 'Empleado',
      auditor: 'Auditor',
    };
    return map[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      gerente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      responsable: 'bg-blue-100 text-blue-700 border-blue-200',
      empleado: 'bg-green-100 text-green-700 border-green-200',
      auditor: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return map[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const canManageTeam = currentUser && (currentUser.role === 'admin' || currentUser.role === 'responsable');
  const isAdmin = currentUser?.role === 'admin';
  const isGerente = currentUser?.role === 'gerente';
  const canSeeGerentePanel = isAdmin || isGerente;

  const ActiveModalComponent = activeModal ? MODAL_MAP[activeModal] : null;

  // ONLY show loading screen during initial session check
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          5S
        </motion.div>
        <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // Show Login page
  if (authView === 'login' || authView === 'register') {
    return <LoginPage />;
  }

  // Show Project Setup (admin only)
  if (authView === 'setup') {
    return <ProjectSetup />;
  }

  // Show waiting screen for non-admin users without projects
  if (authView === 'no_projects') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-green-200 mx-auto mb-6">
            5S
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Bienvenido, {currentUser?.name || 'Usuario'}</h1>
          <p className="text-muted-foreground mb-6">
            Tu cuenta ha sido creada correctamente. Aún no tienes ningún proyecto asignado.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              El administrador del sistema te asignará un proyecto y un rol. Una vez asignado, podrás acceder a la plataforma.
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Si crees que esto es un error, contacta con tu administrador.
          </p>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </motion.div>
      </div>
    );
  }

  // Show Admin Panel
  if (currentView === 'admin' && isAdmin) {
    return <AdminPanel />;
  }

  // Show Gerente Panel
  if (currentView === 'gerente' && canSeeGerentePanel) {
    return <GerentePanel />;
  }

  // Show Board (authView === 'board')
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              5S
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Metodología 5S</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Implementación</p>
                {currentProject && (
                  <span className="text-xs text-muted-foreground">· {currentProject.name}</span>
                )}
                {currentZone && (
                  <span className="text-xs font-medium" style={{ color: currentZone.color || '#3B82F6' }}>· {currentZone.name}</span>
                )}
              </div>
            </div>
            {/* Zone selector */}
            {currentProject && currentProject.zones && currentProject.zones.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  className="text-xs border rounded-md px-2 py-1 bg-background"
                  value={currentZone?.id || ''}
                  onChange={(e) => {
                    const zoneId = e.target.value;
                    const zone = currentProject.zones.find(z => z.id === zoneId) || null;
                    setCurrentZone(zone);
                  }}
                >
                  <option value="">Sin zona</option>
                  {currentProject.zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('admin')}
                className="gap-1.5 text-xs border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            {canSeeGerentePanel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('gerente')}
                className="gap-1.5 text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Gerencia</span>
              </Button>
            )}
            {isAdmin && (
              <Button
                variant={adminFreeNavigation ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAdminFreeNavigation(!adminFreeNavigation)}
                className={`gap-1.5 text-xs ${
                  adminFreeNavigation
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                    : 'text-amber-600 border-amber-300 hover:bg-amber-50'
                }`}
                title={adminFreeNavigation ? 'Navegación libre activada: puedes acceder a todos los pasos sin completar los previos' : 'Navegación secuencial: debes completar los pasos en orden'}
              >
                {adminFreeNavigation ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{adminFreeNavigation ? 'Libre' : 'Secuencial'}</span>
              </Button>
            )}
            {canManageTeam && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTeamManagement(true)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Settings className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Gestión</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRolePermissions(true)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Shield className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Permisos</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch('/api/manual');
                  if (!res.ok) throw new Error('Download failed');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'Manual_Usuario_5S.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  // Fallback: open directly in new tab
                  window.open('/Manual_Usuario_5S.pdf', '_blank');
                }
              }}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Manual</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReseed}
              disabled={isSeeding}
              className="text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSeeding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>

            {/* User menu */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-8">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                    <Badge className={`${getRoleBadgeColor(currentUser.role)} border mt-1`}>
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

                  {/* Mejora Continua button if 5S completed */}
                  {is5SCompleted() && (
                    <div className="flex justify-center mb-6">
                      <Button
                        onClick={() => setCurrentView('maintenance')}
                        className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                        size="lg"
                      >
                        <Sparkles className="h-5 w-5" />
                        Fase 6: Mejora Continua
                      </Button>
                    </div>
                  )}

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

              {currentView === 'maintenance' && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MaintenanceView />
                </motion.div>
              )}

              {currentView === 'gerente' && (
                <motion.div
                  key="gerente"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GerentePanel />
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
            Metodología 5S — Implementación
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

      {/* Team Management Modal */}
      <TeamManagement
        open={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
      />

      {/* Role Permissions Modal */}
      <RolePermissions
        open={showRolePermissions}
        onClose={() => setShowRolePermissions(false)}
      />
    </div>
  );
}
