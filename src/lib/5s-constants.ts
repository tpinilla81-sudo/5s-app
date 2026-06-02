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
    description: 'Registra los elementos correspondientes a esta S',
    descriptionByS: {
      1: 'Inventaria SOLO los elementos innecesarios. Incluye ubicación, cantidad, precio (€), estado y decisión (Jaula o Eliminar)',
      2: 'Inventaria SOLO los elementos necesarios: ubicación, frecuencia de uso, cercanía y método de identificación',
      3: 'Inventaria los puntos de suciedad: tipo, nivel, fuente y método de limpieza',
      4: 'Inventaria los estándares implantados: tipo, estado, documentación y cumplimiento. Incluye la Biblioteca de Estándares',
      5: 'Plan de Acción: Define las acciones a realizar para mantener la disciplina y mejora continua',
    },
  },
  {
    id: 4,
    name: 'Autoevaluación (Interna)',
    icon: 'CheckSquare',
    description: 'Checklist de verificación interna con el mismo formato que la auditoría',
    descriptionByS: {
      1: 'Verifica internamente la clasificación de elementos mediante checklist',
      2: 'Verifica internamente la organización y señalización mediante checklist',
      3: 'Verifica internamente la limpieza y mantenimiento mediante checklist',
      4: 'Verifica internamente la estandarización e indicadores mediante checklist',
      5: 'Verifica internamente la disciplina y gestión de anomalías mediante checklist',
    },
  },
  {
    id: 5,
    name: 'Auditoría Externa',
    icon: 'ShieldCheck',
    description: 'Validación por un auditor externo con el mismo checklist',
    descriptionByS: {
      1: 'Auditoría externa de la S1: Clasificación de innecesarios',
      2: 'Auditoría externa de la S2: Organización y ubicación',
      3: 'Auditoría externa de la S3: Limpieza y mantenimiento',
      4: 'Auditoría externa de la S4: Estandarización e indicadores',
      5: 'Auditoría externa de la S5: Disciplina y mejora continua',
    },
  },
];

/**
 * Inventory configuration per S-step.
 * Each S has its own set of categories, extra fields, and template name.
 */
export interface HierarchicalDropdown {
  prefijo_codigo: string;
  subcategorias: string[];
}

export interface InventoryConfig {
  title: string;
  subtitle: string;
  categories: { value: string; label: string; color: string }[];
  extraFields: { key: string; label: string; type: 'select' | 'text' | 'number'; options?: string[] }[];
  templateName: string;
  /** Hierarchical category→subcategory mapping (optional, from custom templates) */
  desplegables_jerarquicos?: Record<string, HierarchicalDropdown>;
}

export const INVENTORY_CONFIGS: Record<number, InventoryConfig> = {
  1: {
    title: 'Inventario de Clasificación (Necesarios / Innecesarios)',
    subtitle: 'SEIRI — Clasifica los elementos: necesarios van a Activos, innecesarios van a la Jaula',
    categories: [
      { value: 'necesario', label: 'Necesario', color: 'bg-green-100 text-green-800' },
      { value: 'innecesario', label: 'Innecesario', color: 'bg-red-100 text-red-800' },
    ],
    extraFields: [
      // === Campos para INNECESARIO ===
      { key: 'estado', label: 'Estado', type: 'select', options: ['Bueno', 'Regular', 'Malo'] },
      { key: 'frecuenciaUso', label: 'Frecuencia uso', type: 'select', options: ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Anual', 'Nunca'] },
      { key: 'decision', label: 'Decisión', type: 'select', options: ['Jaula', 'Eliminar'] },
      // === Campos para NECESARIO ===
      { key: 'ubicacionAsignada', label: 'Ubicación asignada', type: 'text' },
      { key: 'metodoIdentificacion', label: 'Método identificación', type: 'select', options: ['Etiqueta', 'Código color', 'Señal visual', 'Sombra/Contorno', 'Código numérico', 'Otro'] },
      { key: 'cercania', label: 'Cercanía al puesto', type: 'select', options: ['Muy cerca (brazo)', 'Cerca (1-3 pasos)', 'Media distancia', 'Poco accesible'] },
    ],
    templateName: 'S1_Inventario_Clasificacion_Seiri.xlsx',
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
export const ACTION_PLAN_MIN_ITEMS = 3;
export const SELF_EVAL_THRESHOLD = 70;
export const AUDIT_PASS_THRESHOLD = 75;
export const EXAM_PASS_THRESHOLD = 80;

// ============================================================
// Audit Checklist Data (extracted from user's Excel template)
// Same checklist for step 4 (internal) and step 5 (external)
// ============================================================

export interface AuditSection {
  id: string;           // e.g. "1.1"
  title: string;        // e.g. "MATERIALES"
  items: AuditCheckItem[];
}

export interface AuditCheckItem {
  id: string;           // e.g. "1.1.1"
  description: string;  // The checklist criterion
  hasOther?: boolean;   // If true, includes "Otros (Indicar cuál)" free text
}

export const AUDIT_CHECKLISTS: Record<number, AuditSection[]> = {
  1: [
    {
      id: '1.1', title: 'MATERIALES',
      items: [
        { id: '1.1.1', description: 'Consumibles' },
        { id: '1.1.2', description: 'Materia Prima' },
        { id: '1.1.3', description: 'Producto acabado o en proceso' },
        { id: '1.1.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '1.2', title: 'MÁQUINAS Y EQUIPOS',
      items: [
        { id: '1.2.1', description: 'Máquinas (Inducción, bombeo, apriete, engrase…)' },
        { id: '1.2.2', description: 'Utillajes (volteo, apoyo, montaje…)' },
        { id: '1.2.3', description: 'Equipos y accesorios de Elevación (Grúas, eslingas, cáncamos, cables, grilletes…)' },
        { id: '1.2.4', description: 'Equipos de transporte (Carretillas, transpaletas, plataformas elevadoras, vehículos…)' },
        { id: '1.2.5', description: 'Equipos de ensayo (galgas, testers, banco de pruebas…)' },
        { id: '1.2.6', description: 'Herramientas de ensamblaje' },
        { id: '1.2.7', description: 'EQUIPOS INFORMÁTICOS' },
      ],
    },
    {
      id: '1.3', title: 'TRANSPORTE Y ALMACENAJE',
      items: [
        { id: '1.3.1', description: 'Contenedores vacíos, cajas, bidones, botes, cubos…' },
        { id: '1.3.2', description: 'Pallets u otros elementos de apoyo, tacos' },
        { id: '1.3.3', description: 'Bolsas, plásticos, protecciones, elementos de flejado' },
        { id: '1.3.4', description: 'Productos de limpieza, paños, escobas…' },
        { id: '1.3.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '1.4', title: 'MOBILIARIO',
      items: [
        { id: '1.4.1', description: 'Bancos de trabajo' },
        { id: '1.4.2', description: 'Paneles herramienta' },
        { id: '1.4.3', description: 'Armarios o taquillas' },
        { id: '1.4.4', description: 'Sillas, mesas' },
        { id: '1.4.5', description: 'Paneles u otros soportes para información' },
        { id: '1.4.6', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '1.5', title: 'INFORMACIÓN',
      items: [
        { id: '1.5.1', description: 'Planos o Instrucciones de trabajo' },
        { id: '1.5.2', description: 'Posters u otra información divulgativa' },
        { id: '1.5.3', description: 'Gráficos o indicadores' },
        { id: '1.5.4', description: 'Carpetas o bandejas con documentación innecesaria' },
        { id: '1.5.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
  ],

  2: [
    {
      id: '2.1', title: 'EQUIPOS Y MÁQUINAS',
      items: [
        { id: '2.1.1', description: 'Los equipos y máquinas están identificados con su número de equipo correspondiente' },
        { id: '2.1.2', description: 'La identificación anterior es visible (no es necesario manipular partes del equipo)' },
        { id: '2.1.3', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '2.2', title: 'PASILLOS Y LUGARES DE UBICACIÓN',
      items: [
        { id: '2.2.1', description: 'Los pasillos y zonas de trabajo delimitados claramente' },
        { id: '2.2.2', description: 'Cuando algo falta, ¿todo el mundo sabe lo que falta? Todos pueden reconocer donde deben ubicarse.' },
        { id: '2.2.3', description: 'Los pallets de entrada y salida de material' },
        { id: '2.2.4', description: 'Los equipos móviles (escaleras, transpaletas, carros, utillajes sobre ruedas)' },
        { id: '2.2.5', description: 'Los medios de transporte (transpaletas, plataformas, carretillas, coches, camiones…)' },
        { id: '2.2.6', description: 'Las herramientas cuentan con ubicaciones señalizadas inequívocamente (sistemas poka-yoke, siluetas, etiquetas identificativas)' },
        { id: '2.2.7', description: 'Consumibles' },
      ],
    },
    {
      id: '2.3', title: 'SEÑALIZACIÓN',
      items: [
        { id: '2.3.1', description: 'Están señalizados de forma visible e inequívoca los mandos de maniobra de los equipos y máquinas (sentido de movimiento, on/off, stop, parada de emergencia…)' },
        { id: '2.3.2', description: 'Se puede reconocer cuando las máquinas están en tensión (con señal luminosa tipo led o similar)' },
        { id: '2.3.3', description: 'Existe señalización de peligro cuando las máquinas están en funcionamiento (luz rotatoria luminosa, señal destellante, aviso sonoro, balizamiento o cartel advertencia)' },
        { id: '2.3.4', description: 'La señalización del lugar es adecuada y visible desde todos los puntos (en especial la relativa a medios de extinción y vías de evacuación)' },
        { id: '2.3.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '2.4', title: 'STOCKS DE MATERIAL',
      items: [
        { id: '2.4.1', description: 'Están identificados los materiales en el área de trabajo?' },
        { id: '2.4.2', description: 'Las etiquetas identificativas están en buenas condiciones, son claras y visibles' },
        { id: '2.4.3', description: 'La identificación informa acerca del cliente y proveedor' },
        { id: '2.4.4', description: 'La identificación contiene la denominación del material, referencia o artículo' },
        { id: '2.4.5', description: 'Es correcta la información, coincide esta con el material al que identifican y su ubicación' },
        { id: '2.4.6', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '2.5', title: 'LAYOUT',
      items: [
        { id: '2.5.1', description: 'Existe un layout actualizado de la zona que refleja la disposición real de equipos, máquinas y elementos' },
        { id: '2.5.2', description: 'El layout está visible y accesible para todo el personal de la zona' },
        { id: '2.5.3', description: 'Las ubicaciones en el layout están codificadas y referenciadas (nomenclatura de posiciones)' },
        { id: '2.5.4', description: 'El layout se actualiza tras cada cambio de disposición de la zona' },
        { id: '2.5.5', description: 'El flujo de materiales y personas está definido en el layout (entradas, salidas, recorridos)' },
        { id: '2.5.6', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '2.6', title: 'CÓDIGO DE COLORES / MARCADO DE SUELO',
      items: [
        { id: '2.6.1', description: 'Existe un código de colores definido y documentado para el marcado del suelo de la zona' },
        { id: '2.6.2', description: 'El código de colores es conocido por todo el personal (está expuesto o en la biblioteca de estándares)' },
        { id: '2.6.3', description: 'Las líneas de suelo están pintadas o pegadas en buen estado, sin desgaste ni roturas' },
        { id: '2.6.4', description: 'Los pasillos de circulación están delimitados con el color correspondiente según el código' },
        { id: '2.6.5', description: 'Las zonas de almacenamiento y ubicación de materiales están delimitadas con el color correspondiente' },
        { id: '2.6.6', description: 'Las zonas de peligro/restricción están marcadas con el color de aviso correspondiente' },
        { id: '2.6.7', description: 'Las áreas de evacuación y seguridad están señalizadas en suelo según normativa' },
        { id: '2.6.8', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
  ],

  3: [
    {
      id: '3.1', title: 'MÁQUINAS O PUESTOS DE TRABAJO',
      items: [
        { id: '3.1.1', description: 'Máquinas herramienta o grandes utillajes anclados al suelo (volteo o anclaje de piezas para ensamblar)' },
        { id: '3.1.2', description: 'Bancos de trabajo o de pruebas' },
        { id: '3.1.3', description: 'Grúas, carretillas y otros vehículos móviles' },
        { id: '3.1.4', description: 'Andamios' },
        { id: '3.1.5', description: 'Mesas, taburetes, sillas' },
        { id: '3.1.6', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '3.2', title: 'ENTORNO DE TRABAJO',
      items: [
        { id: '3.2.1', description: 'Suelos' },
        { id: '3.2.2', description: 'Paredes, columnas, techos, ventanas, puertas, alfeizares…' },
        { id: '3.2.3', description: 'Paneles informativos y de gestión operativa (producción, indicadores…)' },
        { id: '3.2.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '3.3', title: 'HERRAMIENTAS Y EQUIPOS',
      items: [
        { id: '3.3.1', description: 'Están limpias las herramientas? Se pueden manipular sin mancharse? (no hay restos de grasas, silicona, pintura seca..)' },
        { id: '3.3.2', description: 'Los equipos de trabajo, bombas de apriete, útiles...' },
        { id: '3.3.3', description: 'Están limpios los equipos y accesorios de elevación' },
        { id: '3.3.4', description: 'Se mantiene limpio el equipamiento en el interior de los armarios y/o cajones, incluso si no se está usando' },
        { id: '3.3.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '3.4', title: 'MANTENER LIMPIO',
      items: [
        { id: '3.4.1', description: '¿Se sabe quién debe limpiar, cuándo y dónde?' },
        { id: '3.4.2', description: '¿Cubre las necesidades de la zona? (tener en cuenta el resultado en los puntos anteriores)' },
        { id: '3.4.3', description: '¿Se realiza la limpieza según lo planificado? (frecuencia, dedicación de tiempo, etc..)' },
        { id: '3.4.4', description: 'Están limpios los Equipos de Protección Individual EPI (gafas, protección respiratoria, cascos, guantes…)' },
        { id: '3.4.5', description: 'Se evidencia una tendencia a manchar menos en la rutina del trabajo diario (la ropa de trabajo se mantiene limpia, no se dejan huellas en superficies limpias, se limpia cuando se ensucia, no hay basura en lugares de paso…)' },
        { id: '3.4.6', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '3.5', title: 'KIT DE LIMPIEZA',
      items: [
        { id: '3.5.1', description: 'Hay un kit de limpieza básico disponible en la zona?' },
        { id: '3.5.2', description: 'Es adecuado el kit de limpieza al tipo de suciedad y superficies a limpiar? (desengrasante si hay que limpiar grasa, escoba si hay que barrer…)' },
        { id: '3.5.3', description: 'La cantidad de contenedores es adecuada a los residuos generados, estos no están excesivamente llenos (tapa cerrada) ni hay basura fuera del contenedor.' },
        { id: '3.5.4', description: 'Se realiza una recogida selectiva de los residuos (como mínimo los residuos peligrosos deben estar separados de los residuos inertes)' },
        { id: '3.5.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
  ],

  4: [
    {
      id: '4.1', title: 'ESTANDARIZACIÓN',
      items: [
        { id: '4.1.1', description: 'Se respetan los estándares globales en cuanto a marcaje y uso en Suelos' },
        { id: '4.1.2', description: 'Se respetan los estándares globales en cuanto a marcaje y uso en Pasillos' },
        { id: '4.1.3', description: 'Se respetan los estándares globales en cuanto a marcaje y uso en Zonas de trabajo, entrada y salida de materiales' },
        { id: '4.1.4', description: 'Se respetan los estándares globales en cuanto a marcaje y uso en Residuos, zonas de riesgo permanente y de paso no permitido' },
        { id: '4.1.5', description: 'Está construido según el estándar corporativo el Panel PDCA' },
        { id: '4.1.6', description: 'Está construido según el estándar corporativo el Panel Lay Out Global' },
        { id: '4.1.7', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '4.2', title: 'RESPETAR ESTÁNDARES',
      items: [
        { id: '4.2.1', description: 'Las ubicaciones en el suelo son respetadas, todo está ubicado en su lugar correspondiente' },
        { id: '4.2.2', description: 'Las ubicaciones de las herramientas en los paneles y cajas (incluso en el interior) son respetadas, no se encuentran herramientas fuera de ubicación' },
        { id: '4.2.3', description: 'Se aplican los estándares creados en una zona o departamento en el resto de zonas (copiar-pegar). No hay diferentes estándares para la misma función (diferentes códigos de colores, formatos, señalización, etc)' },
        { id: '4.2.4', description: 'La documentación se encuentra organizada y clasificada de forma que facilita su localización' },
        { id: '4.2.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '4.3', title: 'INSPECCIÓN Y MANTENIMIENTO',
      items: [
        { id: '4.3.1', description: 'Existen planes de inspección para máquinas y equipos de trabajo que requieran mantenimiento periódico?' },
        { id: '4.3.2', description: 'Podemos reconocer visualmente si las máquinas y equipos han pasado la inspección periódica correspondiente de forma favorable (con etiquetas de colores o sistemas análogos)' },
        { id: '4.3.3', description: 'Se aplica un sistema con código de colores para la indicación visual del estado de revisión en los equipos y accesorios de elevación?' },
        { id: '4.3.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '4.4', title: 'INSTRUCCIONES VISUALES',
      items: [
        { id: '4.4.1', description: 'Existen instrucciones gráficas en puntos visibles del área de trabajo sobre estándares de uso común (check list, fichas o planes de izado, diagramas de flujo, secuencias de proceso, instrucciones punto a punto,…)' },
        { id: '4.4.2', description: 'Los productos químicos están correctamente identificados, contenido, peligrosidad, riesgos para la salud,…y acompañados de su ficha de datos de seguridad' },
        { id: '4.4.3', description: 'Las señalizaciones de peligro e instrucciones de las máquinas y equipos se conservan de forma que sigan siendo útiles al usuario del equipo' },
        { id: '4.4.4', description: 'Se dispone de instrucciones visuales de cómo actuar en caso de emergencia (incendio, evacuación, derrame, accidente, etc.)' },
        { id: '4.4.5', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '4.5', title: 'INDICADORES VISUALES',
      items: [
        { id: '4.5.1', description: 'Existe un panel o documento en lugar visible para el seguimiento de la producción (previsto/real, hitos, o similar)' },
        { id: '4.5.2', description: 'Se realiza un seguimiento visual de acciones correctivas, preventivas y de mejora continua (gráfico acciones PDCA, incidencias de calidad, etc..)' },
        { id: '4.5.3', description: 'Se mantienen actualizados todos los indicadores visuales existentes en la zona/proceso. Es una rutina constante la actualización y seguimiento' },
        { id: '4.5.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
  ],

  5: [
    {
      id: '5.1', title: 'AUDITORÍAS',
      items: [
        { id: '5.1.1', description: 'Se realizan auditorías semanales 5S' },
        { id: '5.1.2', description: 'Se transforman las anomalías en acciones correctivas o de mejora con el fin de que no se repitan' },
        { id: '5.1.3', description: 'Si están implantadas otras herramientas de inspección o comprobación, estas son utilizadas según el estándar' },
        { id: '5.1.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '5.2', title: 'GESTIÓN DE ANOMALÍAS',
      items: [
        { id: '5.2.1', description: 'Hay un sistema de declaración de anomalías implantado, entendiendo por "declaración de anomalías" hacerlas visibles, evitar que los problemas queden escondidos.' },
        { id: '5.2.2', description: 'Se encuentran evidencias de que el sistema de declaración de anomalías es eficaz, las anomalías se registran y se resuelven de forma efectiva, evitando que se repitan' },
        { id: '5.2.3', description: 'Existen instrucciones visuales del funcionamiento del sistema de declaración de anomalías' },
        { id: '5.2.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
    {
      id: '5.3', title: 'ACCIÓN',
      items: [
        { id: '5.3.1', description: 'Se gestiona la mejora continua a través del panel PDCA visual de la zona' },
        { id: '5.3.2', description: 'Las acciones de mejora se incluyen en el plan de acción y se realizan acciones semanalmente (mejora continua)' },
        { id: '5.3.3', description: 'Se lleva a cabo un seguimiento por medio de indicadores que miden la continuidad del ciclo PDCA.' },
        { id: '5.3.4', description: 'Otros (Indicar cuál)', hasOther: true },
      ],
    },
  ],
};

/**
 * Audit result for a single checklist item
 */
export interface AuditItemResult {
  itemId: string;
  status: 'ok' | 'nok' | 'na';   // OK / NOK / No aplica
  hallazgo?: string;               // Referencia del hallazgo (desviación detectada)
  mejora?: string;                 // Punto a Mejorar (sugerencia)
  photoRef?: string;               // Referencia a foto (biblioteca de fotos paso 2)
  otherText?: string;              // Texto libre para items "Otros"
}

/**
 * Complete audit result for one S-step
 */
export interface AuditResult {
  sStep: number;
  miniStep: number;               // 4 (autoevaluación interna) or 5 (auditoría externa)
  results: AuditItemResult[];
  score: number;                   // 0-100
  observaciones?: string;
  auditor?: string;                // Nombre del auditor (solo para paso 5)
  fecha?: string;                  // Fecha de la auditoría
}

/** Calculate total items per S from the actual checklist data */
export function getAuditTotalItems(sStep: number): number {
  const sections = AUDIT_CHECKLISTS[sStep];
  if (!sections) return 0;
  return sections.reduce((sum, section) => sum + section.items.length, 0);
}

/** Total items per S for scoring (computed from actual checklist data) */
export const AUDIT_TOTAL_ITEMS: Record<number, number> = {
  1: getAuditTotalItems(1),
  2: getAuditTotalItems(2),
  3: getAuditTotalItems(3),
  4: getAuditTotalItems(4),
  5: getAuditTotalItems(5),
};

/** Combined quarterly audit (all 5 S together) — sStep=0 */
export const QUARTERLY_AUDIT_CHECKLIST: AuditSection[] = Object.values(AUDIT_CHECKLISTS).flat();

/** Weekly audit — only cleaning (S3) checklist */
export const WEEKLY_AUDIT_CHECKLIST: AuditSection[] = AUDIT_CHECKLISTS[3];

/** Monthly audit — abbreviated version: first 2 items from each section per S */
export const MONTHLY_AUDIT_CHECKLIST: AuditSection[] = Object.entries(AUDIT_CHECKLISTS).flatMap(([sStep, sections]) =>
  sections.map(section => ({
    ...section,
    items: section.items.slice(0, 2), // First 2 items per section for abbreviated audit
  }))
);

/** Total items for weekly audit */
export const WEEKLY_AUDIT_TOTAL_ITEMS = WEEKLY_AUDIT_CHECKLIST.reduce(
  (sum, section) => sum + section.items.length,
  0
);

/** Total items for monthly audit */
export const MONTHLY_AUDIT_TOTAL_ITEMS = MONTHLY_AUDIT_CHECKLIST.reduce(
  (sum, section) => sum + section.items.length,
  0
);

/** Total items for quarterly combined audit */
export const QUARTERLY_AUDIT_TOTAL_ITEMS = QUARTERLY_AUDIT_CHECKLIST.reduce(
  (sum, section) => sum + section.items.length,
  0
);
