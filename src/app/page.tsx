'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import StandardsLibrary from '@/components/5s/StandardsLibrary';
import PhotoLibrary from '@/components/5s/PhotoLibrary';
import AutoevaluacionModal from '@/components/5s/AutoevaluacionModal';
import AuditoriaModal from '@/components/5s/AuditoriaModal';
import LoginPage from '@/components/auth/LoginPage';
import ProjectSetup from '@/components/auth/ProjectSetup';
import TeamManagement from '@/components/auth/TeamManagement';
import RolePermissions from '@/components/auth/RolePermissions';
import AdminPanel from '@/components/admin/AdminPanel';
import ConstructorPanel from '@/components/admin/ConstructorPanel';
import MaintenanceView from '@/components/5s/MaintenanceView';
import GerentePanel from '@/components/auth/GerentePanel';
import PlanDeAccionView from '@/components/5s/PlanDeAccionView';
import JaulaModal from '@/components/5s/JaulaModal';
import ActivosModal from '@/components/5s/ActivosModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Crown,
  ClipboardList, GraduationCap, Camera, CheckSquare, Trophy, ChevronRight,
  Lock as LockIcon, AlertTriangle, Building2, Zap, Bell, BellRing, BookOpen, Image as ImageIcon,
  Package, BoxSelect, Menu
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
    userZones,
    getAvailableZones,
    is5SCompleted,
    getMiniStepStatus,
    isQuesitoEarned,
    progress,
    selectedSStep,
    activeTab,
    setActiveTab,
    employeeProgress,
  } = use5SStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showRolePermissions, setShowRolePermissions] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [showJaulaModal, setShowJaulaModal] = useState(false);
  const [showActivosModal, setShowActivosModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
            // Also fetch employee progress for the current zone
            const { currentProject, currentZone } = use5SStore.getState();
            if (currentProject && currentZone) {
              await use5SStore.getState().fetchEmployeeProgress(currentProject.id, currentZone.id);
            }
            // Auto-generate audit_ready notifications for any pending audits
            if (currentProject?.id) {
              fetch('/api/notifications/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id }),
              }).catch(e => console.error('Auto-notification error:', e));
            }
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
      gestor: 'Gestor (Dueño)', admin: 'Admin de Empresa', gerente: 'Gerente', responsable: 'Responsable',
      empleado: 'Empleado', auditor: 'Auditor',
    };
    return map[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      gestor: 'bg-red-100 text-red-700 border-red-200',
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      gerente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      responsable: 'bg-blue-100 text-blue-700 border-blue-200',
      empleado: 'bg-green-100 text-green-700 border-green-200',
      auditor: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return map[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Permission helpers — derived from store permissions map (NO admin bypass)
  const permissions = use5SStore(s => s.permissions);
  const hasPermission = useMemo(() => {
    const hp = (perm: string): boolean => {
      if (!currentUser) return false;
      return permissions[currentUser.role]?.[perm] === true;
    };
    return hp;
  }, [currentUser, permissions]);
  const canPerformPerm = useMemo(() => (sStep: number, miniStep: number): boolean => hasPermission(`s${sStep}_step${miniStep}_a1`), [hasPermission]);
  const canViewPerm = useMemo(() => (sStep: number, miniStep: number): boolean => hasPermission(`s${sStep}_step${miniStep}_a0`), [hasPermission]);
  const canAuditAny = useMemo(() => currentUser ? [1,2,3,4,5].some(s => canPerformPerm(s, 5)) : false, [currentUser, canPerformPerm]);
  const canNotifyAudit = hasPermission('notify_audit'); // Only employees (by default) can trigger audit notification
  const canAcceptAuditMeeting = hasPermission('accept_audit_meeting'); // Auditors and responsables can accept audit meetings
  const isResponsable = currentUser?.role === 'responsable';
  const canSeeNotifications = hasPermission('view_board'); // All board users can see notifications

  // Fetch notifications — must be after canSeeNotifications is defined
  useEffect(() => {
    if (canSeeNotifications && currentUser?.id && currentProject?.id) {
      const fetchNotifs = async () => {
        try {
          const res = await fetch(`/api/notifications?userId=${currentUser.id}&projectId=${currentProject.id}&unread=true`);
          const data = await res.json();
          if (data.success) {
            setUnreadNotifs(data.data?.length || 0);
          }
        } catch (e) { console.error('Error fetching notifications:', e); }
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
      return () => clearInterval(interval);
    } else {
      setUnreadNotifs(0);
    }
  }, [canSeeNotifications, currentUser?.id, currentProject?.id]);

  const canManageTeam = currentUser && hasPermission('add_members');
  const canSkipSteps = hasPermission('skip_steps');
  // Role checks
  const isGestor = currentUser?.role === 'gestor';
  const isAdmin = currentUser?.role === 'admin';
  const canSeeGerentePanel = hasPermission('view_progress') || hasPermission('edit_project');

  const isGlobalModal = activeModal === 'globalActionPlan' || activeModal === 'globalInventory' || activeModal === 'photoLibrary' || activeModal === 'standardsLibrary' || activeModal === 'auditResults';
  const ActiveModalComponent = !isGlobalModal && activeModal ? MODAL_MAP[activeModal] : null;

  // Available tabs based on role
  // GESTOR (dueño de la app): ONLY sees "Gestión" tab (company management platform)
  // ADMIN (admin de empresa): sees operational tabs (board, gerencia, admin, mejora continua)
  const availableTabs: { key: 'board' | 'gerente' | 'admin' | 'maintenance' | 'gestion' | 'actionplan'; label: string; icon: React.ReactNode }[] = [];

  if (isGestor) {
    // Gestor ONLY sees the platform management tab
    availableTabs.push({ key: 'gestion', label: 'Gestión', icon: <Crown className="h-3.5 w-3.5" /> });
  } else {
    // All other roles see the operational tabs
    availableTabs.push({ key: 'board', label: 'Tablero 5S', icon: <LayoutDashboard className="h-3.5 w-3.5" /> });
    // Plan de Acción: visible to all EXCEPT auditor
    const isAuditor = currentUser?.role === 'auditor';
    if (!isAuditor) {
      availableTabs.push({ key: 'actionplan', label: 'Plan de Acción', icon: <ListChecks className="h-3.5 w-3.5" /> });
    }
    if (canSeeGerentePanel) {
      availableTabs.push({ key: 'gerente', label: 'Gerencia', icon: <BarChart3 className="h-3.5 w-3.5" /> });
    }
    if (isAdmin) {
      availableTabs.push({ key: 'admin', label: 'Admin', icon: <Shield className="h-3.5 w-3.5" /> });
    }
    // Mejora Continua: always visible (Phase 6 / PDCA)
    availableTabs.push({ key: 'maintenance', label: 'Mejora Continua', icon: <Sparkles className="h-3.5 w-3.5" /> });
  }

  // Loading screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16">
          <img src="/5s-logo.png" alt="5S" className="w-full h-full object-contain" />
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
          <div className="w-20 h-20 mx-auto mb-6">
            <img src="/5s-logo.png" alt="5S" className="w-full h-full object-contain" />
          </div>
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
            <div className="w-8 h-8">
              <img src="/5s-logo.png" alt="5S" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight tracking-wide">5S</h1>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-green-600">by Método</span>
                {isGestor && <span className="text-[10px] font-semibold text-red-500">· Gestor</span>}
                {!isGestor && currentProject && <span className="text-[10px] text-muted-foreground">· {currentProject.name}</span>}
                {!isGestor && currentZone && <span className="text-[10px] font-medium" style={{ color: currentZone.color || '#3B82F6' }}>· {currentZone.name}</span>}
              </div>
            </div>
            {/* Zone selector — only for non-gestor users */}
            {!isGestor && (() => {
              const availableZones = getAvailableZones();
              const isSingleZone = availableZones.length === 1;
              const isZoneRestricted = currentUser && !hasPermission('manage_zones');
              if (!currentProject || availableZones.length === 0) return null;
              return (
                <div className="flex items-center gap-1 ml-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {isSingleZone && isZoneRestricted ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                      style={{ color: availableZones[0].color, borderColor: availableZones[0].color, backgroundColor: `${availableZones[0].color}15` }}>
                      {availableZones[0].name}
                    </span>
                  ) : (
                    <select
                      className="text-[10px] border rounded px-1 py-0.5 bg-background"
                      value={currentZone?.id || ''}
                      onChange={(e) => {
                        const zone = availableZones.find(z => z.id === e.target.value) || null;
                        setCurrentZone(zone);
                      }}
                    >
                      <option value="">Sin zona</option>
                      {availableZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── GESTOR HEADER: solo Avisos, Manual y Login ── */}
          {isGestor ? (
            <div className="flex items-center gap-2">
              {/* Avisos */}
              <Button variant={unreadNotifs > 0 ? 'default' : 'outline'} size="sm"
                className={`relative gap-1 text-[10px] h-8 ${unreadNotifs > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                onClick={async () => {
                  if (currentUser?.id) {
                    try {
                      const res = await fetch(`/api/notifications?userId=${currentUser.id}&unread=true`);
                      const data = await res.json();
                      if (data.success) setNotifs(data.data || []);
                    } catch (e) { console.error(e); }
                  }
                  setShowNotifs(!showNotifs);
                }}>
                {unreadNotifs > 0 ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3 w-3" />}
                <span>{unreadNotifs > 0 ? `${unreadNotifs} avisos` : 'Avisos'}</span>
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
                )}
              </Button>
              {/* Manual */}
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
              }} className="text-purple-600 hover:text-purple-700 h-8 px-2">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-[10px]">Manual</span>
              </Button>
              {/* User menu (Login) */}
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-[9px] font-bold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium max-w-[80px] truncate">{currentUser.name}</span>
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
          ) : (
          /* ── NON-GESTOR HEADER: mobile vs desktop ── */
          isMobile ? (
            <div className="flex items-center gap-1">
              {/* 🔔 Notification bell - always visible */}
              {canSeeNotifications && (
                <Button variant={unreadNotifs > 0 ? 'default' : 'outline'} size="sm"
                  className={`relative w-11 h-11 ${unreadNotifs > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                  onClick={async () => {
                    if (currentUser?.id && currentProject?.id) {
                      try {
                        const res = await fetch(`/api/notifications?userId=${currentUser.id}&projectId=${currentProject.id}`);
                        const data = await res.json();
                        if (data.success) setNotifs(data.data || []);
                      } catch (e) { console.error(e); }
                    }
                    setShowNotifs(!showNotifs);
                  }}>
                  {unreadNotifs > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
                  )}
                </Button>
              )}
              {/* 👤 User avatar - always visible */}
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-11 h-11 p-0">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
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
              {/* ☰ Hamburger menu - opens Sheet with all actions */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="w-11 h-11 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-left">Menú</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col p-2 gap-1 overflow-y-auto">
                    {/* 📦 Inventario */}
                    {canSeeNotifications && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-red-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); setShowJaulaModal(true); }}>
                        <Package className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-sm font-medium text-red-600">Inventario</span>
                      </button>
                    )}
                    {/* ✅ Activos */}
                    {canSeeNotifications && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-green-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); setShowActivosModal(true); }}>
                        <BoxSelect className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="text-sm font-medium text-green-600">Activos</span>
                      </button>
                    )}
                    {/* 📸 Fotos */}
                    {canSeeNotifications && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-purple-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); openModal('photoLibrary', 2); }}>
                        <Camera className="h-5 w-5 text-purple-500 shrink-0" />
                        <span className="text-sm font-medium text-purple-600">Fotos</span>
                      </button>
                    )}
                    {/* 📚 Estándares */}
                    {canSeeNotifications && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-indigo-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); openModal('standards', 3); }}>
                        <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium text-indigo-600">Estándares</span>
                      </button>
                    )}
                    {/* 📋 Plan de Acción */}
                    {canSeeNotifications && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-orange-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); setActiveTab('actionplan'); }}>
                        <ListChecks className="h-5 w-5 text-orange-500 shrink-0" />
                        <span className="text-sm font-medium text-orange-600">Plan de Acción</span>
                      </button>
                    )}
                    {/* 🔓 Lock/Unlock */}
                    {(isAdmin || canSkipSteps) && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-amber-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); setAdminFreeNavigation(!adminFreeNavigation); }}>
                        {adminFreeNavigation ? <Unlock className="h-5 w-5 text-amber-500 shrink-0" /> : <Lock className="h-5 w-5 text-amber-500 shrink-0" />}
                        <span className="text-sm font-medium text-amber-600">{adminFreeNavigation ? 'Navegación libre' : 'Navegación secuencial'}</span>
                      </button>
                    )}
                    <div className="border-t my-1" />
                    {/* ⚙️ Settings */}
                    {canManageTeam && (
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-green-50 transition-colors text-left min-h-[44px]"
                        onClick={() => { setMobileMenuOpen(false); setShowTeamManagement(true); }}>
                        <Settings className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="text-sm font-medium text-green-600">Equipo</span>
                      </button>
                    )}
                    {/* 🛡️ Shield */}
                    <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-green-50 transition-colors text-left min-h-[44px]"
                      onClick={() => { setMobileMenuOpen(false); setShowRolePermissions(true); }}>
                      <Shield className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-green-600">Permisos</span>
                    </button>
                    {/* 📄 Manual */}
                    <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-purple-50 transition-colors text-left min-h-[44px]"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        (async () => {
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
                        })();
                      }}>
                      <FileText className="h-5 w-5 text-purple-500 shrink-0" />
                      <span className="text-sm font-medium text-purple-600">Manual</span>
                    </button>
                    {/* 🔄 Refresh */}
                    <button className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                      onClick={() => { setMobileMenuOpen(false); handleReseed(); }}
                      disabled={isSeeding}>
                      <RefreshCw className={`h-5 w-5 text-gray-500 shrink-0 ${isSeeding ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium text-gray-600">Actualizar</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
            {/* 🔔 Notification bell */}
            {canSeeNotifications && (
              <Button variant={unreadNotifs > 0 ? 'default' : 'outline'} size="sm"
                className={`relative gap-1 text-[10px] h-8 ${unreadNotifs > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                onClick={async () => {
                  if (currentUser?.id && currentProject?.id) {
                    try {
                      const res = await fetch(`/api/notifications?userId=${currentUser.id}&projectId=${currentProject.id}`);
                      const data = await res.json();
                      if (data.success) setNotifs(data.data || []);
                    } catch (e) { console.error(e); }
                  }
                  setShowNotifs(!showNotifs);
                }}>
                {unreadNotifs > 0 ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3 w-3" />}
                <span className="hidden sm:inline">{unreadNotifs > 0 ? `${unreadNotifs} avisos` : 'Avisos'}</span>
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
                )}
              </Button>
            )}
            {/* 📦 Inventario (Jaula de Excedentes) */}
            {canSeeNotifications && (
              <Button variant="outline" size="sm"
                className="gap-1 text-[10px] h-8 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowJaulaModal(true)}
                title="Inventario de Innecesarios">
                <Package className="h-3 w-3" />
                <span className="hidden sm:inline">Inventario</span>
              </Button>
            )}
            {/* ✅ Activos (Necesarios) */}
            {canSeeNotifications && (
              <Button variant="outline" size="sm"
                className="gap-1 text-[10px] h-8 border-green-300 text-green-600 hover:bg-green-50"
                onClick={() => setShowActivosModal(true)}
                title="Activos (Necesarios)">
                <BoxSelect className="h-3 w-3" />
                <span className="hidden sm:inline">Activos</span>
              </Button>
            )}
            {/* 📸 Biblioteca de Fotos */}
            {canSeeNotifications && (
              <Button variant="outline" size="sm"
                className="gap-1 text-[10px] h-8 border-purple-300 text-purple-600 hover:bg-purple-50"
                onClick={() => openModal('photoLibrary', 2)}
                title="Biblioteca de Fotos">
                <Camera className="h-3 w-3" />
                <span className="hidden sm:inline">Fotos</span>
              </Button>
            )}
            {/* 📚 Biblioteca de Estándares */}
            {canSeeNotifications && (
              <Button variant="outline" size="sm"
                className="gap-1 text-[10px] h-8 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                onClick={() => openModal('standards', 3)}
                title="Biblioteca de Estándares">
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Estándares</span>
              </Button>
            )}
            {/* 📋 Plan de Acción General */}
            {canSeeNotifications && (
              <Button variant="outline" size="sm"
                className="gap-1 text-[10px] h-8 border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={() => setActiveTab('actionplan')}
                title="Plan de Acción General">
                <ListChecks className="h-3 w-3" />
                <span className="hidden sm:inline">Plan Acc.</span>
              </Button>
            )}
            {/* Free navigation lock */}
            {(isAdmin || canSkipSteps) && (
              <Button variant={adminFreeNavigation ? 'default' : 'outline'} size="sm"
                onClick={() => setAdminFreeNavigation(!adminFreeNavigation)}
                className={`gap-1 text-[10px] h-8 ${adminFreeNavigation ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}`}
                title={adminFreeNavigation ? 'Navegación libre activada' : 'Navegación secuencial'}>
                {adminFreeNavigation ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </Button>
            )}
            {canManageTeam && (
              <Button variant="ghost" size="sm" onClick={() => setShowTeamManagement(true)} className="text-green-600 hover:text-green-700 h-8 px-1.5">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowRolePermissions(true)} className="text-green-600 hover:text-green-700 h-8 px-1.5">
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
            }} className="text-purple-600 hover:text-purple-700 h-8 px-1.5">
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReseed} disabled={isSeeding} className="text-muted-foreground h-8 px-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            </Button>
            {/* User menu */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
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
          )
          )}
        </div>

        {/* Tab Navigation Bar — desktop: top tabs, mobile: hidden (bottom nav instead) */}
        {!isMobile && (
        <div className="border-t bg-white flex items-center gap-0 px-2 sm:px-4 overflow-x-auto">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
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
        )}
      </header>

      {/* Notification dropdown */}
      {showNotifs && (canSeeNotifications || isGestor) && (
        <div className="fixed top-12 right-2 sm:right-16 left-2 sm:left-auto z-50 sm:w-80 w-[calc(100vw-16px)] bg-white border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Notificaciones</span>
            {notifs.length > 0 && (
              <button className="text-[10px] text-blue-600 hover:underline" onClick={async () => {
                if (currentUser?.id) {
                  await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true, userId: currentUser.id }) });
                  setUnreadNotifs(0);
                  setNotifs(notifs.map(n => ({ ...n, read: true })));
                }
              }}>Marcar todo como leído</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No hay notificaciones</div>
          ) : (
            <div className="divide-y">
              {notifs.map((n: any) => (
                <div key={n.id} className={`p-3 ${n.read ? 'bg-white' : n.type === 'audit_requested' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {n.type === 'audit_requested' && <BellRing className="h-3 w-3 text-orange-500 shrink-0" />}
                    {n.type === 'audit_ready' && <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />}
                    {n.type === 'audit_meeting_accepted' && <CheckSquare className="h-3 w-3 text-green-600 shrink-0" />}
                    <p className="text-xs font-semibold">{n.title}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[9px] text-muted-foreground">{new Date(n.createdAt).toLocaleString('es-ES')}</p>
                    {/* Accept audit meeting button — only for audit_requested notifications and users with accept_audit_meeting permission */}
                    {n.type === 'audit_requested' && !n.read && canAcceptAuditMeeting && (
                      <button
                        className="text-[10px] font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded border border-green-300 transition-colors"
                        onClick={async () => {
                          try {
                            // Mark this notification as read
                            await fetch('/api/notifications', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ notificationId: n.id, read: true }),
                            });
                            // Send acceptance notification back to the employee who requested
                            // Find the zone info for context
                            const zoneName = currentZone?.name || 'la zona';
                            const sStepName = n.sStep ? `S${n.sStep} (${S_STEPS.find(s => s.id === n.sStep)?.japaneseName || ''})` : 'la auditoría';
                            // Notify all employees in the zone
                            if (currentProject?.id && currentZone?.id) {
                              const membersRes = await fetch(`/api/projects/${currentProject.id}/members`);
                              const membersData = await membersRes.json();
                              const employees = (membersData?.members || []).filter((m: any) => m.role === 'empleado');
                              for (const emp of employees) {
                                await fetch('/api/notifications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: emp.userId,
                                    type: 'audit_meeting_accepted',
                                    title: `Reunión aceptada: ${sStepName}`,
                                    message: `${currentUser?.name || 'El auditor/responsable'} ha aceptado la reunión de auditoría para ${sStepName} en la zona "${zoneName}".`,
                                    sStep: n.sStep,
                                    zoneId: currentZone.id,
                                    projectId: currentProject.id,
                                  }),
                                });
                              }
                            }
                            // Refresh notifications
                            setNotifs(notifs.map((nn: any) => nn.id === n.id ? { ...nn, read: true } : nn));
                            setUnreadNotifs(prev => Math.max(0, prev - 1));
                            alert('Reunión de auditoría aceptada. Se ha notificado al empleado.');
                          } catch (err) {
                            console.error('Error accepting meeting:', err);
                            alert('Error al aceptar la reunión.');
                          }
                        }}
                      >
                        ✓ Aceptar reunión
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main content - SINGLE SCREEN */}
      <main className={`flex-1 overflow-hidden flex flex-col ${isMobile ? 'pb-14' : ''}`}>
        {!isInitialized || isSeeding ? (
          <div className="flex-1 flex items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
            <p className="text-muted-foreground">{isSeeding ? 'Inicializando datos...' : 'Cargando...'}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              {/* ═══ TAB: BOARD 5S — Board-Centric Layout ═══ */}
              {activeTab === 'board' && (
                <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                  {/* TOP: Hero Board - Centered and Prominent (scrollable area) */}
                  <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-start py-2">
                    {/* Zone required message for empleados without zone assigned */}
                    {!currentZone && currentUser && !hasPermission('manage_zones') && getAvailableZones().length === 0 && (
                      <div className="text-center space-y-3 py-8">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                          <MapPin className="h-8 w-8 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Sin zona asignada</h3>
                        <p className="text-sm text-muted-foreground max-w-md">Tu responsable aún no te ha asignado ninguna zona. Una vez asignada, podrás comenzar tu formación y completar los pasos 5S.</p>
                      </div>
                    )}
                    {/* Zone selector prompt when user has zones but none selected */}
                    {!currentZone && getAvailableZones().length > 0 && (
                      <div className="text-center space-y-2 py-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                          <MapPin className="h-6 w-6 text-blue-500" />
                        </div>
                        <p className="text-xs text-muted-foreground">Selecciona una zona en la barra superior para comenzar</p>
                      </div>
                    )}
                    {currentZone && (
                      <div className="w-full flex-1 min-h-0 flex items-center justify-center px-2">
                        <Board5S onSStepClick={handleSStepClick} />
                      </div>
                    )}
                    {/* Notification: show which S-steps are ready for audit — only for users who can notify (employees) */}
                    {currentZone && canNotifyAudit && (() => {
                      const readyForAudit: number[] = [];
                      for (let s = 1; s <= 5; s++) {
                        // Check using BOTH zone-level AND employee-level progress
                        const steps1to4Done = [1,2,3,4].every(ms => {
                          const zoneCompleted = progress.some(p =>
                            p.sStep === s && p.miniStep === ms &&
                            (p.zoneId === currentZone.id || p.zoneId === null) &&
                            p.completed
                          );
                          const empCompleted = employeeProgress.some(ep =>
                            ep.sStep === s && ep.miniStep === ms &&
                            ep.zoneId === currentZone.id &&
                            ep.completed
                          );
                          return zoneCompleted || empCompleted;
                        });
                        const step5Done = progress.some(p =>
                          p.sStep === s && p.miniStep === 5 &&
                          (p.zoneId === currentZone.id || p.zoneId === null) &&
                          p.completed
                        );
                        if (steps1to4Done && !step5Done) readyForAudit.push(s);
                      }
                      if (readyForAudit.length === 0) return null;
                      return (
                        <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 max-w-md mx-auto">
                          <BellRing className="h-4 w-4 text-orange-500 shrink-0" />
                          <span className="text-xs text-orange-700 font-medium">
                            Pendiente de auditoría: {readyForAudit.map(s => `S${s} (${S_STEPS.find(ss => ss.id === s)?.japaneseName})`).join(', ')}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Mejora Continua button */}
                    {currentZone && is5SCompleted() && (
                      <Button onClick={() => setActiveTab('maintenance')}
                        className="mt-2 gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow text-xs h-8"
                        size="sm">
                        <Sparkles className="h-3.5 w-3.5" /> Mejora Continua
                      </Button>
                    )}
                  </div>

                  {/* BOTTOM: S-Step Cards — Compact horizontal row (only when zone selected) */}
                  {currentZone && (
                  <div className="shrink-0 border-t bg-white/80 backdrop-blur-sm px-2 py-2 z-10">
                    <div className={`grid gap-2 max-w-5xl mx-auto ${isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
                      {S_STEPS.map(s => {
                        const earned = isQuesitoEarned(s.id);
                        const zoneId = currentZone?.id;

                        // Count completed mini-steps using getMiniStepStatus (consistent with Board5S)
                        // This properly counts employeeProgress for individual steps like Formación
                        let completedMiniSteps = 0;
                        for (let ms = 1; ms <= 5; ms++) {
                          const status = getMiniStepStatus(s.id, ms);
                          if (status === 'completed' || status === 'completed_viewonly') completedMiniSteps++;
                        }
                        const pct = Math.min(Math.round((completedMiniSteps / 5) * 100), 100);

                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md ${
                              earned
                                ? 'border-green-500 bg-gradient-to-b from-green-50 to-emerald-50 shadow-md shadow-green-100'
                                : 'border-gray-200 bg-white'
                            }`}
                            onClick={() => handleSStepClick(s.id)}
                          >
                            {/* S Label header */}
                            <div
                              className={`flex items-center justify-center gap-1.5 ${isMobile ? 'py-2.5' : 'py-1.5'} ${earned ? 'bg-green-500' : ''}`}
                              style={!earned ? { backgroundColor: `${s.color}20` } : undefined}
                            >
                              <div className={`${isMobile ? 'w-8 h-8' : 'w-6 h-6'} rounded-lg flex items-center justify-center text-white ${isMobile ? 'text-sm' : 'text-xs'} font-black ${earned ? 'bg-green-600 ring-1 ring-yellow-400' : ''}`}
                                style={!earned ? { backgroundColor: s.color } : undefined}>
                                {earned ? '★' : s.id}
                              </div>
                              <span className={`${isMobile ? 'text-sm' : 'text-[10px]'} font-bold ${earned ? 'text-white' : ''}`} style={!earned ? { color: s.color } : undefined}>
                                {s.name}
                              </span>
                            </div>

                            {/* Mini-step dots */}
                            <div className={isMobile ? 'flex items-center justify-center gap-2 py-2.5 px-1' : 'flex items-center justify-center gap-1 py-1.5 px-1'}>
                              {MINI_STEPS.map(ms => {
                                const status = getMiniStepStatus(s.id, ms.id);
                                const effectiveStatus = status;
                                // 'completed_viewonly': step is done but user only has a0 (view) — show ✓ and can view (read-only)
                                const isCompleted = effectiveStatus === 'completed' || effectiveStatus === 'completed_viewonly';
                                const canOpenModal = effectiveStatus === 'completed' || effectiveStatus === 'completed_viewonly' || effectiveStatus === 'available';
                                const modalType = getModalType(ms.id, s.id);
                                // Lock reasons based on permissions and progression
                                const canPerformThisStep = canPerformPerm(s.id, ms.id);
                                const canViewThisStep = canViewPerm(s.id, ms.id);
                                // Check if previous step is completed (for intra-S progressive unlocking tooltip)
                                const isPrevStepDone = ms.id === 1 || progress.some(p =>
                                  p.sStep === s.id && p.miniStep === ms.id - 1 && (p.zoneId === currentZone?.id || p.zoneId === null) && p.completed
                                );
                                // Check if previous S is completed (for inter-S progressive unlocking tooltip)
                                const isPrevSDone = s.id === 1 || (() => {
                                  for (let ms2 = 1; ms2 <= 5; ms2++) {
                                    if (!progress.some(p => p.sStep === s.id - 1 && p.miniStep === ms2 && (p.zoneId === currentZone?.id || p.zoneId === null) && p.completed)) return false;
                                  }
                                  return true;
                                })();
                                const lockReason = canSkipSteps && !adminFreeNavigation
                                  ? 'Solo lectura (candado cerrado)'
                                  : effectiveStatus === 'completed_viewonly'
                                    ? 'Solo lectura (completado)'
                                    : effectiveStatus === 'locked' && canViewThisStep && !canPerformThisStep
                                      ? 'Solo lectura'
                                      : effectiveStatus === 'locked' && canPerformThisStep && !isPrevSDone
                                        ? `Completa S${s.id - 1}`
                                        : ms.id === 5 && effectiveStatus === 'locked' && canPerformThisStep && !isPrevStepDone
                                          ? 'Completa pasos 1-4'
                                          : ms.id > 1 && ms.id < 5 && effectiveStatus === 'locked' && canPerformThisStep && !isPrevStepDone
                                            ? `Completa paso ${ms.id - 1}`
                                            : effectiveStatus === 'locked'
                                              ? 'Sin permiso'
                                              : '';
                                // Get score for steps 4 and 5
                                const stepScore = (ms.id === 4 || ms.id === 5)
                                  ? progress.find(p => p.sStep === s.id && p.miniStep === ms.id && (p.zoneId === currentZone?.id || p.zoneId === null))?.score
                                  : null;

                                return (
                                  <div key={ms.id} className="flex flex-col items-center">
                                    {/* Score badge above step 4 and 5 dots */}
                                    {(ms.id === 4 || ms.id === 5) && stepScore != null && (
                                      <span className={`text-[7px] font-bold ${stepScore >= 70 ? 'text-green-600' : 'text-red-500'} leading-none mb-0.5`}>
                                        {stepScore}%
                                      </span>
                                    )}
                                    {/* "Request audit" button above step 5 when steps 1-4 are completed but 5 isn't — only for users with notify_audit permission */}
                                    {ms.id === 5 && canNotifyAudit && (() => {
                                      // Check completion using BOTH zone-level progress AND individual employee progress
                                      // This ensures auditors/responsables see the button even if they don't have personal completion
                                      const steps1to4Done = [1,2,3,4].every(msCheck => {
                                        const zoneCompleted = progress.some(p =>
                                          p.sStep === s.id && p.miniStep === msCheck &&
                                          (currentZone ? (p.zoneId === currentZone.id || p.zoneId === null) : true) &&
                                          p.completed
                                        );
                                        const empCompleted = employeeProgress.some(ep =>
                                          ep.sStep === s.id && ep.miniStep === msCheck &&
                                          currentZone && ep.zoneId === currentZone.id &&
                                          ep.completed
                                        );
                                        return zoneCompleted || empCompleted;
                                      });
                                      const step5Done = progress.some(p =>
                                        p.sStep === s.id && p.miniStep === 5 &&
                                        (currentZone ? (p.zoneId === currentZone.id || p.zoneId === null) : true) &&
                                        p.completed
                                      );
                                      return steps1to4Done && !step5Done;
                                    })() && (
                                      <button
                                        className="text-[8px] font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-1.5 py-0.5 rounded border border-orange-300 mb-0.5 transition-colors leading-tight whitespace-nowrap animate-pulse bg-orange-50 shadow-sm"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const proposedDate = new Date();
                                          proposedDate.setDate(proposedDate.getDate() + 2);
                                          const dateStr = proposedDate.toISOString().slice(0, 16);
                                          const result = prompt(`Propón fecha y hora para la auditoría S${s.id}:\n(Formato: AAAA-MM-DDTHH:MM)`, dateStr);
                                          if (!result) return;
                                          try {
                                            const sStepData = S_STEPS.find(ss => ss.id === s.id);
                                            const formattedDate = new Date(result).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
                                            const msg = `Se solicita auditoría para S${s.id} (${sStepData?.japaneseName || ''}) en la zona "${currentZone?.name || ''}". Fecha propuesta: ${formattedDate}.`;
                                            const membersRes = await fetch(`/api/projects/${currentProject?.id}/members`);
                                            const membersData = await membersRes.json();
                                            const allMembers = membersData?.members || [];
                                            // Notify all auditors
                                            const auditors = allMembers.filter((m: any) => m.role === 'auditor');
                                            for (const auditor of auditors) {
                                              await fetch('/api/notifications', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  userId: auditor.userId,
                                                  type: 'audit_requested',
                                                  title: `Solicitud auditoría: S${s.id} — ${sStepData?.japaneseName || ''}`,
                                                  message: msg,
                                                  sStep: s.id,
                                                  zoneId: currentZone?.id,
                                                  projectId: currentProject?.id,
                                                }),
                                              });
                                            }
                                            // Notify all responsables (from zone.responsableId OR from project members)
                                            const responsableIds = new Set<string>();
                                            if (currentZone?.responsableId) responsableIds.add(currentZone.responsableId);
                                            const responsables = allMembers.filter((m: any) => m.role === 'responsable');
                                            for (const resp of responsables) responsableIds.add(resp.userId);
                                            for (const respId of responsableIds) {
                                              await fetch('/api/notifications', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  userId: respId,
                                                  type: 'audit_requested',
                                                  title: `Solicitud auditoría: S${s.id} — ${sStepData?.japaneseName || ''}`,
                                                  message: msg,
                                                  sStep: s.id,
                                                  zoneId: currentZone?.id,
                                                  projectId: currentProject?.id,
                                                }),
                                              });
                                            }
                                            // Also notify the requesting user as confirmation
                                            if (currentUser?.id) {
                                              await fetch('/api/notifications', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  userId: currentUser.id,
                                                  type: 'audit_ready',
                                                  title: `Solicitud enviada: S${s.id} — ${sStepData?.japaneseName || ''}`,
                                                  message: `Tu solicitud de auditoría para S${s.id} ha sido enviada al auditor y responsable. Fecha propuesta: ${formattedDate}.`,
                                                  sStep: s.id,
                                                  zoneId: currentZone?.id,
                                                  projectId: currentProject?.id,
                                                }),
                                              });
                                            }
                                            alert('Solicitud de auditoría enviada a auditor y responsable.');
                                          } catch (err) {
                                            console.error('Error sending audit request:', err);
                                            alert('Error al enviar la solicitud.');
                                          }
                                        }}
                                        title="Solicitar auditoría: notificar al auditor y responsable para fijar fecha"
                                      >
                                        🔔 Auditar
                                      </button>
                                    )}
                                    <div className="relative">
                                      <button
                                        className={`
                                          w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                          ${isMobile ? '!w-11 !h-11 !text-xs' : ''}
                                          ${effectiveStatus === 'completed'
                                            ? 'bg-green-500 text-white shadow-sm shadow-green-200 ring-2 ring-green-300'
                                            : effectiveStatus === 'completed_viewonly'
                                              ? 'bg-green-500 text-white shadow-sm shadow-green-200 ring-2 ring-green-300 cursor-default'
                                            : effectiveStatus === 'available'
                                              ? 'text-white hover:scale-110 hover:shadow-md cursor-pointer'
                                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
                                        `}
                                        style={effectiveStatus === 'available' ? { backgroundColor: s.color } : undefined}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (canOpenModal) {
                                            handleOpenModal(modalType, ms.id, s.id);
                                          }
                                        }}
                                        disabled={!canOpenModal}
                                        title={`${ms.name}${lockReason ? ` (${lockReason})` : ''}`}
                                      >
                                        {isCompleted ? '✓' : effectiveStatus === 'locked' ? <LockIcon className="h-2.5 w-2.5" /> : ms.id}
                                      </button>
                                      {/* Admin reset button: only shown when admin with lock open and step is completed */}
                                      {canSkipSteps && adminFreeNavigation && effectiveStatus === 'completed' && (
                                        <button
                                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] font-bold hover:bg-red-600 transition-colors z-10"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!confirm(`¿Restablecer paso ${ms.id} de S${s.id}? Esto eliminará el progreso guardado.`)) return;
                                            try {
                                              const params = new URLSearchParams({ sStep: String(s.id), miniStep: String(ms.id), projectId: currentProject?.id || '' });
                                              if (currentZone?.id) params.set('zoneId', currentZone.id);
                                              const res = await fetch(`/api/progress/step?${params}`, { method: 'DELETE' });
                                              const json = await res.json();
                                              if (json.success) {
                                                await use5SStore.getState().fetchProgress();
                                                if (currentProject && currentZone) {
                                                  await use5SStore.getState().fetchEmployeeProgress(currentProject.id, currentZone.id);
                                                }
                                              } else {
                                                alert(json.error || 'Error al restablecer');
                                              }
                                            } catch (err) { console.error('Reset error:', err); }
                                          }}
                                          title="Restablecer paso (admin)"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Progress bar */}
                            <div className="px-2 pb-1.5">
                              <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: earned ? '#22c55e' : s.color }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className={`text-[8px] font-bold ${earned ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {earned ? 'COMPLETADO' : `${completedMiniSteps}/5`}
                                </span>
                                <span className={`text-[8px] font-bold ${earned ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB: PLAN DE ACCIÓN ═══ */}
              {activeTab === 'actionplan' && currentUser?.role !== 'auditor' && (
                <motion.div key="actionplan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 overflow-hidden">
                  <PlanDeAccionView />
                </motion.div>
              )}

              {/* ═══ TAB: GESTIÓN (Solo Gestor - Dueño de la app) ═══ */}
              {activeTab === 'gestion' && isGestor && (
                <motion.div key="gestion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 overflow-auto p-4">
                  <ConstructorPanel />
                </motion.div>
              )}

              {/* ═══ TAB: GERENTE ═══ */}
              {activeTab === 'gerente' && canSeeGerentePanel && (
                <motion.div key="gerente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 overflow-auto p-4">
                  <GerentePanel embedded />
                </motion.div>
              )}

              {/* ═══ TAB: ADMIN (Solo Admin de Empresa) ═══ */}
              {activeTab === 'admin' && isAdmin && (
                <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 overflow-auto p-4">
                  <AdminPanel embedded />
                </motion.div>
              )}

              {/* ═══ TAB: MAINTENANCE / MEJORA CONTINUA ═══ */}
              {activeTab === 'maintenance' && (
                <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 overflow-auto p-4">
                  <MaintenanceView embedded />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg safe-area-bottom">
          <div className="flex items-center justify-around h-14">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors min-w-[44px] ${
                  activeTab === tab.key
                    ? 'text-green-700 bg-green-50/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-medium leading-none truncate max-w-[64px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

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

      {/* Standards Library Modal */}
      {activeModal === 'standardsLibrary' && (
        <StandardsLibrary open={true} onClose={closeModal} />
      )}

      {/* Photo Library Modal */}
      {activeModal === 'photoLibrary' && (
        <PhotoLibrary open={true} onClose={closeModal} initialSStep={selectedSStep || undefined} />
      )}

      {/* Team Management Modal */}
      <TeamManagement open={showTeamManagement} onClose={() => setShowTeamManagement(false)} />

      {/* Role Permissions Modal */}
      <RolePermissions open={showRolePermissions} onClose={() => setShowRolePermissions(false)} />

      {/* Jaula de Excedentes Modal */}
      <JaulaModal open={showJaulaModal} onClose={() => setShowJaulaModal(false)} />
      {/* Activos (Necesarios) Modal */}
      <ActivosModal open={showActivosModal} onClose={() => setShowActivosModal(false)} />
    </div>
  );
}
