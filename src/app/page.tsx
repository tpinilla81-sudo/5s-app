'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { S_STEPS, MINI_STEPS } from '@/lib/5s-constants';
import Board5S from '@/components/5s/Board5S';
import FormacionModal from '@/components/5s/FormacionModal';
import FotosModal from '@/components/5s/FotosModal';
import InventarioModal from '@/components/5s/InventarioModal';
import ActionPlanModal from '@/components/5s/ActionPlanModal';
import GlobalInventoryModal from '@/components/5s/GlobalInventoryModal';
import AuditResultsModal from '@/components/5s/AuditResultsModal';
import AutoevaluacionModal from '@/components/5s/AutoevaluacionModal';
import AuditoriaModal from '@/components/5s/AuditoriaModal';
import LoginPage from '@/components/auth/LoginPage';
import ProjectSetup from '@/components/auth/ProjectSetup';
import TeamManagement from '@/components/auth/TeamManagement';
import RolePermissions from '@/components/auth/RolePermissions';
import AdminPanel from '@/components/admin/AdminPanel';
import MaintenanceView from '@/components/5s/MaintenanceView';
import GerentePanel from '@/components/auth/GerentePanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, RefreshCw, LogOut, Settings, ChevronDown, Shield, ShieldCheck, Unlock, Lock,
  LayoutDashboard, Wrench, Sparkles, BarChart3, FileText, MapPin, ListChecks,
  ClipboardList, GraduationCap, Camera, CheckSquare, Trophy, ChevronRight,
  Lock as LockIcon, AlertTriangle, Building2, Zap
} from 'lucide-react';

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

function getModalType(miniStepId: number, sStep: number): string {
  if (miniStepId === 3) {
    return sStep === 5 ? 'actionplan' : 'inventario';
  }
  const map: Record<number, string> = {
    1: 'formacion',
    2: 'fotos',
    4: 'autoevaluacion',
    5: 'auditoria',
  };
  return map[miniStepId] || 'formacion';
}

const MINI_STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Camera,
  ClipboardList,
  CheckSquare,
  ShieldCheck,
};

export default function HomePage() {
  const {
    activeModal,
    activeMiniStep,
    selectSStep,
    openModal,
    closeModal,
    seedDatabase,
    currentUser,
    currentProject,
    authView,
    isAuthLoading,
    checkSession,
    logout,
    adminFreeNavigation,
    setAdminFreeNavigation,
    currentZone,
    setCurrentZone,
    is5SCompleted,
    getMiniStepStatus,
    isQuesitoEarned,
    progress,
    selectedSStep,
    activeTab,
    setActiveTab,
  } = use5SStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showRolePermissions, setShowRolePermissions] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (authView === 'board' && !isInitialized) {
      const init = async (retries = 3) => {
        try {
          const res = await fetch('/api/progress');
          if (!res.ok && retries > 0) {
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

  const handleOpenModal = (type: string, miniStep: number, sStep: number) => {
    if (sStep && !selectedSStep) {
      selectSStep(sStep);
    } else if (sStep && selectedSStep !== sStep) {
      selectSStep(sStep);
    }
    openModal(type as any, miniStep);
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
      admin: 'Administrador', gerente: 'Gerente', responsable: 'Responsable',
      empleado: 'Empleado', auditor: 'Auditor',
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

  const isGlobalModal = activeModal === 'globalActionPlan' || activeModal === 'globalInventory';
  const ActiveModalComponent = !isGlobalModal && activeModal ? MODAL_MAP[activeModal] : null;

  // Available tabs based on role
  const availableTabs: { key: 'board' | 'gerente' | 'admin' | 'maintenance'; label: string; icon: React.ReactNode }[] = [
    { key: 'board', label: 'Tablero 5S', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  ];
  if (canSeeGerentePanel) {
    availableTabs.push({ key: 'gerente', label: 'Gerencia', icon: <BarChart3 className="h-3.5 w-3.5" /> });
  }
  if (isAdmin) {
    availableTabs.push({ key: 'admin', label: 'Admin', icon: <Shield className="h-3.5 w-3.5" /> });
  }
  if (is5SCompleted()) {
    availableTabs.push({ key: 'maintenance', label: 'Mejora Continua', icon: <Sparkles className="h-3.5 w-3.5" /> });
  }

  // Loading screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
          5S
        </motion.div>
        <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (authView === 'login' || authView === 'register') return <LoginPage />;
  if (authView === 'setup') return <ProjectSetup />;
  if (authView === 'no_projects') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-green-200 mx-auto mb-6">5S</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Bienvenido, {currentUser?.name || 'Usuario'}</h1>
          <p className="text-muted-foreground mb-6">Tu cuenta ha sido creada correctamente. Aún no tienes ningún proyecto asignado.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">El administrador del sistema te asignará un proyecto y un rol. Una vez asignado, podrás acceder a la plataforma.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2"><LogOut className="h-4 w-4" /> Cerrar Sesión</Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SINGLE-SCREEN LAYOUT WITH TABS
  // ============================================================
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Compact Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm shrink-0 z-20">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">5S</div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Metodología 5S</h1>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Implementación</span>
                {currentProject && <span className="text-[10px] text-muted-foreground">· {currentProject.name}</span>}
                {currentZone && <span className="text-[10px] font-medium" style={{ color: currentZone.color || '#3B82F6' }}>· {currentZone.name}</span>}
              </div>
            </div>
            {/* Zone selector */}
            {currentProject && currentProject.zones && currentProject.zones.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <select
                  className="text-[10px] border rounded px-1 py-0.5 bg-background"
                  value={currentZone?.id || ''}
                  onChange={(e) => {
                    const zone = currentProject.zones.find(z => z.id === e.target.value) || null;
                    setCurrentZone(zone);
                  }}
                >
                  <option value="">Sin zona</option>
                  {currentProject.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Quick action buttons */}
            {currentUser && currentProject && (
              <>
                <Button variant="outline" size="sm" onClick={() => openModal('globalActionPlan', 0)}
                  className="gap-1 text-[10px] h-7 border-orange-300 text-orange-600 hover:bg-orange-50">
                  <ListChecks className="h-3 w-3" /> Plan
                </Button>
                <Button variant="outline" size="sm" onClick={() => openModal('globalInventory', 0)}
                  className="gap-1 text-[10px] h-7 border-green-300 text-green-600 hover:bg-green-50">
                  <ClipboardList className="h-3 w-3" /> Inventario
                </Button>
                <Button variant="outline" size="sm" onClick={() => openModal('auditResults', 0)}
                  className="gap-1 text-[10px] h-7 border-blue-300 text-blue-600 hover:bg-blue-50">
                  <ShieldCheck className="h-3 w-3" /> Auditoría
                </Button>
              </>
            )}
            {isAdmin && (
              <Button variant={adminFreeNavigation ? 'default' : 'outline'} size="sm"
                onClick={() => setAdminFreeNavigation(!adminFreeNavigation)}
                className={`gap-1 text-[10px] h-7 ${adminFreeNavigation ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}`}
                title={adminFreeNavigation ? 'Navegación libre activada' : 'Navegación secuencial'}>
                {adminFreeNavigation ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </Button>
            )}
            {canManageTeam && (
              <Button variant="ghost" size="sm" onClick={() => setShowTeamManagement(true)} className="text-green-600 hover:text-green-700 h-7 px-1.5">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowRolePermissions(true)} className="text-green-600 hover:text-green-700 h-7 px-1.5">
              <Shield className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => {
              try {
                const res = await fetch('/api/manual');
                if (!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url; link.download = 'Manual_Usuario_5S.pdf';
                document.body.appendChild(link); link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch { window.open('/Manual_Usuario_5S.pdf', '_blank'); }
            }} className="text-purple-600 hover:text-purple-700 h-7 px-1.5">
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReseed} disabled={isSeeding} className="text-muted-foreground h-7 px-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            </Button>
            {/* User menu */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-7 px-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[9px] font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium max-w-[60px] truncate hidden sm:inline">{currentUser.name}</span>
                    <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium">{currentUser.name}</p>
                    <p className="text-[10px] text-muted-foreground">{currentUser.email}</p>
                    <Badge className={`${getRoleBadgeColor(currentUser.role)} border mt-1 text-[10px]`}>
                      {getRoleLabel(currentUser.role)}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer text-xs">
                    <LogOut className="h-3 w-3 mr-1" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="border-t bg-white flex items-center gap-0 px-4">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-green-500 text-green-700 bg-green-50/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content - SINGLE SCREEN */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!isInitialized || isSeeding ? (
          <div className="flex-1 flex items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
            <p className="text-muted-foreground">{isSeeding ? 'Inicializando datos...' : 'Cargando...'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {/* ═══ TAB: BOARD 5S ═══ */}
              {activeTab === 'board' && (
                <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex">
                  {/* LEFT: Compact Board */}
                  <div className="w-[320px] shrink-0 flex flex-col items-center justify-center p-3 border-r bg-white/50 overflow-auto">
                    <Board5S onSStepClick={handleSStepClick} />
                    {/* Quesitos mini display */}
                    <div className="flex gap-2 mt-2">
                      {S_STEPS.map(s => {
                        const earned = isQuesitoEarned(s.id);
                        return (
                          <div key={s.id} className="flex flex-col items-center" title={`${s.name}: ${earned ? 'Conseguido' : 'Pendiente'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${earned ? 'text-white shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
                              style={earned ? { backgroundColor: s.color, borderColor: s.color } : undefined}>
                              {earned ? '★' : s.id}
                            </div>
                            <span className="text-[8px] mt-0.5 font-medium" style={{ color: earned ? s.color : '#9ca3af' }}>
                              S{s.id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Mejora Continua button */}
                    {is5SCompleted() && (
                      <Button onClick={() => setActiveTab('maintenance')}
                        className="mt-3 gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow text-xs h-7"
                        size="sm">
                        <Sparkles className="h-3 w-3" /> Mejora Continua
                      </Button>
                    )}
                  </div>

                  {/* RIGHT: All 5 S steps with mini-steps */}
                  <div className="flex-1 overflow-auto p-3">
                    <div className="grid grid-cols-1 gap-2">
                      {S_STEPS.map(s => {
                        const earned = isQuesitoEarned(s.id);
                        const sProgress = progress.filter(p => p.sStep === s.id);
                        const completedCount = sProgress.filter(p => p.completed).length;

                        return (
                          <div key={s.id} className="flex items-stretch gap-0 rounded-xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            {/* S Label column */}
                            <div
                              className="w-20 shrink-0 flex flex-col items-center justify-center py-2 cursor-pointer select-none"
                              style={{ backgroundColor: `${s.color}15` }}
                              onClick={() => handleSStepClick(s.id)}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow ${earned ? 'ring-2 ring-yellow-400' : ''}`}
                                style={{ backgroundColor: s.color }}>
                                {earned ? '★' : s.id}
                              </div>
                              <span className="text-[10px] font-bold mt-1 leading-tight text-center" style={{ color: s.color }}>
                                {s.name}
                              </span>
                              <span className="text-[8px] text-muted-foreground">{s.japaneseName}</span>
                              <span className="text-[9px] font-medium mt-0.5" style={{ color: s.color }}>
                                {completedCount}/5
                              </span>
                            </div>

                            {/* Mini-steps row */}
                            <div className="flex-1 flex items-stretch gap-0">
                              {MINI_STEPS.map(ms => {
                                const status = getMiniStepStatus(s.id, ms.id);
                                const isAuditLocked = ms.id === 5 && currentUser && currentUser.role !== 'admin' && currentUser.role !== 'auditor';
                                const effectiveStatus = isAuditLocked ? 'locked' : status;
                                const isLocked = effectiveStatus === 'locked';
                                const isCompleted = effectiveStatus === 'completed';
                                const stepProgress = sProgress.find(p => p.miniStep === ms.id);
                                const IconComp = MINI_STEP_ICONS[ms.icon] || GraduationCap;
                                const modalType = getModalType(ms.id, s.id);

                                return (
                                  <button
                                    key={ms.id}
                                    className={`
                                      flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 border-r last:border-r-0
                                      transition-all text-center relative
                                      ${isLocked ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}
                                      ${isCompleted ? 'bg-green-50/50' : ''}
                                    `}
                                    onClick={() => {
                                      if (!isLocked) {
                                        handleOpenModal(modalType, ms.id, s.id);
                                      }
                                    }}
                                    disabled={isLocked}
                                    title={`${ms.name}${ms.descriptionByS?.[s.id] ? ': ' + ms.descriptionByS[s.id] : ''}${isAuditLocked ? ' (Solo auditores)' : ''}`}
                                  >
                                    {/* Completion indicator dot */}
                                    <div className={`
                                      w-7 h-7 rounded-full flex items-center justify-center mb-0.5
                                      ${isCompleted ? 'bg-green-500 text-white' : isLocked ? 'bg-gray-200 text-gray-400' : 'text-white'}
                                    `}
                                      style={!isCompleted && !isLocked ? { backgroundColor: s.color } : undefined}
                                    >
                                      {isCompleted ? (
                                        <span className="text-xs font-bold">✓</span>
                                      ) : isLocked ? (
                                        <LockIcon className="h-3 w-3" />
                                      ) : (
                                        <IconComp className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    <span className={`text-[9px] font-medium leading-tight ${isLocked ? 'text-gray-400' : isCompleted ? 'text-green-700' : 'text-gray-700'}`}>
                                      {ms.id === 3 && s === S_STEPS[4] ? 'Plan Acc.' : ms.name.length > 12 ? ms.name.split(' ')[0] : ms.name}
                                    </span>
                                    {/* Score badge */}
                                    {isCompleted && stepProgress?.score != null && (
                                      <span className="text-[8px] font-bold text-green-600">{stepProgress.score}%</span>
                                    )}
                                    {/* Audit locked reason */}
                                    {isAuditLocked && (
                                      <span className="text-[7px] text-amber-600 font-medium">Solo audit.</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress Summary */}
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {S_STEPS.map(s => {
                        const earned = isQuesitoEarned(s.id);
                        const sProgress = progress.filter(p => p.sStep === s.id);
                        const completedCount = sProgress.filter(p => p.completed).length;
                        const pct = Math.round((completedCount / 5) * 100);
                        return (
                          <div key={s.id} className="text-center">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ TAB: GERENTE ═══ */}
              {activeTab === 'gerente' && canSeeGerentePanel && (
                <motion.div key="gerente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto p-4">
                  <GerentePanel embedded />
                </motion.div>
              )}

              {/* ═══ TAB: ADMIN ═══ */}
              {activeTab === 'admin' && isAdmin && (
                <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto p-4">
                  <AdminPanel embedded />
                </motion.div>
              )}

              {/* ═══ TAB: MAINTENANCE / MEJORA CONTINUA ═══ */}
              {activeTab === 'maintenance' && is5SCompleted() && (
                <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto p-4">
                  <MaintenanceView embedded />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
      {ActiveModalComponent && selectedSStep && activeMiniStep && (
        <ActiveModalComponent
          open={activeModal !== null}
          onClose={closeModal}
          sStep={selectedSStep}
          miniStep={activeMiniStep}
        />
      )}

      {/* Global Action Plan Modal */}
      {activeModal === 'globalActionPlan' && currentProject && (
        <ActionPlanModal open={true} onClose={closeModal} sStep={selectedSStep || 1} miniStep={0} />
      )}

      {/* Global Inventory Modal */}
      {activeModal === 'globalInventory' && (
        <GlobalInventoryModal open={true} onClose={closeModal} />
      )}

      {/* Audit Results Modal */}
      {activeModal === 'auditResults' && (
        <AuditResultsModal open={true} onClose={closeModal} />
      )}

      {/* Team Management Modal */}
      <TeamManagement open={showTeamManagement} onClose={() => setShowTeamManagement(false)} />

      {/* Role Permissions Modal */}
      <RolePermissions open={showRolePermissions} onClose={() => setShowRolePermissions(false)} />
    </div>
  );
}
