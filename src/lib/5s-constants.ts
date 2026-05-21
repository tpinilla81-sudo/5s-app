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
    name: 'Evidencia Fotográfica',
    icon: 'Camera',
    description: 'Sube fotos del antes y después como evidencia',
  },
  {
    id: 3,
    name: 'Inventario',
    icon: 'ClipboardList',
    description: 'Clasifica los elementos encontrados (útil/innecesario/dudoso)',
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

export const MIN_PHOTOS = 3;
export const INVENTORY_CLASSIFY_THRESHOLD = 80;
export const SELF_EVAL_THRESHOLD = 70;
export const AUDIT_PASS_THRESHOLD = 75;
export const EXAM_PASS_THRESHOLD = 80;
