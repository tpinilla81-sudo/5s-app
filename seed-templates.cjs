const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('./db/custom.db');

// Delete existing inventario templates for S1 and S2
db.prepare("DELETE FROM Template WHERE type = 'inventario' AND sStep IN (1, 2)").run();

const insert = db.prepare(`
  INSERT INTO Template (id, type, sStep, miniStep, title, description, content, notaMinima, active, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

// ─── S1: Innecesarios ───
const s1Content = JSON.stringify({
  title: "Inventario de Innecesarios",
  subtitle: "SEIRI — Identifica y clasifica los elementos innecesarios",
  templateName: "S1_Inventario_Innecesarios_Seiri.xlsx",
  categories: [
    { value: "materiales", label: "MATERIALES", color: "bg-blue-100 text-blue-800" },
    { value: "maquinas_equipos", label: "MÁQUINAS Y EQUIPOS", color: "bg-purple-100 text-purple-800" },
    { value: "mobiliario", label: "MOBILIARIO", color: "bg-amber-100 text-amber-800" },
    { value: "informacion", label: "INFORMACIÓN", color: "bg-teal-100 text-teal-800" },
    { value: "transporte_almacenaje", label: "TRANSPORTE Y ALMACENAJE", color: "bg-orange-100 text-orange-800" }
  ],
  extraFields: [
    { key: "codigo", label: "Código de Trazabilidad", type: "text" },
    { key: "subcategoria", label: "Subcategoría", type: "select", options: [
      "Consumibles", "Materia Prima", "Producto en proceso", "Producto acabado",
      "Máquinas de trabajo", "Utillajes de trabajo", "Equipos y accesorios de Elevación",
      "Equipos de ensayo y verificación", "Herramientas de ensamblaje", "Equipos informáticos", "Equipos de limpieza",
      "Bancos de trabajo", "Paneles herramienta", "Armarios o taquillas", "Sillas, mesas", "Paneles u otros soportes para información",
      "Planos, instrucciones, boletines de trabajo", "Posters u otra información divulgativa", "Información referente a indicadores", "Carpeta o bandejas con documentación", "Información de seguridad",
      "Máquinas de transporte", "Utillajes de transporte, Pallets, embalajes de madera, cajas", "Estanterías, gavetas, contenedores", "Bolsas, plásticos, protecciones, elementos de flejado", "Carros de transporte"
    ]},
    { key: "estado", label: "Estado de Conservación", type: "select", options: ["Bueno", "Regular", "Malo"] },
    { key: "accion_destino", label: "Acción / Destino", type: "select", options: ["JAULA", "TIRAR"] },
    { key: "motivo", label: "Motivo de Descarte", type: "text" }
  ],
  desplegables_jerarquicos: {
    "MATERIALES": { prefijo_codigo: "MAT", subcategorias: ["Consumibles", "Materia Prima", "Producto en proceso", "Producto acabado"] },
    "MÁQUINAS Y EQUIPOS": { prefijo_codigo: "MAQ", subcategorias: ["Máquinas de trabajo", "Utillajes de trabajo", "Equipos y accesorios de Elevación", "Equipos de ensayo y verificación", "Herramientas de ensamblaje", "Equipos informáticos", "Equipos de limpieza"] },
    "MOBILIARIO": { prefijo_codigo: "MOB", subcategorias: ["Bancos de trabajo", "Paneles herramienta", "Armarios o taquillas", "Sillas, mesas", "Paneles u otros soportes para información"] },
    "INFORMACIÓN": { prefijo_codigo: "INF", subcategorias: ["Planos, instrucciones, boletines de trabajo", "Posters u otra información divulgativa", "Información referente a indicadores", "Carpeta o bandejas con documentación", "Información de seguridad"] },
    "TRANSPORTE Y ALMACENAJE": { prefijo_codigo: "TRA", subcategorias: ["Máquinas de transporte", "Utillajes de transporte, Pallets, embalajes de madera, cajas", "Estanterías, gavetas, contenedores", "Bolsas, plásticos, protecciones, elementos de flejado", "Carros de transporte"] }
  }
}, null, 2);

// ─── S2: Necesarios ───
const s2Content = JSON.stringify({
  title: "Inventario de Necesarios",
  subtitle: "SEITON — Organiza los elementos necesarios en su ubicación correcta",
  templateName: "S2_Inventario_Necesarios_Seiton.xlsx",
  categories: [
    { value: "materiales", label: "MATERIALES", color: "bg-blue-100 text-blue-800" },
    { value: "maquinas_equipos", label: "MÁQUINAS Y EQUIPOS", color: "bg-purple-100 text-purple-800" },
    { value: "mobiliario", label: "MOBILIARIO", color: "bg-amber-100 text-amber-800" },
    { value: "informacion", label: "INFORMACIÓN", color: "bg-teal-100 text-teal-800" },
    { value: "transporte_almacenaje", label: "TRANSPORTE Y ALMACENAJE", color: "bg-orange-100 text-orange-800" }
  ],
  extraFields: [
    { key: "codigo", label: "Código de Trazabilidad", type: "text" },
    { key: "subcategoria", label: "Subcategoría", type: "select", options: [
      "Consumibles", "Materia Prima", "Producto en proceso", "Producto acabado",
      "Máquinas de trabajo", "Utillajes de trabajo", "Equipos y accesorios de Elevación",
      "Equipos de ensayo y verificación", "Herramientas de ensamblaje", "Equipos informáticos", "Equipos de limpieza",
      "Bancos de trabajo", "Paneles herramienta", "Armarios o taquillas", "Sillas, mesas", "Paneles u otros soportes para información",
      "Planos, instrucciones, boletines de trabajo", "Posters u otra información divulgativa", "Información referente a indicadores", "Carpeta o bandejas con documentación", "Información de seguridad",
      "Máquinas de transporte", "Utillajes de transporte, Pallets, embalajes de madera, cajas", "Estanterías, gavetas, contenedores", "Bolsas, plásticos, protecciones, elementos de flejado", "Carros de transporte"
    ]},
    { key: "zona_destino", label: "Zona Actual / Destino", type: "text" },
    { key: "responsable", label: "Responsable / Área", type: "text" },
    { key: "estado", label: "Estado de Conservación", type: "select", options: ["Excelente", "Bueno", "Regular", "Requiere Mantenimiento"] }
  ],
  desplegables_jerarquicos: {
    "MATERIALES": { prefijo_codigo: "MAT", subcategorias: ["Consumibles", "Materia Prima", "Producto en proceso", "Producto acabado"] },
    "MÁQUINAS Y EQUIPOS": { prefijo_codigo: "MAQ", subcategorias: ["Máquinas de trabajo", "Utillajes de trabajo", "Equipos y accesorios de Elevación", "Equipos de ensayo y verificación", "Herramientas de ensamblaje", "Equipos informáticos", "Equipos de limpieza"] },
    "MOBILIARIO": { prefijo_codigo: "MOB", subcategorias: ["Bancos de trabajo", "Paneles herramienta", "Armarios o taquillas", "Sillas, mesas", "Paneles u otros soportes para información"] },
    "INFORMACIÓN": { prefijo_codigo: "INF", subcategorias: ["Planos, instrucciones, boletines de trabajo", "Posters u otra información divulgativa", "Información referente a indicadores", "Carpeta o bandejas con documentación", "Información de seguridad"] },
    "TRANSPORTE Y ALMACENAJE": { prefijo_codigo: "TRA", subcategorias: ["Máquinas de transporte", "Utillajes de transporte, Pallets, embalajes de madera, cajas", "Estanterías, gavetas, contenedores", "Bolsas, plásticos, protecciones, elementos de flejado", "Carros de transporte"] }
  }
}, null, 2);

const s1Id = randomUUID();
insert.run(s1Id, 'inventario', 1, 3,
  'Inventario de Innecesarios (S1)',
  'Gestión de Descartes. Define si el objeto se destruye (Tirar) o se traslada a la Jaula (Zona Común).',
  s1Content, null, 1
);

const s2Id = randomUUID();
insert.run(s2Id, 'inventario', 2, 3,
  'Inventario de Necesarios (S2)',
  'Registro de artículos requeridos que permanecen identificados en su respectiva zona de trabajo.',
  s2Content, null, 1
);

console.log('✅ Templates inserted successfully!');
console.log('  S1 Innecesarios ID:', s1Id);
console.log('  S2 Necesarios ID:', s2Id);

// Verify
const rows = db.prepare("SELECT id, type, sStep, miniStep, title FROM Template WHERE type = 'inventario' AND sStep IN (1, 2)").all();
console.log('Verification:', JSON.stringify(rows, null, 2));

db.close();
