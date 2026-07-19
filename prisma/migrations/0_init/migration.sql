-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "plainPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'empleado',
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "department" TEXT,
    "position" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "company" TEXT NOT NULL,
    "companyId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "projectId" TEXT NOT NULL,
    "responsableId" TEXT,
    "boardConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberZone" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "photoUrls" TEXT,
    "passedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProgress" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "passedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL DEFAULT 3,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "notaMinima" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "questionIdx" INTEGER NOT NULL,
    "answerIdx" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "quantityNeeded" INTEGER NOT NULL DEFAULT 0,
    "quantityUnneeded" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION,
    "action" TEXT,
    "photoUrl" TEXT,
    "photoUrls" TEXT,
    "extra" TEXT,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT,
    "jaulaStatus" TEXT NOT NULL DEFAULT '',
    "jaulaFechaEntrada" TIMESTAMP(3),
    "jaulaOrigen" TEXT,
    "jaulaFechaSalida" TIMESTAMP(3),
    "jaulaDestino" TEXT,
    "jaulaFechaLimite" TIMESTAMP(3),
    "zonaOrigen" TEXT,
    "zonaDestino" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditResult" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "auditorName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "observations" TEXT,
    "auditType" TEXT NOT NULL DEFAULT 'quarterly',
    "checklistData" TEXT,
    "mejorasData" TEXT,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResponse" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL,
    "results" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "auditor" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "hallazgo" TEXT NOT NULL,
    "mejora" TEXT,
    "responsable" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "fechaCompromiso" TIMESTAMP(3),
    "fechaLimite" TIMESTAMP(3),
    "fechaReal" TIMESTAMP(3),
    "fechaResolucion" TIMESTAMP(3),
    "photoRefs" TEXT,
    "notas" TEXT,
    "source" TEXT NOT NULL DEFAULT 'autoevaluacion',
    "auditor" TEXT,
    "zoneId" TEXT,
    "verificadoPor" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numeroEntrada" INTEGER,
    "fechaEntrada" TIMESTAMP(3),
    "comunicadoPor" TEXT,
    "semana" TEXT,
    "seccionDemandante" TEXT,
    "clienteZona" TEXT,
    "personaDemandada" TEXT,
    "seccionDemandada" TEXT,
    "impactoObjetivo" TEXT,
    "enviado" TEXT,
    "accionCorrectiva" TEXT,
    "accionesPreventivas" TEXT,
    "semanaPrevista" TEXT,
    "porcentaje" DOUBLE PRECISION DEFAULT 0,
    "semanaReal" TEXT,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL DEFAULT 4,
    "zoneId" TEXT,
    "notaMinima" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "objetivo" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermissionConfig" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nif" TEXT,
    "sector" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "billingEmail" TEXT,
    "billingName" TEXT,
    "billingNif" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingPostalCode" TEXT,
    "iban" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'gratuito',
    "status" TEXT NOT NULL DEFAULT 'activa',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxProjects" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'gerente',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitationEmailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT,
    "photoUrl" TEXT,
    "beforePhotoUrl" TEXT,
    "afterPhotoUrl" TEXT,
    "responsable" TEXT,
    "contacto" TEXT,
    "mejoraTipo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "version" INTEGER NOT NULL DEFAULT 1,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardSlot" (
    "id" TEXT NOT NULL,
    "boardConfigId" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardSlotTemplate" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardSlotTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardSlotStandard" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardSlotStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoLibrary" (
    "id" TEXT NOT NULL,
    "sStep" INTEGER NOT NULL,
    "miniStep" INTEGER NOT NULL DEFAULT 2,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'antes',
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT,
    "uploadedBy" TEXT,
    "inventoryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDCAItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'plan',
    "sStep" INTEGER NOT NULL DEFAULT 1,
    "responsable" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" TIMESTAMP(3),
    "resultado" TEXT,
    "projectId" TEXT NOT NULL,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDCAItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sStep" INTEGER,
    "zoneId" TEXT,
    "projectId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Zone_projectId_idx" ON "Zone"("projectId");

-- CreateIndex
CREATE INDEX "Zone_responsableId_idx" ON "Zone"("responsableId");

-- CreateIndex
CREATE INDEX "Zone_boardConfigId_idx" ON "Zone"("boardConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_projectId_key" ON "Zone"("name", "projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_userId_projectId_key" ON "ProjectMember"("userId", "projectId");

-- CreateIndex
CREATE INDEX "MemberZone_memberId_idx" ON "MemberZone"("memberId");

-- CreateIndex
CREATE INDEX "MemberZone_zoneId_idx" ON "MemberZone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberZone_memberId_zoneId_key" ON "MemberZone"("memberId", "zoneId");

-- CreateIndex
CREATE INDEX "Progress_projectId_idx" ON "Progress"("projectId");

-- CreateIndex
CREATE INDEX "Progress_projectId_zoneId_idx" ON "Progress"("projectId", "zoneId");

-- CreateIndex
CREATE INDEX "EmployeeProgress_projectId_zoneId_idx" ON "EmployeeProgress"("projectId", "zoneId");

-- CreateIndex
CREATE INDEX "EmployeeProgress_projectId_zoneId_userId_idx" ON "EmployeeProgress"("projectId", "zoneId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProgress_sStep_miniStep_projectId_zoneId_userId_key" ON "EmployeeProgress"("sStep", "miniStep", "projectId", "zoneId", "userId");

-- CreateIndex
CREATE INDEX "ExamAnswer_projectId_idx" ON "ExamAnswer"("projectId");

-- CreateIndex
CREATE INDEX "InventoryItem_projectId_idx" ON "InventoryItem"("projectId");

-- CreateIndex
CREATE INDEX "InventoryItem_sStep_projectId_idx" ON "InventoryItem"("sStep", "projectId");

-- CreateIndex
CREATE INDEX "InventoryItem_jaulaStatus_idx" ON "InventoryItem"("jaulaStatus");

-- CreateIndex
CREATE INDEX "InventoryItem_zoneId_idx" ON "InventoryItem"("zoneId");

-- CreateIndex
CREATE INDEX "AuditResult_projectId_idx" ON "AuditResult"("projectId");

-- CreateIndex
CREATE INDEX "AuditResult_auditType_idx" ON "AuditResult"("auditType");

-- CreateIndex
CREATE INDEX "ChecklistResponse_projectId_idx" ON "ChecklistResponse"("projectId");

-- CreateIndex
CREATE INDEX "ActionItem_projectId_idx" ON "ActionItem"("projectId");

-- CreateIndex
CREATE INDEX "ActionItem_zoneId_idx" ON "ActionItem"("zoneId");

-- CreateIndex
CREATE INDEX "AuditTarget_projectId_idx" ON "AuditTarget"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditTarget_projectId_sStep_miniStep_zoneId_key" ON "AuditTarget"("projectId", "sStep", "miniStep", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissionConfig_role_permission_key" ON "RolePermissionConfig"("role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_idx" ON "CompanyMember"("companyId");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_userId_companyId_key" ON "CompanyMember"("userId", "companyId");

-- CreateIndex
CREATE INDEX "Standard_projectId_idx" ON "Standard"("projectId");

-- CreateIndex
CREATE INDEX "Standard_sStep_projectId_idx" ON "Standard"("sStep", "projectId");

-- CreateIndex
CREATE INDEX "Standard_category_idx" ON "Standard"("category");

-- CreateIndex
CREATE INDEX "BoardSlot_boardConfigId_idx" ON "BoardSlot"("boardConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardSlot_boardConfigId_sStep_miniStep_key" ON "BoardSlot"("boardConfigId", "sStep", "miniStep");

-- CreateIndex
CREATE INDEX "BoardSlotTemplate_slotId_idx" ON "BoardSlotTemplate"("slotId");

-- CreateIndex
CREATE INDEX "BoardSlotTemplate_templateId_idx" ON "BoardSlotTemplate"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardSlotTemplate_slotId_templateId_key" ON "BoardSlotTemplate"("slotId", "templateId");

-- CreateIndex
CREATE INDEX "BoardSlotStandard_slotId_idx" ON "BoardSlotStandard"("slotId");

-- CreateIndex
CREATE INDEX "BoardSlotStandard_standardId_idx" ON "BoardSlotStandard"("standardId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardSlotStandard_slotId_standardId_key" ON "BoardSlotStandard"("slotId", "standardId");

-- CreateIndex
CREATE INDEX "PhotoLibrary_projectId_idx" ON "PhotoLibrary"("projectId");

-- CreateIndex
CREATE INDEX "PhotoLibrary_sStep_projectId_idx" ON "PhotoLibrary"("sStep", "projectId");

-- CreateIndex
CREATE INDEX "PhotoLibrary_photoType_idx" ON "PhotoLibrary"("photoType");

-- CreateIndex
CREATE INDEX "PhotoLibrary_inventoryItemId_idx" ON "PhotoLibrary"("inventoryItemId");

-- CreateIndex
CREATE INDEX "PDCAItem_projectId_idx" ON "PDCAItem"("projectId");

-- CreateIndex
CREATE INDEX "PDCAItem_phase_idx" ON "PDCAItem"("phase");

-- CreateIndex
CREATE INDEX "PDCAItem_estado_idx" ON "PDCAItem"("estado");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_projectId_idx" ON "Notification"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_boardConfigId_fkey" FOREIGN KEY ("boardConfigId") REFERENCES "BoardConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberZone" ADD CONSTRAINT "MemberZone_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberZone" ADD CONSTRAINT "MemberZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProgress" ADD CONSTRAINT "EmployeeProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProgress" ADD CONSTRAINT "EmployeeProgress_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProgress" ADD CONSTRAINT "EmployeeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResponse" ADD CONSTRAINT "ChecklistResponse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTarget" ADD CONSTRAINT "AuditTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTarget" ADD CONSTRAINT "AuditTarget_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standard" ADD CONSTRAINT "Standard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standard" ADD CONSTRAINT "Standard_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSlot" ADD CONSTRAINT "BoardSlot_boardConfigId_fkey" FOREIGN KEY ("boardConfigId") REFERENCES "BoardConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSlotTemplate" ADD CONSTRAINT "BoardSlotTemplate_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "BoardSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSlotTemplate" ADD CONSTRAINT "BoardSlotTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSlotStandard" ADD CONSTRAINT "BoardSlotStandard_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "BoardSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSlotStandard" ADD CONSTRAINT "BoardSlotStandard_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLibrary" ADD CONSTRAINT "PhotoLibrary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLibrary" ADD CONSTRAINT "PhotoLibrary_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLibrary" ADD CONSTRAINT "PhotoLibrary_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDCAItem" ADD CONSTRAINT "PDCAItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDCAItem" ADD CONSTRAINT "PDCAItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

