import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']
const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']

const TRAINING_CONTENT: Record<number, { sections: Array<{ title: string; content: string }> }> = {
  1: {
    sections: [
      {
        title: '1ª S - SEIRI (Revisar)',
        content: 'Consiste en revisar para identificar y clasificar los elementos innecesarios para la realización del trabajo. Es importante inventariar los elementos para luego ubicarlos en el lugar más apropiado para su uso y gestión.\n\nObjetivo: Aprovechar lugares despejados.\n\nAnaliza todo de una manera ordenada. Conoce lo que tienes. Establecer criterios para deshacerse de lo innecesario. Nota mínima para superar: 90',
      },
      {
        title: 'Ventajas y Beneficios',
        content: '"Ten sólo lo necesario en la cantidad correcta"\n\nSu práctica es esencial para la reducción o eliminación de accidentes.\n• Libera espacio útil.\n• Reducir los tiempos.\n• Facilita y mejorar el control visual.\n• Eliminar las pérdidas de productos o elementos.\n• Facilita el mantenimiento autónomo de máquinas.',
      },
      {
        title: 'IDENTIFICAR - Los 8 Desperdicios (MUDA)',
        content: 'MUDA es la palabra japonesa que define todos los «desperdicios» que consumen nuestro valioso tiempo y dinero.\n\nIdentifica necesarios e innecesarios según los 8 mudas o desperdicios:\n1. Sobreproducción\n2. Esperas\n3. Transporte\n4. Sobreprocesos\n5. Inventario\n6. Movimiento\n7. Defectos\n8. Talento de personas',
      },
      {
        title: 'Desperdicio de Sobre-Producción',
        content: 'Cuando se produce demasiado, más de lo que el cliente requiere. Se observa que hay producto acabado de más en la zona.',
      },
      {
        title: 'Desperdicio de Espera',
        content: 'Cuando los trabajadores están esperando el trabajo de otros. Esperar nuevas órdenes o instrucciones, esperar reparaciones. Se observa a personas realizando trabajos que no les corresponde.',
      },
      {
        title: 'Desperdicio de Transporte',
        content: 'Cuando se realizan muchos movimientos internos de materiales sin necesidad. Se observan almacenes intermedios que podrían estar en los proveedores.',
      },
      {
        title: 'Desperdicio de Sobre-Proceso',
        content: 'Cuando se realizan procesos que el cliente no paga. Se observan tareas en el proceso que luego se deshacen. Embalajes intermedios... etc.',
      },
      {
        title: 'Desperdicio de Inventario',
        content: 'Cuando se compra y almacena mucha materia prima. Se observa que se llenan almacenes o huecos de almacenaje con cantidades de materiales que no se requieren. Problemas de caducidades. Se compra mucho porque es barato... etc.',
      },
      {
        title: 'Desperdicio de Movimiento',
        content: 'Cuando los trabajadores están más tiempo en movimiento que trabajando. Se observa que las personas no están en su puesto de trabajo porque están continuamente buscando lo que necesitan.',
      },
      {
        title: 'Desperdicio de Defectos',
        content: 'Cuando los trabajadores están más tiempo reparando el producto terminado que produciendo. Se observa mucho tiempo las máquinas reparando por defectos. El personal de mantenimiento agitado.',
      },
      {
        title: 'No Aprovechar el Talento de las Personas',
        content: 'Cuando no se involucra en la mejora a todas las personas de la organización. Se observan prácticas individuales y que cada uno hace las cosas de manera diferente.',
      },
      {
        title: 'CLASIFICAR',
        content: 'Los elementos se clasifican en:\n• Materiales\n• Máquinas y equipos\n• Transporte y almacenaje\n• Mobiliario\n• Información',
      },
      {
        title: 'INVENTARIAR y UBICAR',
        content: 'Inventariar todos los elementos identificados para su gestión.\n\nPreguntas clave:\n• ¿Es necesario este elemento?\n• ¿Si es necesario, es necesario en esta cantidad?\n• ¿Si es necesario, tiene que estar localizado aquí?\n• ¿Cuánto tiempo hace que no se utiliza?',
      },
      {
        title: 'Gestión de Jaulas y Tarjetas',
        content: '"JAULA" es un lugar físico donde se destina todo aquel elemento que se elimina de lugar de trabajo y que puede servir para otros.\n\nTipos de JAULA:\n• TIPO A: Una por cada fábrica / 2 semanas de cuarentena / ordenado por tipo\n• TIPO B: Una por cada zona / 1 semana de cuarentena\n• TIPO C: Una por taller inicial / desaparece al finalizarlo\n\nEl color rojo del etiquetado de innecesarios significa: Enviar a la "JAULA".\nEl color naranja del etiquetado de innecesarios significa: Cuestionar si se envía a la "JAULA".',
      },
    ],
  },
  2: {
    sections: [
      {
        title: '2ª S - SEITON (Ordenar)',
        content: 'Consiste en ordenar para clasificar los elementos necesarios que hemos identificado en la 1ª S y que puedan ser encontrados con facilidad. Es importante inventariar los elementos para luego ubicarlos en el lugar más apropiado para su uso y gestión. Aparecen los primeros estándar.\n\nObjetivo: Encontrar fácilmente lo que estamos buscando.\n\nCriterios de situar y criterios de agrupar. Nota mínima para superar: 80',
      },
      {
        title: 'Ventajas y Beneficios',
        content: '"Un lugar para cada cosa, y cada cosa en su lugar"\n\n• Facilita y mejorar el control visual.\n• Eliminar las pérdidas de productos o elementos.\n• Mayor cumplimiento de las órdenes de trabajo.\n• Facilita el mantenimiento autónomo de máquinas, evitando averías.\n• Todo el miembro de la organización puede encontrar fácilmente lo que está buscando sin necesidad de estar totalmente familiarizado con el entorno.',
      },
      {
        title: 'CLASIFICAR',
        content: 'Los elementos se clasifican en:\n• Materiales\n• Máquinas y equipos\n• Transporte y almacenaje\n• Mobiliario\n• Información',
      },
      {
        title: 'Primeros Estándar - Layout',
        content: 'Layout es el diseño de la disposición más óptima de los elementos de las zonas de trabajo. Los objetivos del layout son facilitar la eliminación de los 8 desperdicios o "MUDAS".\n\nSeñalización del suelo: estándar visual para delimitar zonas de ubicación de elementos.',
      },
      {
        title: 'INVENTARIAR y UBICAR - Criterios',
        content: 'Criterios para ubicar los elementos:\n• Definir un nombre, código o color para cada clase de artículo.\n• Determinar la cantidad exacta que debe haber de cada artículo.\n• Decidir donde guardar las cosas tomando en cuenta la frecuencia de su uso.\n• Crear los medios para asegurar que cada artículo regrese a su lugar.\n• Colocar las cosas útiles por orden según criterios de: Seguridad / Calidad / Eficacia.\n\nSeguridad: Que no se puedan caer, que no se puedan mover, que no estorben.\nCalidad: Que no se oxiden, que no se golpeen, que no se puedan mezclar, que no se deterioren.\nEficacia: Minimizar el tiempo perdido.',
      },
      {
        title: 'Frecuencia de Uso',
        content: 'Decidir donde guardar las cosas tomando en cuenta la frecuencia de su uso:\n\n• Uso diario: en la zona de trabajo, al alcance de la mano\n• Uso semanal: cerca de la zona de trabajo\n• Uso mensual: en el almacén cercano\n• Uso cada varios años: en el almacén exterior\n\nLo que no es necesario se gestiona con las jaulas de innecesarios.',
      },
      {
        title: 'Tarjetas de Jaula/Almacén',
        content: 'El color rojo del etiquetado de innecesarios significa: Enviar a la "JAULA".\nEl color naranja del etiquetado de innecesarios significa: Cuestionar si se envía a la "JAULA".',
      },
    ],
  },
  3: {
    sections: [
      {
        title: '3ª S - SEISO (Limpiar)',
        content: 'Consiste en limpiar para identificar y clasificar los puntos de suciedad para eliminarlos, en lo posible, desde la causa raíz. Al finalizar, obtendremos el kit de limpieza óptimo.\n\nObjetivo: Identifiquemos las fuentes de suciedad.\n\nLocalizar fuentes de suciedad. Nota mínima para superar: 80',
      },
      {
        title: 'Ventajas y Beneficios',
        content: '"No es más limpio quien más limpia sino quien menos ensucia"\n"La limpieza es inspección"\n\n• Reduce el riesgo potencial de incidentes/accidentes.\n• Mejora el confort laboral.\n• Se incrementa la vida útil de los equipos y máquinas.\n• Las averías se pueden identificar más fácilmente.\n• Aumento significativo de la Productividad.\n• Se reducen los despilfarros de materiales y energía.\n• La calidad del producto se mejora.',
      },
      {
        title: 'Criterios de Limpieza',
        content: '• Integrar la limpieza como parte del trabajo diario.\n• Asumir la limpieza como una actividad de mantenimiento autónomo.\n• Se debe abolir la distinción entre operario de proceso, operario de limpieza y técnico de mantenimiento.\n• El trabajo de limpieza genera conocimiento sobre el equipo. No se trata de una actividad simple que se pueda delegar en personas de menor cualificación.\n• Se debe elevar la limpieza a la búsqueda de las fuentes de contaminación con el objeto de eliminar sus causas primarias.',
      },
      {
        title: 'Identificar, Clasificar y Eliminar Fuentes de Suciedad',
        content: 'Proceso:\n1. IDENTIFICAR las fuentes de suciedad (registro de incidencias/planes de acción)\n2. CLASIFICAR las fuentes según tipo y causa\n3. ELIMINAR las fuentes desde la causa raíz\n\nSi hay suciedad es fuente de suciedad. Si no hay suciedad no es parche.\nLo que se trata en la 1ª y 2ª S no se vuelve a tratar aquí.',
      },
      {
        title: 'Plan de Inspección y Limpieza - Kit de Limpieza',
        content: 'El plan de inspección y limpieza es la auditoría diaria.\n\nKit de limpieza: Según las fuentes de suciedad que hemos encontrado necesitaremos unos útiles de limpieza específicos y unos contenedores de reciclaje apropiados.\n\nEstándar: Documentar los procedimientos de limpieza y los útiles necesarios para cada zona.',
      },
    ],
  },
  4: {
    sections: [
      {
        title: '4ª S - SEIKETSU (Estandarizar)',
        content: 'Consiste básicamente en aplicar y mantener lo que se ha venido desarrollando hasta ahora estandarizando soluciones creativas para mantener el puesto de trabajo limpio y ordenado, preferiblemente mediante control visual.\n\nObjetivo: Control visual.\n\nAnalizar estándar visuales. 1ªS-2ªS-3ªS. Nota mínima para superar: 70',
      },
      {
        title: 'Ventajas y Beneficios',
        content: '"El control visual es cualquier dispositivo de comunicación que nos indique el estado de algo con un solo vistazo"\n\n• Muestra información necesaria, fácil y rápida de entender.\n• Se fomenta y guarda el conocimiento, cualquiera pueda realizar la operación.\n• Mejora el confort laboral.\n• Se evitan errores de mantenimientos y limpieza reduciendo incidentes/accidentes.\n• Hay un compromiso de las áreas al tener que aprobar estándares.\n• Las personas adquieren sus responsabilidades.\n• Se incrementa la productividad de la planta.',
      },
      {
        title: 'Biblioteca de Estándares',
        content: 'Crear una biblioteca de estándares que incluya:\n• Estándares de las 3 primeras S\n• Procedimientos de trabajo documentados\n• Criterios de calidad visual\n• Responsabilidades y frecuencias\n• Materiales y herramientas necesarios\n• Qué hacer si algo no cumple el estándar\n\nLos estándares deben ser claros, visuales y fáciles de cumplir por todos. Compartir la información sin que tenga que buscarse o pedirse.',
      },
      {
        title: 'Estandarizar y Hacer Visibles los Estándares',
        content: 'Pasos para la 4ª S:\n1. Analizar los estándares visuales necesarios\n2. Estandarizar todo y hacer visibles los estándares utilizados\n3. Crear dispositivos de control visual\n4. Aprobar estándares entre las áreas\n5. Documentar y difundir\n\nPara pasar a la fase 5 (5ªS): Deberemos obtener una nota de 70 o más en la auditoría.',
      },
    ],
  },
  5: {
    sections: [
      {
        title: '5ª S - SHITSUKE (Mantener)',
        content: 'Consiste en tener el hábito y crear un ambiente de respeto a las normas y estándares establecidos.\n\nObjetivo: Mantener disciplina.\n\n1ª auditoría inicial. Nota mínima para superar: 70',
      },
      {
        title: 'Ventajas y Beneficios',
        content: '"Sin disciplina y hábito cualquier beneficio logrado en los primeros cuatro desaparece."\n\n• Crea cultura para que se respeten y se cuiden los recursos.\n• Se cambian los malos hábitos.\n• Se respetan más el trabajo de las personas.\n• Se eleva la motivación.\n• Aumenta la calidad y las relaciones con los clientes.\n• Aumenta la productividad.\n• Todos los integrantes de la organización se sienten participativos.',
      },
      {
        title: 'Cronograma de Auditorías',
        content: 'Establecer un cronograma de auditorías periódicas para verificar el cumplimiento de las 5S.\n\n• Hacer visibles los resultados de las 5 S\n• Comunicar los resultados a toda la organización\n• Reconocer los logros y avances\n• Corregir las desviaciones de forma sistemática\n• Mantener la disciplina como hábito diario\n\nLa mejora continua es un viaje, no un destino. Cada día podemos hacer algo un poco mejor que ayer.',
      },
    ],
  },
}

const EXAM_QUESTIONS: Record<number, { questions: Array<{ question: string; options: string[]; correctIndex: number }> }> = {
  1: {
    questions: [
      { question: 'La 1ª S consiste en:', options: ['Identificar para clasificar los elementos necesarios e innecesarios para la realización del trabajo', 'Clasificar para identificar los elementos necesarios e innecesarios para la realización del trabajo', 'Inventariar para identificar y clasificar los elementos necesarios e innecesarios para la realización del trabajo', 'Revisar para identificar y clasificar los elementos necesarios e innecesarios para la realización del trabajo'], correctIndex: 3 },
      { question: '¿Qué significa MUDA?', options: ['MUDA es la palabra japonesa que define la revisión de los materiales en las zonas de trabajo.', 'MUDA son las siglas de una metodología industrial.', 'MUDA es la palabra de origen oriental y que significa eficiencia.', 'MUDA es la palabra japonesa que define todos los «desperdicios» que consumen nuestro valioso tiempo y dinero.'], correctIndex: 3 },
      { question: 'El desperdicio de sobre-producción es cuando:', options: ['Se realizan muchos movimientos internos de materiales sin necesidad.', 'Se produce demasiado, más de lo que el cliente requiere.', 'No se involucra en la mejora a todas las personas de la organización.', 'Se compra y almacena mucha materia prima.'], correctIndex: 1 },
      { question: 'El desperdicio de transporte es cuando:', options: ['Se realizan muchos movimientos internos de materiales sin necesidad.', 'Se produce demasiado, más de lo que el cliente requiere.', 'No se involucra en la mejora a todas las personas de la organización.', 'Se compra y almacena mucha materia prima.'], correctIndex: 0 },
      { question: 'Los elementos se clasifican en:', options: ['Tamaño, peso y color.', 'Materiales, máquinas y equipos, transporte y almacenaje, mobiliario e información.', 'Herramientas de mano o máquinas.', 'Zonas de uso, logística y producción.'], correctIndex: 1 },
      { question: 'La definición de "JAULA" es:', options: ['La caseta del guarda.', 'La parte de la fábrica donde están los vehículos.', 'Una zona de residuos.', 'Un lugar físico donde se destina todo aquel elemento que se elimina de lugar de trabajo y que puede servir para otros.'], correctIndex: 3 },
      { question: 'El color rojo del etiquetado de innecesarios es:', options: ['Cuestionar si se envía a la "JAULA".', 'El color no tiene significado alguno.', 'Enviar a la "JAULA".', 'Enviar fuera de la zona de trabajo.'], correctIndex: 2 },
      { question: 'Marca la respuesta correcta:', options: ['La 1ª S prepara las condiciones para la 2ª S, destinada al orden.', 'La 1ª S no es importante y podría hacerse al final.', 'El objetivo particular de la 1ª S es aprovechar lugares despejados.', 'La A y C son correctas.'], correctIndex: 3 },
    ],
  },
  2: {
    questions: [
      { question: 'La 2ª S consiste en:', options: ['Identificar para clasificar los elementos necesarios e innecesarios para la realización del trabajo', 'Clasificar para identificar los elementos necesarios e innecesarios para la realización del trabajo', 'Inventariar para identificar y clasificar los elementos necesarios e innecesarios para la realización del trabajo', 'Ordenar para identificar y clasificar los elementos necesarios que hemos observado en la 1ª S y que puedan ser encontrados con facilidad.'], correctIndex: 3 },
      { question: '¿Qué significa LAYOUT?', options: ['LAYOUT es el diseño de la disposición mas desfavorable de los elementos de las zonas de trabajo.', 'LAYOUT es el diseño de la disposición mas óptima de los trabajadores en las zonas de trabajo.', 'LAYOUT es el diseño de la disposición mas óptima de los desperdicios de las zonas de trabajo.', 'LAYOUT es el diseño de la disposición mas óptima de los elementos de las zonas de trabajo.'], correctIndex: 3 },
      { question: 'Un criterio para realizar correctamente la 2ª S es:', options: ['Decidir donde guardar las cosas tomando en cuenta la frecuencia de su uso.', 'Tirar lo que no se utilice mucho.', 'Ordenar todas las herramientas en los cajones.', 'Ordenar sin tener en cuenta la seguridad.'], correctIndex: 0 },
      { question: 'Unas de las ventajas de hacer la 2ª S es:', options: ['Facilita y mejorar el control visual.', 'Que todo este marcado para las visitas.', 'Eliminar las pérdidas de productos o elementos.', 'La A y la C son correctas.'], correctIndex: 3 },
      { question: 'Los elementos se clasifican en:', options: ['Tamaño, peso y color.', 'Materiales, máquinas y equipos, transporte y almacenaje, mobiliario e información.', 'Herramientas de mano o máquinas.', 'Zonas de uso, logística y producción.'], correctIndex: 1 },
      { question: 'Según la frecuencia de uso:', options: ['La frecuencia de uso no es importante para situar los elementos.', 'Lo que usamos cada muchos años lo guardamos en la zona de trabajo.', 'Lo que usamos todos los días lo ubicamos en el almacén exterior.', 'Lo que usamos todos los días lo ubicamos en la zona de trabajo.'], correctIndex: 3 },
      { question: 'El color naranja del etiquetado de innecesarios es:', options: ['Enviar a la "JAULA".', 'El color no tiene significado alguno.', 'Cuestionar si se envía a la "JAULA".', 'Enviar fuera de la zona de trabajo.'], correctIndex: 2 },
      { question: 'Marca la respuesta correcta:', options: ['La 2ª S facilita y mejorar el control visual.', 'La 2ª S facilita el mantenimiento autónomo de máquinas, evitando averías.', 'El objetivo particular de la 2ª S es aprovechar lugares despejados.', 'La A y B son correctas.'], correctIndex: 3 },
    ],
  },
  3: {
    questions: [
      { question: 'La 3ª S consiste en:', options: ['Limpiar para que vean las visitas que esta limpio.', 'Limpiar las máquinas para que funcionen bien.', 'Identificar los puntos de suciedad para limpiarlos semanalmente.', 'Limpiar para identificar y clasificar los puntos de suciedad para la eliminarlos, en lo posible, desde la causa raíz.'], correctIndex: 3 },
      { question: 'Una ventaja importante al aplicar la 3ª S es:', options: ['Reduce el riesgo potencial de incidentes/accidentes.', 'El suelo está mas brillante.', 'Mejora el confort laboral.', 'La A y la C son correctas.'], correctIndex: 3 },
      { question: 'Un criterio para realizar correctamente la 3ª S es:', options: ['Asumir la limpieza como una actividad de mantenimiento autónomo.', 'Solo limpian los encargados de la limpieza.', 'El objetivo no es eliminar las fuentes de suciedad.', 'Se debe hacer un plan de limpieza fuera de horas de trabajo.'], correctIndex: 0 },
      { question: 'La 3ª S es:', options: ['Una buena práctica para los tiempos muertos.', 'Que todo este limpio para las visitas.', 'Inspeccionar.', 'La ultima S.'], correctIndex: 2 },
      { question: 'Los elementos se clasifican en:', options: ['Tamaño, peso y color.', 'Materiales, máquinas y equipos, transporte y almacenaje, mobiliario e información.', 'Herramientas de mano o máquinas.', 'Zonas de uso, logística y producción.'], correctIndex: 1 },
      { question: 'Según la frecuencia de uso:', options: ['La frecuencia de uso no es importante para situar los elementos.', 'Lo que usamos cada muchos años lo guardamos en la zona de trabajo.', 'Lo que usamos todos los días lo ubicamos en el almacén exterior.', 'Lo que usamos todos los días lo ubicamos en la zona de trabajo.'], correctIndex: 3 },
      { question: 'El color naranja del etiquetado de innecesarios es:', options: ['Enviar a la "JAULA".', 'El color no tiene significado alguno.', 'Cuestionar si se envía a la "JAULA".', 'Enviar fuera de la zona de trabajo.'], correctIndex: 2 },
      { question: 'Marca la respuesta correcta:', options: ['La 2ª S facilita y mejorar el control visual.', 'La 2ª S facilita el mantenimiento autónomo de máquinas, evitando averías.', 'El objetivo particular de la 2ª S es aprovechar lugares despejados.', 'La A y B son correctas.'], correctIndex: 3 },
    ],
  },
  4: {
    questions: [
      { question: 'El objetivo de la 4ªS es:', options: ['Que todo este marcado igual.', 'Que lo que se este limpiando se vea.', 'Estandarizar todo que se vea.', 'Desarrollar condiciones de trabajo que eviten retroceso en las primeras 3 S´s'], correctIndex: 3 },
      { question: 'La 4ª S consiste en:', options: ['Respetar lo que los demás hacen.', 'Ser disciplinado y metódico.', 'Llevar a cabo una serie de prácticas para que todo este en su sitio.', 'Aplicar y mantener lo que se ha venido desarrollando hasta ahora estandarizando soluciones creativas para mantener el puesto de trabajo limpio y ordenado, preferiblemente mediante control visual.'], correctIndex: 3 },
      { question: 'Un criterio para realizar correctamente la 4ª S es:', options: ['Compartir la información sin que tenga que buscarse o pedirse.', 'Inventar lo mejor de lo mejor.', 'Ser imaginativo sin pensar en los demás.', 'Buscar la solución más cara del mercado.'], correctIndex: 0 },
      { question: 'Unas de las ventajas de hacer la 4ª S es:', options: ['Que todo esté del mismo color.', 'Que todo este marcado para las visitas.', 'Mejora el confort laboral.', 'Que las personas trabajen más rápido.'], correctIndex: 2 },
      { question: 'Uno de los pasos a seguir en la 4ª S es:', options: ['Realizar un listado de posibles estándares.', 'Estandarizar todo y hacer visibles los estándares utilizados.', 'Pintar el suelo según el estándar de señalización.', 'Los pasos a seguir son los mismo que en la 3ª S.'], correctIndex: 1 },
      { question: 'Para pasar a la fase 5, 5ªS:', options: ['Deberemos de obtener una nota de 100 en la auditoría.', 'Deberemos de obtener una nota de menos de 100 en la auditoría.', 'Deberemos de obtener una nota de 90 en la auditoría.', 'Deberemos de obtener una nota de 70 o más en la auditoría.'], correctIndex: 3 },
    ],
  },
  5: {
    questions: [
      { question: 'El objetivo de la 5ªS es:', options: ['Que todo este marcado igual.', 'Que lo que se este limpiando se vea.', 'Evaluar a las personas.', 'Mantener lo conseguido con las anteriores "S" haciendo las 5S como una forma cultural de trabajo.'], correctIndex: 3 },
      { question: 'La 5ª S consiste en:', options: ['Respetar lo que los demás hacen.', 'Ser disciplinado y metódico.', 'Llevar a cabo una serie de prácticas para que todo este en su sitio.', 'Tener el hábito y crear un ambiente de respeto a las normas y estándares establecidos.'], correctIndex: 3 },
      { question: 'Un criterio para realizar correctamente la 5ª S es:', options: ['Hacer visibles los resultados de las 5 S´s.', 'Inventar lo mejor de lo mejor.', 'Comunicar a nivel personal los resultados obtenidos.', 'Buscar la solución más cara del mercado.'], correctIndex: 0 },
      { question: 'Unas de las ventajas de hacer la 5ª S es:', options: ['Crear un ambiente de trabajo competitivo.', 'Que todo este marcado para las visitas.', 'Se eleva la motivación.', 'Que las personas trabajen más rápido.'], correctIndex: 2 },
      { question: 'Marca la afirmación correcta sobre la 5ªS:', options: ['La limpieza es inspección.', 'Sin disciplina y hábito cualquier beneficio logrado en los primeros cuatro desaparece.', 'Ten sólo lo necesario en la cantidad correcta.', 'El control visual es cualquier dispositivo de comunicación que nos indique el estado de algo con un solo vistazo.'], correctIndex: 1 },
    ],
  },
}

const INVENTORY_TEMPLATES: Record<number, { items: Array<{ name: string; location: string; category: string; quantity: number; action: string }> }> = {
  1: {
    items: [
      { name: 'Herramientas rotas', location: 'Taller principal', category: 'innecesario', quantity: 3, action: 'Eliminar' },
      { name: 'Material de oficina obsoleto', location: 'Oficina', category: 'innecesario', quantity: 10, action: 'Reciclar' },
      { name: 'Piezas de repuesto activas', location: 'Almacén A', category: 'util', quantity: 25, action: 'Mantener organizado' },
      { name: 'Documentación antigua', location: 'Archivo', category: 'dudoso', quantity: 50, action: 'Revisar y digitalizar' },
      { name: 'Equipos en desuso', location: 'Nave 2', category: 'innecesario', quantity: 2, action: 'Vender o donar' },
    ],
  },
  2: {
    items: [
      { name: 'Caja de herramientas', location: 'Puesto de trabajo 1', category: 'util', quantity: 1, action: 'Asignar ubicación fija' },
      { name: 'Carro de transporte', location: 'Pasillo B', category: 'util', quantity: 2, action: 'Zona marcada en suelo' },
      { name: 'Extintores', location: 'Varios puntos', category: 'util', quantity: 4, action: 'Señalizar ubicación' },
      { name: 'Palets vacíos', location: 'Zona de carga', category: 'dudoso', quantity: 8, action: 'Definir zona temporal' },
      { name: 'Contenedores de residuos', location: 'Salida trasera', category: 'util', quantity: 3, action: 'Codificar por color' },
    ],
  },
  3: {
    items: [
      { name: 'Kit de limpieza básico', location: 'Carro de limpieza', category: 'util', quantity: 2, action: 'Reponer semanalmente' },
      { name: 'Productos químicos caducados', location: 'Almacén productos', category: 'innecesario', quantity: 5, action: 'Retirar y gestionar residuo' },
      { name: 'Bayetas y trapos', location: 'Armario limpieza', category: 'util', quantity: 20, action: 'Renovar mensualmente' },
      { name: 'Aspiradora industrial', location: 'Sala máquinas', category: 'util', quantity: 1, action: 'Mantenimiento trimestral' },
      { name: 'Escobas desgastadas', location: 'Armario limpieza', category: 'innecesario', quantity: 4, action: 'Reemplazar' },
    ],
  },
  4: {
    items: [
      { name: 'Procedimientos de trabajo', location: 'Tablón oficina', category: 'util', quantity: 12, action: 'Actualizar y digitalizar' },
      { name: 'Fichas de control antiguas', location: 'Archivo', category: 'innecesario', quantity: 200, action: 'Digitalizar y eliminar papel' },
      { name: 'Señales de seguridad', location: 'Taller', category: 'util', quantity: 8, action: 'Verificar visibilidad' },
      { name: 'Manuales de equipo obsoletos', location: 'Oficina técnica', category: 'innecesario', quantity: 6, action: 'Actualizar versión' },
      { name: 'Checklists de limpieza', location: 'Carro limpieza', category: 'util', quantity: 5, action: 'Revisar contenido' },
    ],
  },
  5: {
    items: [
      { name: 'Registro de auditorías', location: 'Oficina calidad', category: 'util', quantity: 24, action: 'Mantener actualizado' },
      { name: 'Plan de formación 5S', location: 'RRHH', category: 'util', quantity: 1, action: 'Ejecutar según calendario' },
      { name: 'Actas de reuniones antiguas', location: 'Archivo', category: 'dudoso', quantity: 36, action: 'Evaluar si conservar' },
      { name: 'Panel de indicadores 5S', location: 'Entrada taller', category: 'util', quantity: 1, action: 'Actualizar semanalmente' },
      { name: 'Normativas sin difundir', location: 'Oficina', category: 'dudoso', quantity: 15, action: 'Comunicar al equipo' },
    ],
  },
}

const AUTOEVAL_CHECKLISTS: Record<number, { items: Array<{ description: string; maxScore: number }> }> = {
  1: {
    items: [
      { description: 'Se han identificado y etiquetado todos los ítems innecesarios', maxScore: 5 },
      { description: 'Se ha eliminado al menos el 80% de los ítems innecesarios', maxScore: 5 },
      { description: 'El área de trabajo está libre de objetos sin uso', maxScore: 5 },
      { description: 'Se ha definido el área de ítems dudosos con plazo de decisión', maxScore: 5 },
      { description: 'Los empleados conocen y aplican el criterio de clasificación', maxScore: 5 },
    ],
  },
  2: {
    items: [
      { description: 'Cada herramienta tiene su ubicación marcada y visible', maxScore: 5 },
      { description: 'Los objetos más usados están al alcance de la mano', maxScore: 5 },
      { description: 'Se usan códigos de color y etiquetas para identificar ubicaciones', maxScore: 5 },
      { description: 'Se puede encontrar cualquier herramienta en menos de 30 segundos', maxScore: 5 },
      { description: 'Todos los empleados conocen la ubicación de los elementos', maxScore: 5 },
    ],
  },
  3: {
    items: [
      { description: 'Todas las superficies están limpias y libres de polvo', maxScore: 5 },
      { description: 'Se ha identificado y eliminado la fuente de suciedad', maxScore: 5 },
      { description: 'Existe un plan de limpieza asignado por zonas', maxScore: 5 },
      { description: 'Los equipos están limpios y en buen estado visible', maxScore: 5 },
      { description: 'Se dispone de materiales de limpieza adecuados', maxScore: 5 },
    ],
  },
  4: {
    items: [
      { description: 'Los procedimientos están documentados y accesibles', maxScore: 5 },
      { description: 'Existen fotos del estado estándar en lugar visible', maxScore: 5 },
      { description: 'Los estándares son conocidos por todos los empleados', maxScore: 5 },
      { description: 'Se usan checklists para verificar el cumplimiento', maxScore: 5 },
      { description: 'Las desviaciones se corrigen de forma sistemática', maxScore: 5 },
    ],
  },
  5: {
    items: [
      { description: 'Se realizan auditorías periódicas (al menos mensuales)', maxScore: 5 },
      { description: 'Los resultados de auditoría se comunican a todo el equipo', maxScore: 5 },
      { description: 'Se reconocen y celebran los logros del equipo', maxScore: 5 },
      { description: 'Los nuevos empleados reciben formación 5S', maxScore: 5 },
      { description: 'Existe un sistema de sugerencias de mejora activo', maxScore: 5 },
    ],
  },
}

const AUDIT_TEMPLATES: Record<number, { criteria: Array<{ criterion: string; weight: number }> }> = {
  1: {
    criteria: [
      { criterion: 'Ausencia de ítems innecesarios en el área de trabajo', weight: 25 },
      { criterion: 'Uso efectivo de la técnica de tarjetas rojas', weight: 20 },
      { criterion: 'Definición clara de ítems necesarios vs innecesarios', weight: 20 },
      { criterion: 'Participación del personal en la clasificación', weight: 15 },
      { criterion: 'Documentación de decisiones tomadas', weight: 20 },
    ],
  },
  2: {
    criteria: [
      { criterion: 'Ubicaciones marcadas y visibles para todos los elementos', weight: 25 },
      { criterion: 'Tiempo de localización de herramientas < 30 segundos', weight: 20 },
      { criterion: 'Uso de códigos de color y señalización visual', weight: 20 },
      { criterion: 'Accesibilidad de objetos según frecuencia de uso', weight: 15 },
      { criterion: 'Conocimiento del personal sobre ubicaciones', weight: 20 },
    ],
  },
  3: {
    criteria: [
      { criterion: 'Nivel de limpieza general del área', weight: 25 },
      { criterion: 'Identificación y eliminación de fuentes de suciedad', weight: 20 },
      { criterion: 'Cumplimiento del plan de limpieza', weight: 20 },
      { criterion: 'Disponibilidad de materiales de limpieza', weight: 15 },
      { criterion: 'Integración limpieza-inspección', weight: 20 },
    ],
  },
  4: {
    criteria: [
      { criterion: 'Documentación actualizada de procedimientos', weight: 25 },
      { criterion: 'Gestión visual efectiva (fotos, checklists, señales)', weight: 20 },
      { criterion: 'Conocimiento del personal sobre estándares', weight: 20 },
      { criterion: 'Sistema de corrección de desviaciones', weight: 15 },
      { criterion: 'Revisión periódica de estándares', weight: 20 },
    ],
  },
  5: {
    criteria: [
      { criterion: 'Programa de auditorías implementado', weight: 25 },
      { criterion: 'Comunicación de resultados al equipo', weight: 20 },
      { criterion: 'Sistema de reconocimiento de logros', weight: 20 },
      { criterion: 'Formación continua de nuevos empleados', weight: 15 },
      { criterion: 'Cultura de mejora continua visible', weight: 20 },
    ],
  },
}

export async function POST() {
  try {
    // Create admin user if not exists
    const existingAdmin = await db.user.findUnique({ where: { email: 'admin@5s.com' } })
    if (!existingAdmin) {
      await db.user.create({
        data: {
          email: 'admin@5s.com',
          name: 'Administrador',
          password: hashPassword('admin123'),
          role: 'admin',
          active: true,
        },
      })
    }

    // Create demo project if no projects exist
    let projects = await db.project.findMany()
    let demoProjectId: string
    if (projects.length === 0) {
      const demoProject = await db.project.create({
        data: {
          name: 'Proyecto Demo 5S',
          description: 'Proyecto de demostración de la metodología 5S',
          company: 'Empresa Demo',
          active: true,
        },
      })
      demoProjectId = demoProject.id

      // Create default zones
      const zones = [
        { name: 'Taller Principal', description: 'Zona de producción principal', color: '#8B5CF6' },
        { name: 'Almacén A', description: 'Almacén de materiales', color: '#3B82F6' },
        { name: 'Oficinas', description: 'Área administrativa', color: '#EAB308' },
        { name: 'Nave 2', description: 'Zona de montaje secundaria', color: '#F43F5E' },
      ]
      for (const zone of zones) {
        await db.zone.create({
          data: { ...zone, projectId: demoProjectId },
        })
      }

      // Link admin to project
      const admin = await db.user.findUnique({ where: { email: 'admin@5s.com' } })
      if (admin) {
        await db.projectMember.create({
          data: { userId: admin.id, projectId: demoProjectId, role: 'admin' },
        })
      }
    } else {
      demoProjectId = projects[0].id
    }

    // Create role permissions
    const permissions = [
      { role: 'admin', permission: 'view_board', allowed: true },
      { role: 'admin', permission: 'complete_steps', allowed: true },
      { role: 'admin', permission: 'manage_users', allowed: true },
      { role: 'admin', permission: 'manage_projects', allowed: true },
      { role: 'admin', permission: 'skip_steps', allowed: true },
      { role: 'admin', permission: 'view_reports', allowed: true },
      { role: 'admin', permission: 'manage_zones', allowed: true },
      { role: 'responsable', permission: 'view_board', allowed: true },
      { role: 'responsable', permission: 'complete_steps', allowed: true },
      { role: 'responsable', permission: 'manage_users', allowed: false },
      { role: 'responsable', permission: 'view_reports', allowed: true },
      { role: 'empleado', permission: 'view_board', allowed: true },
      { role: 'empleado', permission: 'complete_steps', allowed: true },
      { role: 'empleado', permission: 'manage_users', allowed: false },
      { role: 'empleado', permission: 'view_reports', allowed: false },
      { role: 'auditor', permission: 'view_board', allowed: true },
      { role: 'auditor', permission: 'complete_steps', allowed: false },
      { role: 'auditor', permission: 'conduct_audit', allowed: true },
      { role: 'auditor', permission: 'view_reports', allowed: true },
    ]
    for (const perm of permissions) {
      await db.rolePermissionConfig.upsert({
        where: { role_permission: { role: perm.role, permission: perm.permission } },
        create: perm,
        update: { allowed: perm.allowed },
      })
    }

    // Clear existing templates and recreate
    try {
      await db.template.deleteMany({})
    } catch {
      // Ignore delete errors
    }

    for (let s = 1; s <= 5; s++) {
      // Training templates
      await db.template.create({
        data: {
          type: 'formacion',
          sStep: s,
          title: `Formación ${S_NAMES[s - 1]} - 5S`,
          description: `Contenido formativo sobre la ${s}ª S: ${S_NAMES[s - 1]} (${S_JAPANESE[s - 1]})`,
          content: JSON.stringify(TRAINING_CONTENT[s]),
        },
      })

      // Exam templates
      await db.template.create({
        data: {
          type: 'examen',
          sStep: s,
          title: `Examen ${S_NAMES[s - 1]} - 5S`,
          description: `Examen de evaluación sobre ${S_NAMES[s - 1]}`,
          content: JSON.stringify(EXAM_QUESTIONS[s]),
        },
      })

      // Inventory templates
      await db.template.create({
        data: {
          type: 'inventario',
          sStep: s,
          title: `Plantilla Inventario ${S_NAMES[s - 1]}`,
          description: `Plantilla de inventario para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(INVENTORY_TEMPLATES[s]),
        },
      })

      // Self-evaluation templates
      await db.template.create({
        data: {
          type: 'autoevaluacion',
          sStep: s,
          title: `Autoevaluación ${S_NAMES[s - 1]}`,
          description: `Checklist de autoevaluación para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(AUTOEVAL_CHECKLISTS[s]),
        },
      })

      // Audit templates
      await db.template.create({
        data: {
          type: 'auditoria',
          sStep: s,
          title: `Auditoría ${S_NAMES[s - 1]}`,
          description: `Criterios de auditoría para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(AUDIT_TEMPLATES[s]),
        },
      })
    }

    // Create 25 progress records (5 S × 5 mini-steps) for each project
    projects = await db.project.findMany()
    const projectIds = projects.length > 0 ? projects.map(p => p.id) : [demoProjectId]

    for (const projectId of projectIds) {
      for (let s = 1; s <= 5; s++) {
        for (let m = 1; m <= 5; m++) {
          await db.progress.upsert({
            where: { sStep_miniStep_projectId: { sStep: s, miniStep: m, projectId } },
            create: { sStep: s, miniStep: m, completed: false, score: null, projectId },
            update: {},
          })
        }
      }
    }

    const templates = await db.template.findMany()
    const progressCount = await db.progress.count()
    const userCount = await db.user.count()
    const projectCount = await db.project.count()
    return NextResponse.json({
      success: true,
      data: {
        message: 'Base de datos inicializada correctamente',
        templatesCreated: templates.length,
        progressRecords: progressCount,
        users: userCount,
        projects: projectCount,
        adminCredentials: 'admin@5s.com / admin123',
      },
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ success: false, error: 'Error seeding database' }, { status: 500 })
  }
}
