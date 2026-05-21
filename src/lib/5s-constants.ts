// 5S Methodology Constants

export const S_STEPS = [
  {
    id: 1,
    name: 'REVISAR',
    japaneseName: 'Seiri',
    spanishName: 'Clasificar',
    color: '#8B5CF6',
    colorClass: 'bg-purple-500',
    lightColorClass: 'bg-purple-100',
    textColorClass: 'text-purple-500',
    borderColorClass: 'border-purple-500',
    hoverColorClass: 'hover:bg-purple-50',
    ringColorClass: 'ring-purple-500',
    description: 'Separar lo necesario de lo innecesario y eliminar lo innecesario',
  },
  {
    id: 2,
    name: 'ORDENAR',
    japaneseName: 'Seiton',
    spanishName: 'Ordenar',
    color: '#EAB308',
    colorClass: 'bg-yellow-500',
    lightColorClass: 'bg-yellow-100',
    textColorClass: 'text-yellow-600',
    borderColorClass: 'border-yellow-500',
    hoverColorClass: 'hover:bg-yellow-50',
    ringColorClass: 'ring-yellow-500',
    description: 'Organizar los elementos necesarios de forma que sean fáciles de encontrar y usar',
  },
  {
    id: 3,
    name: 'LIMPIAR',
    japaneseName: 'Seiso',
    spanishName: 'Limpiar',
    color: '#3B82F6',
    colorClass: 'bg-blue-500',
    lightColorClass: 'bg-blue-100',
    textColorClass: 'text-blue-500',
    borderColorClass: 'border-blue-500',
    hoverColorClass: 'hover:bg-blue-50',
    ringColorClass: 'ring-blue-500',
    description: 'Limpiar el lugar de trabajo e identificar y eliminar las fuentes de suciedad',
  },
  {
    id: 4,
    name: 'ESTANDARIZAR',
    japaneseName: 'Seiketsu',
    spanishName: 'Estandarizar',
    color: '#F43F5E',
    colorClass: 'bg-rose-500',
    lightColorClass: 'bg-rose-100',
    textColorClass: 'text-rose-500',
    borderColorClass: 'border-rose-500',
    hoverColorClass: 'hover:bg-rose-50',
    ringColorClass: 'ring-rose-500',
    description: 'Crear estándares y procedimientos para mantener los tres primeros S',
  },
  {
    id: 5,
    name: 'MANTENER',
    japaneseName: 'Shitsuke',
    spanishName: 'Disciplina',
    color: '#F97316',
    colorClass: 'bg-orange-500',
    lightColorClass: 'bg-orange-100',
    textColorClass: 'text-orange-500',
    borderColorClass: 'border-orange-500',
    hoverColorClass: 'hover:bg-orange-50',
    ringColorClass: 'ring-orange-500',
    description: 'Mantener la disciplina y los hábitos para sostener los 5S a largo plazo',
  },
] as const;

export const MINI_STEPS = [
  {
    id: 1,
    name: 'Formación + Examen',
    description: 'Complete la formación en línea y apruebe el examen (mínimo 80%)',
    icon: 'GraduationCap',
    passThreshold: 80,
  },
  {
    id: 2,
    name: 'Evidencia Fotográfica',
    description: 'Suba fotos del antes y después del área de trabajo',
    icon: 'Camera',
    passThreshold: 2, // mínimo 2 fotos
  },
  {
    id: 3,
    name: 'Inventario',
    description: 'Clasifique los elementos en útil, innecesario y dudoso',
    icon: 'ClipboardList',
    passThreshold: 80, // mínimo 80% clasificados
  },
  {
    id: 4,
    name: 'Autoevaluación',
    description: 'Complete la lista de verificación de autoevaluación',
    icon: 'CheckSquare',
    passThreshold: 70, // mínimo 70% de puntuación
  },
  {
    id: 5,
    name: 'Auditoría Externa',
    description: 'Pase la auditoría externa de validación',
    icon: 'ShieldCheck',
    passThreshold: 70, // mínimo 70% de puntuación
  },
] as const;

export type SStep = typeof S_STEPS[number];
export type MiniStep = typeof MINI_STEPS[number];

export function getSStep(id: number) {
  return S_STEPS.find(s => s.id === id);
}

export function getMiniStep(id: number) {
  return MINI_STEPS.find(m => m.id === id);
}

export const EXAM_PASS_THRESHOLD = 80;
export const MIN_PHOTOS = 2;
export const INVENTORY_CLASSIFY_THRESHOLD = 80;
export const SELF_EVAL_THRESHOLD = 70;
export const AUDIT_PASS_THRESHOLD = 70;
