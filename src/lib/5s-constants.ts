export interface SStep {
  id: number;
  name: string;
  japaneseName: string;
  spanishName: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface MiniStep {
  id: number;
  name: string;
  icon: string;
  description: string;
  /** S-specific descriptions override the default description */
  descriptionByS?: Record<number, string>;
}

export const S_STEPS: SStep[] = [
  {
    id: 1,
    name: 'REVISAR',
    japaneseName: 'Seiri',
    spanishName: 'Clasificar',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    description: 'Clasificar y separar los elementos necesarios de los innecesarios en el lugar de trabajo.',
  },
  {
    id: 2,
    name: 'ORDENAR',
    japaneseName: 'Seiton',
    spanishName: 'Organizar',
    color: '#EAB308',
    bgColor: '#FEF9C3',
    description: 'Organizar los elementos necesarios de manera que sean fáciles de encontrar, usar y devolver.',
  },
  {
    id: 3,
    name: 'LIMPIAR',
    japaneseName: 'Seiso',
    spanishName: 'Limpiar',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Limpiar el lugar de trabajo identificando y eliminando las fuentes de suciedad.',
  },
  {
    id: 4,
    name: 'ESTANDARIZAR',
    japaneseName: 'Seiketsu',
    spanishName: 'Estandarizar',
    color: '#F43F5E',
    bgColor: '#FFE4E6',
    description: 'Crear estándares y normas que mantengan los logros de las 3S anteriores.',
  },
  {
    id: 5,
    name: 'MANTENER',
    japaneseName: 'Shitsuke',
    spanishName: 'Disciplina',
    color: '#F97316',
    bgColor: '#FFEDD5',
    description: 'Crear el hábito de respetar los estándares establecidos mediante disciplina y compromiso.',
  },
];

export const MINI_STEPS: MiniStep[] = [
  {
    id: 1,
    name: 'Formación + Examen',
    icon: 'GraduationCap',
    description: 'Completa la formación y aprueba el examen (mínimo 80%)',
  },
  {
    id: 2,
    name: 'Fotografías (Antes)',
    icon: 'Camera',
    description: 'Toma fotografías de las zonas para documentar el estado actual antes de actuar',
    descriptionByS: {
      1: 'Fotografía la zona para ver qué elementos innecesarios hay antes de clasificar',
      2: 'Fotografía la zona para ver cómo está organizada antes de reordenar',
      3: 'Fotografía la zona para documentar los puntos de suciedad antes de limpiar',
      4: 'Fotografía la zona para documentar el estado actual antes de estandarizar',
      5: 'Fotografía la zona para documentar el nivel de cumplimiento de los estándares',
    },
  },
  {
    id: 3,
    name: 'Inventario',
    icon: 'ClipboardList',
    description: 'Realiza el inventario correspondiente según la S',
    descriptionByS: {
      1: 'Inventaria los elementos innecesarios encontrados en la zona',
      2: 'Inventaria los elementos necesarios y su ubicación asignada',
      3: 'Inventaria los puntos de suciedad detectados en la zona',
      4: 'Inventaria los estándares implantados y su estado de cumplimiento',
      5: 'Inventaria los hábitos y prácticas de disciplina observados',
    },
  },
  {
    id: 4,
    name: 'Autoevaluación',
    icon: 'CheckSquare',
    description: 'Realiza la autoevaluación con la checklist proporcionada',
  },
  {
    id: 5,
    name: 'Auditoría Externa',
    icon: 'ShieldCheck',
    description: 'Validación por parte de un auditor externo',
  },
];

/**
 * Inventory configuration per S-step.
 * Each S has its own set of categories, extra fields, and template name.
 */
export interface InventoryConfig {
  title: string;
  subtitle: string;
  categories: { value: string; label: string; color: string }[];
  extraFields: { key: string; label: string; type: 'select' | 'text' | 'number'; options?: string[] }[];
  templateName: string;
}

export const INVENTORY_CONFIGS: Record<number, InventoryConfig> = {
  1: {
    title: 'Inventario de Innecesarios',
    subtitle: 'SEIRI — Identifica y clasifica los elementos innecesarios',
    categories: [
      { value: 'innecesario', label: 'Innecesario', color: 'bg-red-100 text-red-800' },
      { value: 'dudoso', label: 'Dudoso', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'util', label: 'Necesario', color: 'bg-green-100 text-green-800' },
    ],
    extraFields: [
      { key: 'estado', label: 'Estado', type: 'select', options: ['Bueno', 'Regular', 'Malo'] },
      { key: 'frecuenciaUso', label: 'Frecuencia uso', type: 'select', options: ['Diaria', 'Semanal', 'Mensual', 'Anual', 'Nunca'] },
      { key: 'decision', label: 'Decisión', type: 'select', options: ['Eliminar', 'Reubicar', 'Revisar'] },
    ],
    templateName: 'S1_Inventario_Innecesarios_Seiri.xlsx',
  },
  2: {
    title: 'Inventario de Necesarios',
    subtitle: 'SEITON — Organiza los elementos necesarios en su ubicación correcta',
    categories: [
      { value: 'muy_frecuente', label: 'Muy frecuente', color: 'bg-green-100 text-green-800' },
      { value: 'frecuente', label: 'Frecuente', color: 'bg-blue-100 text-blue-800' },
      { value: 'ocasional', label: 'Ocasional', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'raro', label: 'Raro', color: 'bg-red-100 text-red-800' },
    ],
    extraFields: [
      { key: 'ubicacionAsignada', label: 'Ubicación asignada', type: 'text' },
      { key: 'metodoIdentificacion', label: 'Método identificación', type: 'select', options: ['Etiqueta', 'Código color', 'Señal visual', 'Sombra/Contorno', 'Código numérico', 'Otro'] },
      { key: 'cercania', label: 'Cercanía al puesto', type: 'select', options: ['Muy cerca (brazo)', 'Cerca (1-3 pasos)', 'Media distancia', 'Poco accesible'] },
    ],
    templateName: 'S2_Inventario_Necesarios_Seiton.xlsx',
  },
  3: {
    title: 'Inventario de Puntos de Suciedad',
    subtitle: 'SEISO — Identifica y registra los puntos de suciedad de la zona',
    categories: [
      { value: 'polvo', label: 'Polvo', color: 'bg-gray-100 text-gray-800' },
      { value: 'grasa', label: 'Grasa', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'mancha', label: 'Mancha', color: 'bg-orange-100 text-orange-800' },
      { value: 'residuos', label: 'Residuos', color: 'bg-red-100 text-red-800' },
      { value: 'humedad', label: 'Humedad', color: 'bg-blue-100 text-blue-800' },
      { value: 'oxidacion', label: 'Oxidación', color: 'bg-amber-100 text-amber-800' },
      { value: 'otro', label: 'Otro', color: 'bg-purple-100 text-purple-800' },
    ],
    extraFields: [
      { key: 'nivel', label: 'Nivel', type: 'select', options: ['Leve', 'Moderado', 'Grave'] },
      { key: 'fuente', label: 'Fuente de suciedad', type: 'select', options: ['Proceso productivo', 'Medio ambiente', 'Falta de limpieza', 'Escape/Fuga', 'Desgaste', 'Derrame', 'Otro'] },
      { key: 'metodoLimpieza', label: 'Método limpieza', type: 'select', options: ['Aspirado', 'Fregado', 'Pulido', 'Desinfección', 'Reparación', 'Otro'] },
      { key: 'frecuenciaLimpieza', label: 'Frecuencia limpieza', type: 'select', options: ['Diaria', '3 veces/semana', 'Semanal', 'Quincenal', 'Mensual'] },
    ],
    templateName: 'S3_Inventario_Puntos_Suciedad_Seiso.xlsx',
  },
  4: {
    title: 'Inventario de Estándares Implantados',
    subtitle: 'SEIKETSU — Registra los estándares y su estado de implantación',
    categories: [
      { value: 'visual', label: 'Visual', color: 'bg-blue-100 text-blue-800' },
      { value: 'procedimiento', label: 'Procedimiento', color: 'bg-green-100 text-green-800' },
      { value: 'checklist', label: 'Checklist', color: 'bg-purple-100 text-purple-800' },
      { value: 'senalizacion', label: 'Señalización', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'diagrama', label: 'Diagrama flujo', color: 'bg-cyan-100 text-cyan-800' },
      { value: 'registro', label: 'Registro', color: 'bg-gray-100 text-gray-800' },
      { value: 'otro', label: 'Otro', color: 'bg-orange-100 text-orange-800' },
    ],
    extraFields: [
      { key: 'estadoEstandar', label: 'Estado', type: 'select', options: ['Implantado', 'En proceso', 'Pendiente'] },
      { key: 'documentado', label: 'Documentado', type: 'select', options: ['Sí', 'No', 'Parcialmente'] },
      { key: 'cumplimiento', label: 'Cumplimiento %', type: 'number' },
      { key: 'fechaRevision', label: 'Fecha revisión', type: 'text' },
    ],
    templateName: 'S4_Inventario_Estandares_Seiketsu.xlsx',
  },
  5: {
    title: 'Inventario de Prácticas de Disciplina',
    subtitle: 'SHITSUKE — Registra los hábitos y prácticas de disciplina observados',
    categories: [
      { value: 'cumplido', label: 'Cumplido', color: 'bg-green-100 text-green-800' },
      { value: 'parcial', label: 'Parcial', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'incumplido', label: 'Incumplido', color: 'bg-red-100 text-red-800' },
    ],
    extraFields: [
      { key: 'practica', label: 'Práctica/Hábito', type: 'text' },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'frecuencia', label: 'Frecuencia', type: 'select', options: ['Diaria', 'Semanal', 'Mensual'] },
    ],
    templateName: 'S5_Inventario_Disciplina_Shitsuke.xlsx',
  },
};

export const MIN_PHOTOS = 3;
export const INVENTORY_CLASSIFY_THRESHOLD = 80;
export const SELF_EVAL_THRESHOLD = 70;
export const AUDIT_PASS_THRESHOLD = 75;
export const EXAM_PASS_THRESHOLD = 80;
