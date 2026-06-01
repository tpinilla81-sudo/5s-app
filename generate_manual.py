#!/usr/bin/env python3
"""
Generate the 5S Audit Management System User Manual (PDF)
Comprehensive guide for users with no prior knowledge.
"""
import sys, os, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, CondPageBreak,
    KeepTogether, Image, Flowable, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ─── Color Palette ───
ACCENT       = colors.HexColor('#4920c5')
TEXT_PRIMARY  = colors.HexColor('#1e1f21')
TEXT_MUTED    = colors.HexColor('#71777d')
BG_SURFACE   = colors.HexColor('#dfe3e7')
BG_PAGE      = colors.HexColor('#f2f3f4')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ─── Page setup ───
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─── Font Registration ───
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

# ─── Styles ───
FONT = 'Carlito'
FONT_H = 'Carlito'

style_h1 = ParagraphStyle(
    name='H1', fontName=FONT_H, fontSize=22, leading=28,
    textColor=ACCENT, spaceBefore=24, spaceAfter=12, alignment=TA_LEFT
)
style_h2 = ParagraphStyle(
    name='H2', fontName=FONT_H, fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=18, spaceAfter=8, alignment=TA_LEFT
)
style_h3 = ParagraphStyle(
    name='H3', fontName=FONT_H, fontSize=13, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6, alignment=TA_LEFT
)
style_body = ParagraphStyle(
    name='Body', fontName=FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_JUSTIFY
)
style_body_left = ParagraphStyle(
    name='BodyLeft', fontName=FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_LEFT
)
style_bullet = ParagraphStyle(
    name='Bullet', fontName=FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=2,
    leftIndent=24, alignment=TA_LEFT
)
style_bullet2 = ParagraphStyle(
    name='Bullet2', fontName=FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=1, spaceAfter=1,
    leftIndent=48, alignment=TA_LEFT
)
style_tip = ParagraphStyle(
    name='Tip', fontName=FONT, fontSize=10, leading=15,
    textColor=colors.HexColor('#2d5016'), spaceBefore=6, spaceAfter=6,
    leftIndent=20, rightIndent=20, backColor=colors.HexColor('#e8f5e1'),
    borderColor=colors.HexColor('#4caf50'), borderWidth=1, borderPadding=8,
    alignment=TA_LEFT
)
style_warning = ParagraphStyle(
    name='Warning', fontName=FONT, fontSize=10, leading=15,
    textColor=colors.HexColor('#8b4513'), spaceBefore=6, spaceAfter=6,
    leftIndent=20, rightIndent=20, backColor=colors.HexColor('#fff3e0'),
    borderColor=colors.HexColor('#ff9800'), borderWidth=1, borderPadding=8,
    alignment=TA_LEFT
)
style_table_header = ParagraphStyle(
    name='TH', fontName=FONT_H, fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER
)
style_table_cell = ParagraphStyle(
    name='TC', fontName=FONT, fontSize=9.5, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
)
style_table_cell_c = ParagraphStyle(
    name='TCC', fontName=FONT, fontSize=9.5, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
)
style_caption = ParagraphStyle(
    name='Caption', fontName=FONT, fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12
)
style_toc1 = ParagraphStyle(
    name='TOC1', fontName=FONT, fontSize=13, leading=20,
    leftIndent=20, textColor=TEXT_PRIMARY
)
style_toc2 = ParagraphStyle(
    name='TOC2', fontName=FONT, fontSize=11, leading=18,
    leftIndent=40, textColor=TEXT_MUTED
)

# ─── Helpers ───
def P(text, style=style_body):
    return Paragraph(text, style)

def heading(text, level=1):
    styles = {1: style_h1, 2: style_h2, 3: style_h3}
    return Paragraph(f'<b>{text}</b>', styles.get(level, style_h2))

def bullet(text, level=1):
    s = style_bullet if level == 1 else style_bullet2
    prefix = '-' if level == 1 else '~'
    return Paragraph(f'{prefix} {text}', s)

def tip_box(text):
    return Paragraph(f'<b>Consejo:</b> {text}', style_tip)

def warning_box(text):
    return Paragraph(f'<b>Atencion:</b> {text}', style_warning)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with headers and rows."""
    available = CONTENT_W
    if col_ratios:
        col_widths = [r * available for r in col_ratios]
    else:
        n = len(headers)
        col_widths = [available / n] * n

    # Ensure all cells are Paragraphs
    data = []
    header_row = [Paragraph(f'<b>{h}</b>', style_table_header) for h in headers]
    data.append(header_row)
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) if not isinstance(c, Paragraph) else c for c in row])

    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(f'<a name="{key}"/>{text}', {0: style_h1, 1: style_h2, 2: style_h3}[level])
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def section(text):
    return [CondPageBreak(H1_ORPHAN_THRESHOLD), add_heading(text, level=0)]

def subsection(text):
    return [add_heading(text, level=1)]

def subsubsection(text):
    return [add_heading(text, level=2)]


# ─── Build Document ───
OUTPUT = '/home/z/my-project/download/Manual_Usuario_5S.pdf'

doc = TocDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    title='Manual de Usuario - Sistema de Auditoria 5S',
    author='Z.ai',
    creator='Z.ai',
    subject='Guia completa para la implementacion y uso del Sistema de Auditoria 5S'
)

story = []

# ═══════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════
story.append(Paragraph('<b>Contenido</b>', style_h1))
toc = TableOfContents()
toc.levelStyles = [style_toc1, style_toc2]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# 1. INTRODUCCION
# ═══════════════════════════════════════════════════════════════
story.extend(section('1. Introduccion'))
story.append(P(
    'Bienvenido al Sistema de Auditoria 5S, una aplicacion web disenada para facilitar la implementacion '
    'y el seguimiento de la metodologia 5S en cualquier tipo de organizacion. Este manual ha sido escrito '
    'para personas que nunca han utilizado la aplicacion y que quizas tampoco conocen la metodologia 5S. '
    'Si usted es un empleado que va a participar en su primer taller 5S, un gerente que necesita supervisar '
    'la implantacion en su empresa, o un administrador encargado de configurar toda la plataforma, aqui '
    'encontrara instrucciones paso a paso para cada tarea que necesite realizar.'
))
story.append(P(
    'La aplicacion permite gestionar multiples empresas, proyectos y zonas de trabajo, asignar responsabilidades '
    'a diferentes perfiles de usuario, documentar el progreso con fotografias e inventarios, realizar autoevaluaciones '
    'y auditorias externas, y llevar un control exhaustivo de las acciones correctivas derivadas de las desviaciones '
    'detectadas. Todo desde una interfaz web accesible desde cualquier navegador, sin necesidad de instalar ningun '
    'programa adicional en su equipo.'
))
story.append(P(
    'A lo largo de este manual encontrara consejos practicos identificados con un recuadro verde y advertencias '
    'importantes senaladas con un recuadro naranja. Le recomendamos leerlas con atencion, ya que contienen '
    'informacion clave para evitar errores comunes y sacar el maximo provecho de la herramienta.'
))

story.extend(subsection('1.1 Que es la metodologia 5S'))
story.append(P(
    'La metodologia 5S es un sistema de organizacion del lugar de trabajo originario de Japon que consta de '
    'cinco principios fundamentales. Cada principio recibe el nombre de una palabra japonesa que empieza por S, '
    'y todos ellos persiguen un objetivo comun: crear un entorno de trabajo limpio, ordenado y seguro que mejore '
    'la productividad, reduzca los tiempos de busqueda y minimice los errores. La aplicacion que tiene entre manos '
    'le guia paso a paso en la implementacion de cada una de estas cinco etapas.'
))

story.append(make_table(
    ['S', 'Nombre', 'Significado', 'Descripcion'],
    [
        ['1S', 'Seiri', 'Clasificar', 'Separar los elementos necesarios de los innecesarios y eliminar estos ultimos. Se realiza un inventario de innecesarios para tomar decisiones sobre su destino.'],
        ['2S', 'Seiton', 'Ordenar', 'Organizar los elementos necesarios de manera que sean faciles de encontrar, usar y devolver. Cada objeto debe tener una ubicacion asignada y senalizada.'],
        ['3S', 'Seiso', 'Limpiar', 'Limpiar el lugar de trabajo identificando y eliminando las fuentes de suciedad. La limpieza es inspeccion: al limpiar se detectan anomalias.'],
        ['4S', 'Seiketsu', 'Estandarizar', 'Crear estandares y normas que mantengan los logros alcanzados con las tres S anteriores. Lo que no esta definido tiende a deteriorarse.'],
        ['5S', 'Shitsuke', 'Mantener', 'Crear el habito de respetar los estandares mediante disciplina y auditorias periodicas. Es la S mas dificil porque requiere constancia.'],
    ],
    col_ratios=[0.07, 0.12, 0.13, 0.68]
))
story.append(P('Tabla 1. Las cinco S de la metodologia', style_caption))

story.extend(subsection('1.2 Flujo de trabajo por cada S'))
story.append(P(
    'Cada una de las cinco S sigue un flujo de trabajo estructurado con cinco mini-pasos que deben completarse '
    'en orden secuencial. Este flujo garantiza que los usuarios sigan una metodologia rigurosa y documentada en '
    'cada etapa del proceso. No es posible saltarse pasos ni avanzar sin haber completado el anterior, lo que '
    'asegura que nadie se deje por alto ninguna actividad importante.'
))

story.append(make_table(
    ['Paso', 'Nombre', 'Descripcion'],
    [
        ['1', 'Formacion + Examen', 'El empleado completa la formacion especifica de la S y aprueba un examen con una puntuacion minima del 80%. Es un paso individual: cada empleado debe aprobarlo por su cuenta.'],
        ['2', 'Fotografias', 'Se toman fotografias del estado actual de la zona antes de actuar, para documentar la situacion de partida. Minimo 3 fotos requeridas. Es un paso colectivo de la zona.'],
        ['3', 'Inventario', 'Se realiza el inventario correspondiente a cada S: innecesarios (1S), necesarios (2S), puntos de suciedad (3S), estandares (4S), o plan de accion (5S). Es un paso colectivo de la zona.'],
        ['4', 'Autoevaluacion', 'Verificacion interna mediante el checklist de auditoria. La realizan los empleados de la zona como ejercicio de reflexion sobre el cumplimiento de los criterios 5S.'],
        ['5', 'Auditoria Externa', 'Validacion por un auditor externo que verifica el cumplimiento de los criterios 5S mediante el mismo checklist estandarizado. Solo usuarios con rol de auditor pueden realizarla.'],
    ],
    col_ratios=[0.07, 0.18, 0.75]
))
story.append(P('Tabla 2. Los cinco mini-pasos de cada S', style_caption))

story.extend(subsection('1.3 Progresion entre pasos: zonas con multiples empleados'))
story.append(P(
    'En muchas organizaciones, una misma zona de trabajo puede tener varios empleados asignados. Esto plantea '
    'una cuestion fundamental: como se gestiona la progresion de la zona cuando varias personas deben completar '
    'los mismos pasos? La respuesta depende del tipo de mini-paso, ya que algunos son individuales (cada empleado '
    'debe completarlos por si mismo) y otros son colectivos (se realizan una sola vez por zona).'
))
story.append(P('<b>Pasos individuales (requieren que TODOS los empleados los completen):</b>'))
story.append(bullet('Formacion + Examen (paso 1): Cada empleado debe completar la formacion y aprobar el examen individualmente. La zona no puede avanzar al paso 2 hasta que todos los empleados asignados hayan aprobado.'))
story.append(bullet('Autoevaluacion (paso 4): Cada empleado debe completar su propia autoevaluacion antes de que se pueda solicitar la auditoria externa.'))
story.append(P('<b>Pasos colectivos (se realizan una vez por zona):</b>'))
story.append(bullet('Fotografias (paso 2): Se toman como equipo para documentar el estado de la zona. Cualquier empleado puede subir las fotografias.'))
story.append(bullet('Inventario (paso 3): Se realiza un inventario compartido de la zona. Todos los empleados pueden anadir items.'))
story.append(bullet('Auditoria Externa (paso 5): Solo puede realizarla un usuario con rol de auditor. La auditoria evalua la zona completa, no a cada empleado.'))
story.append(Spacer(1, 6))
story.append(warning_box(
    'Regla clave: Para que una zona avance de una S a la siguiente (por ejemplo, de 1S a 2S), todos los empleados de la zona '
    'deben haber completado los pasos individuales (formacion y autoevaluacion), y los pasos colectivos (fotos, inventario y '
    'auditoria) deben estar completados y aprobados. Si hay dos empleados en una zona, AMBOS deben pasar la formacion antes '
    'de poder acceder al paso 2.'
))

# ═══════════════════════════════════════════════════════════════
# 2. ESTRUCTURA ORGANIZATIVA
# ═══════════════════════════════════════════════════════════════
story.extend(section('2. Estructura Organizativa'))
story.append(P(
    'La aplicacion organiza la informacion siguiendo una jerarquia de cuatro niveles: Empresa, Proyecto, Zona '
    'y Empleado. Esta estructura refleja la realidad de la mayoria de las organizaciones, donde una empresa puede '
    'tener multiples proyectos de implementacion 5S, cada proyecto puede abarcar varias zonas de trabajo, y cada '
    'zona puede tener uno o varios empleados asignados. Comprender esta jerarquia es esencial para configurar '
    'correctamente la aplicacion y asignar los roles apropiados a cada usuario.'
))

story.extend(subsection('2.1 Jerarquia: Empresa, Proyecto, Zona, Empleado'))
story.append(make_table(
    ['Nivel', 'Descripcion'],
    [
        ['Empresa', 'La organizacion o compania que implementa la metodologia 5S. Una empresa puede tener multiples proyectos 5S activos simultaneamente. Es el nivel mas alto de la jerarquia.'],
        ['Proyecto', 'Un proyecto de implementacion 5S dentro de una empresa. Cada proyecto tiene sus propias zonas, progreso y equipo asignado. Puede representar una planta, un departamento o una linea de produccion.'],
        ['Zona', 'Un area de trabajo especifica dentro de un proyecto. Cada zona tiene su propio progreso 5S independiente. Puede ser una oficina, una linea de montaje, un almacen, etc.'],
        ['Empleado', 'Una persona asignada a una o varias zonas dentro de un proyecto. Los empleados ejecutan los talleres 5S y documentan su progreso.'],
    ],
    col_ratios=[0.15, 0.85]
))
story.append(P('Tabla 3. Niveles de la jerarquia organizativa', style_caption))

story.extend(subsection('2.2 Roles y permisos'))
story.append(P(
    'La aplicacion define cinco roles de usuario, cada uno con un alcance y unas funciones especificas. El rol '
    'determina que pantallas puede ver el usuario y que acciones puede realizar. Es importante asignar el rol '
    'correcto a cada persona para garantizar que todos tengan acceso a las herramientas que necesitan sin '
    'comprometer la seguridad ni la integridad de los datos. A continuacion se describe cada rol en detalle.'
))

story.append(make_table(
    ['Rol', 'Alcance', 'Funciones principales'],
    [
        ['Administrador', 'Empresa completa', 'Dueno de la aplicacion. PRIMERO crea la estructura (empresas, proyectos y zonas), LUEGO crea usuarios y les asigna roles. Acceso total a todas las funciones, incluida la configuracion de permisos y plantillas.'],
        ['Gerente', 'Empresa completa', 'Supervisa todos los proyectos de su empresa. Ve el progreso global, inventarios y planes de accion de todos los proyectos. Puede editar inventarios de 2S y 3S. No ejecuta pasos 5S directamente.'],
        ['Responsable', 'Sus proyectos', 'Coordina uno o varios proyectos. Gestiona zonas, asigna empleados y hace seguimiento del progreso. Puede realizar pasos 1-4 de cada S pero NO puede realizar auditorias externas (paso 5).'],
        ['Auditor', 'Zonas asignadas', 'Realiza auditorias externas en las zonas que le corresponden. Evalua el cumplimiento de los criterios 5S con el checklist estandarizado. No ejecuta pasos 1-4 de las S.'],
        ['Empleado', 'Sus zonas', 'Ejecuta los talleres 5S: completa formacion, sube fotos, registra inventarios, realiza autoevaluaciones internas (paso 4) y ejecuta acciones de mejora. Es el rol por defecto al registrarse.'],
    ],
    col_ratios=[0.14, 0.14, 0.72]
))
story.append(P('Tabla 4. Roles y permisos de la aplicacion', style_caption))

story.append(tip_box(
    'El auto-registro siempre crea cuentas con rol de Empleado. Si necesita un rol diferente (Gerente, Responsable, Auditor), '
    'debe solicitar al Administrador que le cree la cuenta correspondiente o que actualice su rol desde el panel de administracion.'
))

story.extend(subsection('2.3 Asignacion de roles a la jerarquia'))
story.append(P(
    'La asignacion de roles sigue la estructura organizativa de manera natural. Cada nivel de la jerarquia tiene '
    'uno o varios responsables que supervisan el nivel inferior. Un mismo usuario no necesita tener un unico rol '
    'fijo en toda la aplicacion: puede ser Responsable en un proyecto y Empleado en otro, o Gerente de una empresa '
    'y Auditor en otra. Esta flexibilidad permite adaptar la herramienta a la realidad de cada organizacion, donde '
    'una persona puede desempenar distintas funciones segun el contexto. Sin embargo, es recomendable mantener los '
    'roles lo mas simples posible para evitar confusiones y asegurar que cada persona tenga claro que se espera de ella.'
))

story.extend(subsection('2.4 Zonas con multiples empleados'))
story.append(P(
    'Una de las caracteristicas mas importantes de la aplicacion es su capacidad para gestionar zonas donde trabajan '
    'varios empleados simultaneamente. En la practica, la mayoria de las zonas de trabajo compartidas tendran entre '
    'dos y diez empleados, y todos ellos deben participar activamente en la implementacion de la metodologia 5S. '
    'La aplicacion gestiona esta complejidad diferenciando entre pasos individuales y pasos colectivos, tal como se '
    'explico en la seccion 1.3. Cuando un empleado accede al tablero 5S de su zona, vera su propio progreso en los '
    'pasos individuales y el progreso colectivo de la zona en los pasos compartidos.'
))

# ═══════════════════════════════════════════════════════════════
# 3. PRIMEROS PASOS
# ═══════════════════════════════════════════════════════════════
story.extend(section('3. Primeros Pasos'))
story.append(P(
    'En esta seccion aprendera como acceder a la aplicacion por primera vez y como realizar la configuracion '
    'inicial necesaria para empezar a trabajar. Si usted es el Administrador, siga todos los pasos detallados '
    'a continuacion. Si es un empleado o auditor, puede ir directamente a la seccion de Registro e inicio de sesion, '
    'ya que la configuracion inicial es responsabilidad exclusiva del Administrador.'
))

story.extend(subsection('3.1 Registro e inicio de sesion'))
story.append(P(
    'Para comenzar a utilizar la aplicacion, abra su navegador web (Chrome, Firefox, Edge o Safari) y acceda a la '
    'direccion que le haya proporcionado su organizacion (por ejemplo, http://localhost:3000 si esta en la red local). '
    'La primera pantalla que vera es la pagina de inicio de sesion. Desde aqui puede iniciar sesion si ya tiene una '
    'cuenta, o registrarse si es la primera vez que accede al sistema.'
))
story.append(P('<b>Para registrarse como nuevo usuario:</b>'))
story.append(bullet('Pulse el enlace "Registrarse" en la pagina de inicio de sesion.'))
story.append(bullet('Rellene los campos obligatorios: nombre completo, correo electronico y contrasena.'))
story.append(bullet('Pulse el boton "Crear cuenta". Su cuenta se creara automaticamente con el rol de Empleado.'))
story.append(bullet('Tras el registro, accedera directamente a la aplicacion. Si aun no ha sido asignado a ningun proyecto, vera una pantalla informativa indicando que debe esperar a que un administrador le asigne a un proyecto y una zona.'))
story.append(Spacer(1, 6))
story.append(P('<b>Para iniciar sesion si ya tiene cuenta:</b>'))
story.append(bullet('Introduzca su correo electronico y contrasena en los campos correspondientes.'))
story.append(bullet('Pulse el boton "Iniciar sesion".'))
story.append(bullet('Si sus credenciales son correctas, accedera al tablero principal de la aplicacion.'))
story.append(Spacer(1, 6))
story.append(warning_box(
    'Solo el Administrador puede crear usuarios con roles especificos (Gerente, Responsable, Auditor). Si necesita '
    'un rol diferente al de Empleado, solicite al Administrador que le cree la cuenta o que actualice su rol desde '
    'el panel de administracion. No intente registrarse multiples veces con diferentes correos.'
))

story.extend(subsection('3.2 Configuracion inicial por el Administrador'))
story.append(P(
    'El Administrador es el dueno de la aplicacion y es responsable de la configuracion inicial de la plataforma. '
    'Es fundamental entender el orden de la configuracion: PRIMERO se crea la estructura organizativa (empresas, '
    'proyectos y zonas), y LUEGO se crean los usuarios y se les asignan roles para los proyectos ya creados. Sin '
    'estructura previa no es posible asignar usuarios. Este flujo garantiza que cada usuario tenga un contexto de '
    'trabajo asignado desde el primer momento en que accede a la aplicacion.'
))

story.extend(subsubsection('Fase 1: Crear la estructura organizativa'))
story.append(P(
    'Antes de crear ningun usuario, el Administrador debe definir la estructura organizativa completa. Sin empresa, '
    'proyecto y zona, no es posible asignar usuarios ni roles. Siga estos pasos en el orden indicado:'
))
story.append(P('<b>Paso 1 - Crear la empresa:</b> Desde el panel de administracion (pestana Admin, sub-pestana Empresas), pulse el boton "Nueva Empresa". Introduzca el nombre y una descripcion de la organizacion. Por ejemplo, nombre: "Industrias Garcia S.L.", descripcion: "Fabrica de componentes metalicos". Pulse "Guardar" para crear la empresa.'))
story.append(P('<b>Paso 2 - Crear proyectos:</b> Dentro de la empresa creada, vaya a la sub-pestana Proyectos y pulse "Nuevo Proyecto". Introduzca el nombre del proyecto (por ejemplo, "Planta de mecanizado"), una descripcion y seleccione la empresa a la que pertenece. Pulse "Guardar" para crear el proyecto.'))
story.append(P('<b>Paso 3 - Crear zonas:</b> Dentro del proyecto creado, pulse "Anadir Zona" para definir las areas de trabajo. Para cada zona, introduzca un nombre (por ejemplo, "Linea de corte", "Almacen de materias primas"), una descripcion opcional y seleccione un color identificativo. El color ayuda a distinguir visualmente las zonas en el tablero.'))
story.append(Spacer(1, 6))
story.append(tip_box(
    'Planifique la estructura organizativa antes de empezar a crearla en la aplicacion. Haga un esquema en papel '
    'o en un documento con las empresas, proyectos y zonas que necesita. Esto le ahorrara tiempo y evitara tener '
    'que reorganizar la estructura despues de haber creado usuarios y asignado permisos.'
))

story.extend(subsubsection('Fase 2: Crear usuarios y asignar roles'))
story.append(P(
    'Una vez creada la estructura organizativa, el Administrador puede proceder a crear los usuarios y asignarles '
    'roles dentro de los proyectos. Este proceso se realiza desde la sub-pestana Proyectos del panel de administracion.'
))
story.append(P('<b>Paso 4 - Anadir miembros al proyecto:</b> Seleccione el proyecto al que desea anadir miembros. Pulse "Anadir Miembro". Puede crear un nuevo usuario introduciendo su nombre, correo electronico y seleccionando su rol (Gerente, Responsable, Auditor o Empleado), o bien anadir un usuario ya existente en el sistema.'))
story.append(P('<b>Paso 5 - Asignar zonas a los miembros:</b> Tras anadir un miembro al proyecto, debe asignarle las zonas en las que trabajara. Seleccione el miembro y marque las casillas de las zonas que le corresponden. Un empleado puede estar asignado a varias zonas del mismo proyecto, pero cada zona tiene su propio progreso 5S independiente.'))
story.append(P('<b>Paso 6 - Asignar responsable a cada zona:</b> Para cada zona, puede designar un responsable que se encargara de coordinar las actividades 5S en esa area. El responsable tiene permisos para gestionar la zona y hacer seguimiento del progreso de los empleados asignados.'))
story.append(Spacer(1, 6))
story.append(warning_box(
    'Es muy importante seguir este orden: primero crear empresas, luego proyectos, luego zonas, y finalmente '
    'usuarios y asignaciones. Si intenta asignar usuarios a proyectos que aun no existen o a zonas que no ha creado, '
    'el sistema no se lo permitira.'
))

# ═══════════════════════════════════════════════════════════════
# 4. CONFIGURACION DEL TABLERO
# ═══════════════════════════════════════════════════════════════
story.extend(section('4. Configuracion del Tablero 5S'))
story.append(P(
    'El tablero 5S es el corazon de la aplicacion. Antes de que los empleados puedan empezar a trabajar en los '
    'talleres 5S, el Administrador debe configurar las plantillas y estandares que se asignaran a cada una de las '
    '25 posiciones del tablero (5 S x 5 mini-pasos). Esta configuracion se realiza desde la pestana Admin, en la '
    'sub-pestana "Tablero 5S". Sin esta configuracion previa, los empleados veran las posiciones del tablero vacias '
    'y no podran completar los pasos correspondientes.'
))

story.extend(subsection('4.1 Que es la configuracion del tablero'))
story.append(P(
    'La configuracion del tablero consiste en asignar a cada celda de la cuadricula 5S (5 S por 5 mini-pasos = 25 posiciones) '
    'una plantilla y/o un estandar que defina el contenido y los criterios de evaluacion de esa posicion. Las plantillas '
    'son documentos reutilizables que contienen el material formativo, las preguntas del examen, los criterios del '
    'checklist de auditoria, etc. Los estandares son normas documentadas que sirven de referencia para evaluar el '
    'cumplimiento de cada S. Piense en la configuracion del tablero como el "programa de estudios" de la metodologia 5S: '
    'sin ella, los empleados no sabrian que tienen que hacer en cada paso.'
))

story.extend(subsection('4.2 Como configurar las plantillas'))
story.append(P(
    'Las plantillas son el recurso fundamental que da contenido a cada posicion del tablero. Existen diferentes tipos '
    'de plantillas para cada mini-paso. A continuacion se explica como crearlas y asignarlas.'
))
story.append(P('<b>Paso 1 - Acceder a la gestion de plantillas:</b> Desde la pestana Admin, seleccione la sub-pestana "Plantillas". Aqui vera la lista de todas las plantillas existentes y podra crear nuevas.'))
story.append(P('<b>Paso 2 - Crear una nueva plantilla:</b> Pulse el boton "Nueva Plantilla". Seleccione el tipo de plantilla que desea crear (formacion, examen, inventario, auditoria, etc.), la S a la que corresponde, el mini-paso, el titulo y el contenido. El contenido varia segun el tipo de plantilla: para formacion, sera material didactico; para examenes, seran preguntas de opcion multiple; para auditorias, seran items del checklist.'))
story.append(P('<b>Paso 3 - Asignar plantillas al tablero:</b> Vaya a la sub-pestana "Tablero 5S" dentro de Admin. Vera una cuadricula de 5 filas (las 5 S) por 5 columnas (los 5 mini-pasos). Haga clic en la celda que desea configurar y seleccione la plantilla correspondiente en el desplegable. Tambien puede asignar un estandar si lo desea. Cada celda puede tener una plantilla y un estandar asignados simultaneamente.'))
story.append(P('<b>Paso 4 - Verificar la configuracion:</b> Compruebe que las 25 posiciones del tablero tienen asignada al menos una plantilla. El sistema muestra un contador con el numero de posiciones asignadas. Un tablero completamente configurado tendra "25 de 25 posiciones asignadas".'))
story.append(Spacer(1, 6))
story.append(tip_box(
    'Puede crear plantillas a nivel global (sin asignar a un proyecto especifico) que serviran como configuracion '
    'por defecto para todos los proyectos, y luego sobrescribir las que necesite a nivel de proyecto si alguna '
    'empresa requiere una configuracion diferente.'
))

story.extend(subsection('4.3 Tableros por sector y empresa'))
story.append(P(
    'Una de las funcionalidades mas avanzadas de la aplicacion es la posibilidad de crear diferentes tableros para '
    'diferentes sectores o empresas. El tablero que se configura por defecto es el tablero generico, que todas las '
    'empresas utilizaran inicialmente. Sin embargo, si su organizacion trabaja con empresas de distintos sectores '
    '(industria alimentaria, automocion, servicios, etc.), puede crear tableros personalizados con plantillas '
    'especificas para cada sector y asignarlos a las empresas o zonas correspondientes.'
))
story.append(P(
    'Para crear un tablero personalizado, vaya a la sub-pestana "Tablero 5S" en el panel de administracion. '
    'Pulse "Nuevo Tablero", asignele un nombre descriptivo (por ejemplo, "Tablero Industria Alimentaria", '
    '"Tablero Automocion") y configure las 25 posiciones con las plantillas y estandares adecuados para ese sector. '
    'Una vez creado, podra asignar este tablero a las zonas o empresas que lo necesiten, sustituyendo el tablero '
    'generico por el personalizado. Esto permite adaptar la metodologia 5S a las necesidades especificas de cada '
    'tipo de organizacion sin tener que crear multiples configuraciones desde cero.'
))
story.append(tip_box(
    'Empiece configurando el tablero generico con plantillas validas para cualquier tipo de empresa. Una vez que '
    'tenga este tablero base funcionando, puede crear copias y adaptarlas para sectores especificos, anadiendo o '
    'modificando solo las plantillas que necesiten ser diferentes.'
))

# ═══════════════════════════════════════════════════════════════
# 5. EL TABLERO 5S - VISTA DEL USUARIO
# ═══════════════════════════════════════════════════════════════
story.extend(section('5. El Tablero 5S - Vista del Usuario'))
story.append(P(
    'El tablero 5S es la pantalla principal de la aplicacion y constituye el centro de operaciones para todos los '
    'usuarios. Se representa como un diagrama circular (pentagono) dividido en cinco sectores de color, cada uno '
    'correspondiente a una de las S de la metodologia. Debajo del pentagono se muestran las tarjetas de cada S con '
    'los cinco mini-pasos y su estado actual. Pulse sobre cualquier paso para abrir la ventana modal correspondiente '
    'y realizar las acciones necesarias.'
))

story.extend(subsection('5.1 Elementos del tablero'))
story.append(bullet('<b>Sectores de color:</b> Cada S tiene un color identificativo: 1S (violeta), 2S (amarillo), 3S (azul), 4S (rosa) y 5S (naranja). Los numeros dentro de cada sector indican la S a la que corresponden.'))
story.append(bullet('<b>Quesitos centrales:</b> En el centro del diagrama, cada sector coloreado indica que la S correspondiente ha sido completada (auditoria aprobada). Los sectores grises indican S pendientes.'))
story.append(bullet('<b>Estrellas:</b> Cuando una S se completa, aparece una estrella en el borde exterior del pentagono en el sector correspondiente.'))
story.append(bullet('<b>Tarjetas de pasos:</b> Debajo del pentagono, las cinco tarjetas muestran el estado de cada mini-paso: verde (completado), blanco con borde (disponible) o gris (bloqueado).'))
story.append(bullet('<b>Indicadores de progreso:</b> En la parte superior se muestran KPIs: puntuacion media, S completadas y acciones abiertas.'))

story.extend(subsection('5.2 Navegacion por los pasos'))
story.append(P(
    'La navegacion por los mini-pasos de cada S es estrictamente secuencial. Para desbloquear un paso, es necesario '
    'haber completado el anterior. Cuando pulse sobre un paso disponible, se abrira una ventana modal con el contenido '
    'y las acciones correspondientes a ese mini-paso. Si pulsa sobre un paso bloqueado, el sistema le indicara que '
    'debe completar los pasos anteriores primero. Los pasos completados pueden consultarse en modo de solo lectura, '
    'para revisar la documentacion y los resultados, pero no pueden modificarse una vez finalizados.'
))
story.append(P(
    'Ademas, la progresion entre S tambien es secuencial: no puede empezar la 2S sin haber completado la 1S, ni la 3S '
    'sin haber completado la 2S, y asi sucesivamente. Esta restriccion garantiza que la metodologia se implemente '
    'en el orden correcto, ya que cada S se apoya en los resultados de la anterior.'
))

# ═══════════════════════════════════════════════════════════════
# 6. LAS CINCO S EN DETALLE
# ═══════════════════════════════════════════════════════════════
story.extend(section('6. Las Cinco S en Detalle'))
story.append(P(
    'En esta seccion se describe el contenido especifico de cada una de las cinco S, con enfasis en los inventarios '
    'y las actividades particulares que se realizan en cada una. Recuerde que todas las S siguen el mismo flujo de '
    'cinco mini-pasos (formacion, fotos, inventario, autoevaluacion y auditoria), pero el contenido del inventario '
    'y los criterios de evaluacion varian segun la S.'
))

story.extend(subsection('6.1 1S - Seiri (Clasificar)'))
story.append(P(
    'La primera S se centra en clasificar y separar los elementos necesarios de los innecesarios en el lugar de '
    'trabajo. El objetivo es eliminar todo aquello que no es util para el trabajo diario, creando un entorno mas '
    'despejado y eficiente. Esta es la base de toda la metodologia: sin una clasificacion rigurosa, no es posible '
    'organizar correctamente en los pasos posteriores.'
))
story.append(P('<b>Inventario de Innecesarios:</b> El inventario de la 1S es especifico para registrar elementos innecesarios. Cada item se clasifica en una de tres categorias: Innecesario (elemento que no se usa y debe eliminarse), Dudoso (elemento cuya utilidad esta en duda y requiere revision) o Necesario (elemento que se usa y debe conservarse). Ademas, para cada item se registra el estado fisico (Bueno, Regular, Malo), la frecuencia de uso (Diario, Semanal, Mensual, etc.) y la decision tomada (Eliminar, Reubicar, Jaula, Donar, Vender).'))
story.append(P('<b>Jaula de Excedentes:</b> Los items marcados con decision "Jaula" se incorporan automaticamente a la Jaula de Excedentes, que es un espacio temporal donde los elementos innecesarios se almacenan antes de su destino final. La Jaula permite que otras zonas o departamentos reclamen elementos que para una zona son innecesarios pero que para otra pueden ser utiles. Cada item en la Jaula tiene un seguimiento de estado: en_jaula (disponible), reclamado (alguien lo ha solicitado), o transferido (se ha movido a su nuevo destino).'))

story.extend(subsection('6.2 2S - Seiton (Ordenar)'))
story.append(P(
    'La segunda S se centra en organizar los elementos necesarios de manera que sean faciles de encontrar, usar y '
    'devolver. El principio fundamental es que cada objeto debe tener una ubicacion asignada y senalizada, de forma '
    'que cualquiera pueda localizarlo rapidamente y devolverlo a su sitio tras usarlo. Una zona bien ordenada reduce '
    'los tiempos de busqueda, elimina la necesidad de desplazamientos innecesarios y previene errores.'
))
story.append(P('<b>Inventario de Necesarios:</b> El inventario de la 2S registra los elementos necesarios de la zona, clasificados por su frecuencia de uso. Las categorias son: Diario (se usa todos los dias, debe estar al alcance de la mano), Semanal (se usa varias veces por semana, puede estar un poco mas alejado), Mensual (se usa una vez al mes, puede almacenarse mas lejos), y Anual/Ocasional (se usa raramente, puede almacenarse fuera de la zona). Para cada item se indica la ubicacion actual, la ubicacion propuesta, el metodo de identificacion (etiqueta, senal, color, contorno) y si se necesita contorno visual en el suelo o la estanteria para marcar su ubicacion.'))

story.extend(subsection('6.3 3S - Seiso (Limpiar)'))
story.append(P(
    'La tercera S se centra en la limpieza del lugar de trabajo, pero va mas alla de la simple limpieza: se trata de '
    'identificar y eliminar las fuentes de suciedad. El principio fundamental es que "limpiar es inspeccionar": al '
    'limpiar una maquina o una superficie, el trabajador detecta anomalias, fugas, desgastes y otros problemas que '
    'de otro modo pasarian desapercibidos. La 3S convierte la limpieza en una actividad de mantenimiento preventivo.'
))
story.append(P('<b>Inventario de Puntos de Suciedad:</b> El inventario de la 3S registra los puntos de suciedad detectados en la zona. Cada punto se clasifica por tipo (Polvo, Grasa, Mancha, Residuos, Humedad, Oxidacion u Otro), se indica el nivel de gravedad (Leve, Moderado, Grave), la fuente de suciedad (proceso productivo, medio ambiente, falta de limpieza, escape/fuga, desgaste, derrame), el metodo de limpieza recomendado (aspirado, fregado, pulido, desinfeccion, reparacion) y la frecuencia de limpieza necesaria.'))

story.extend(subsection('6.4 4S - Seiketsu (Estandarizar)'))
story.append(P(
    'La cuarta S tiene como objetivo crear estandares y normas que mantengan los logros alcanzados con las tres S '
    'anteriores. Sin estandarizacion, es inevitable que el lugar de trabajo vuelva a su estado anterior: lo que no '
    'esta definido y documentado tiende a deteriorarse con el tiempo. La 4S convierte las mejores practicas '
    'identificadas en normas visuales y procedimientos que cualquiera puede seguir y verificar.'
))
story.append(P('<b>Inventario de Estandares:</b> El inventario de la 4S registra los estandares documentados en la zona. Cada estandar se clasifica por categoria: Layout (distribucion del espacio), Marcado de Suelo (senalizacion de zonas en el suelo), Visual (identificacion visual de elementos y ubicaciones), Procedimiento (procedimientos operativos estandarizados), Checklist (listas de verificacion), General (otras normas) o Formato de Mejora (formato para documentar mejoras). Para cada estandar se pueden incluir fotografias del estado antes y despues, el tipo de mejora, el estado del estandar (borrador, vigente, obsoleto) y la version actual.'))

story.extend(subsection('6.5 5S - Shitsuke (Mantener)'))
story.append(P(
    'La quinta y ultima S tiene como objetivo crear el habito de respetar los estandares mediante la disciplina y '
    'la mejora continua. Es la S mas dificil de todas porque requiere constancia y compromiso a largo plazo. La 5S '
    'se sostiene sobre tres pilares: las auditorias periodicas (semanales, mensuales y trimestrales), la gestion '
    'sistematica de anomalias y el plan de accion de mejora continua.'
))
story.append(P('<b>Plan de Accion:</b> El inventario de la 5S consiste en el Plan de Accion, donde se definen las acciones necesarias para mantener la disciplina y la mejora continua. Cada accion tiene un responsable, una prioridad (Alta, Media, Baja), un estado (Abierta, En Proceso, Resuelta, Cerrada) y una fecha limite. Las acciones pueden provenir de autoevaluaciones, auditorias externas o del propio plan de accion.'))
story.append(P('<b>Inventario de Practicas de Disciplina:</b> Ademas del plan de accion, la 5S incluye un inventario de practicas de disciplina observadas. Cada practica se clasifica como Cumplida, Parcial o Incumplida, y se registra la practica o habito especifico, el responsable y la frecuencia de seguimiento (Diaria, Semanal, Mensual). Este inventario permite identificar patrones de incumplimiento y tomar medidas correctivas.'))

# ═══════════════════════════════════════════════════════════════
# 7. FORMACION Y EXAMENES
# ═══════════════════════════════════════════════════════════════
story.extend(section('7. Formacion y Examenes'))
story.append(P(
    'La formacion es el primer paso de cada S y tiene caracter individual: cada empleado debe completarla y aprobar '
    'el examen correspondiente antes de poder avanzar a los pasos siguientes. La formacion consiste en material '
    'didactico especifico para cada S, que incluye explicaciones teoricas, ejemplos practicos, criterios de evaluacion '
    'y recomendaciones. El material se presenta en formato de paginas que el empleado puede navegar a su ritmo.'
))
story.append(P(
    'Al finalizar la revision del material formativo, el empleado puede acceder al examen. El examen consta de '
    'preguntas de opcion multiple sobre los contenidos de la formacion. Cada pregunta tiene una unica respuesta '
    'correcta, y la puntuacion se calcula como el porcentaje de respuestas correctas sobre el total de preguntas. '
    'Para aprobar, es necesario obtener al menos un 80% de aciertos. Tras completar el examen, la aplicacion muestra '
    'la puntuacion obtenida y, si ha aprobado, marca automaticamente el paso de formacion como completado. Si no '
    'aprueba, podra revisar el material y volver a intentarlo sin limite de intentos.'
))
story.append(tip_box(
    'Lea el material formativo con atencion antes de intentar el examen. Aunque no hay limite de intentos, es '
    'mejor asegurarse de haber comprendido bien los conceptos antes de presentarse. Tome notas si lo necesita '
    'y no tenga prisa: la formacion es la base de toda la metodologia.'
))

# ═══════════════════════════════════════════════════════════════
# 8. DOCUMENTACION FOTOGRAFICA
# ═══════════════════════════════════════════════════════════════
story.extend(section('8. Documentacion Fotografica'))
story.append(P(
    'La documentacion fotografica es un paso esencial en cada S. Las fotografias del estado "antes" permiten '
    'registrar la situacion de partida de la zona antes de actuar, lo que resulta fundamental para valorar la '
    'mejora alcanzada y para servir como evidencia en las auditorias. Se requiere un minimo de 3 fotografias para '
    'completar este paso, aunque se recomienda tomar todas las que sean necesarias para documentar adecuadamente '
    'el estado de la zona.'
))
story.append(P(
    'Las fotografias deben capturar los aspectos relevantes de la S correspondiente. En la 1S, se fotografiaran '
    'los elementos innecesarios; en la 2S, la organizacion actual; en la 3S, los puntos de suciedad; en la 4S, '
    'el estado de los estandares; y en la 5S, el nivel de cumplimiento. Cualquier empleado de la zona puede subir '
    'fotografias, ya que es un paso colectivo. Las fotos se almacenan en la aplicacion y quedan disponibles para '
    'todos los miembros del equipo y para los auditores durante las revisiones.'
))
story.append(P('<b>Tipos de fotografias:</b>'))
story.append(bullet('<b>Antes:</b> Documentan el estado inicial antes de actuar. Son obligatorias y deben tomarse siempre.'))
story.append(bullet('<b>Despues:</b> Documentan el estado tras la intervencion. Permiten comparar con las fotos "antes" y visualizar la mejora.'))
story.append(bullet('<b>Referencia:</b> Muestran el estado ideal o un benchmark. Sirven como objetivo a alcanzar.'))
story.append(bullet('<b>Hallazgo:</b> Capturan anomalias o problemas detectados durante la implementacion.'))
story.append(bullet('<b>Mejora:</b> Documentan las mejoras implementadas como resultado del proceso.'))

# ═══════════════════════════════════════════════════════════════
# 9. SISTEMA DE INVENTARIOS
# ═══════════════════════════════════════════════════════════════
story.extend(section('9. Sistema de Inventarios'))
story.append(P(
    'Cada S incluye un inventario especifico como tercer mini-paso. Los inventarios son la herramienta principal '
    'para documentar y cuantificar la situacion de la zona en cada etapa de la metodologia. A continuacion se '
    'resumen los tipos de inventario por S:'
))

story.append(make_table(
    ['S', 'Tipo de Inventario', 'Campos principales'],
    [
        ['1S', 'Innecesarios', 'Nombre, categoria, estado, frecuencia, decision, ubicacion, foto'],
        ['2S', 'Necesarios', 'Nombre, frecuencia de uso, ubicacion actual, ubicacion propuesta, metodo identificacion'],
        ['3S', 'Puntos de Suciedad', 'Tipo de suciedad, gravedad, fuente, metodo limpieza, frecuencia'],
        ['4S', 'Estandares', 'Categoria, descripcion, fotos antes/despues, estado, version'],
        ['5S', 'Disciplina', 'Practica/Habito, cumplimiento (Cumplido/Parcial/Incumplido), responsable, frecuencia'],
    ],
    col_ratios=[0.07, 0.23, 0.70]
))
story.append(P('Tabla 5. Resumen de inventarios por S', style_caption))

story.extend(subsection('9.1 Anadir elementos al inventario'))
story.append(P(
    'Para anadir un nuevo elemento al inventario, abra el modal del inventario dentro del paso correspondiente y pulse '
    'el boton "Anadir item". Rellene los campos obligatorios (nombre, categoria, ubicacion) y los campos especificos '
    'de la S. Puede anadir una foto del elemento como evidencia. Los items se guardan automaticamente en la base de '
    'datos y quedan disponibles para todos los empleados de la zona. Recuerde que los inventarios de 1S y 2S son '
    'independientes: en la 1S se registran innecesarios y en la 2S se registran necesarios. No mezcle ambos tipos de '
    'elementos en el mismo inventario.'
))

story.extend(subsection('9.2 Plantillas de exportacion'))
story.append(P(
    'Cada inventario dispone de una plantilla Excel que puede descargarse desde la aplicacion. Las plantillas contienen '
    'las columnas necesarias para registrar los elementos fuera de linea y luego importarlos masivamente. Las plantillas '
    'disponibles son: S1_Inventario_Innecesarios_Seiri.xlsx, S2_Inventario_Necesarios_Seiton.xlsx, '
    'S3_Inventario_Puntos_Suciedad_Seiso.xlsx, S4_Inventario_Estandares_Seiketsu.xlsx y '
    'S5_Inventario_Disciplina_Shitsuke.xlsx. Estas plantillas son especialmente utiles para realizar el inventario '
    'in situ con un portatil o tableta y despues cargar los datos en la aplicacion.'
))

# ═══════════════════════════════════════════════════════════════
# 10. AUTOEVALUACION Y AUDITORIA
# ═══════════════════════════════════════════════════════════════
story.extend(section('10. Autoevaluacion y Auditoria'))

story.extend(subsection('10.1 Autoevaluacion interna (paso 4)'))
story.append(P(
    'La autoevaluacion es el cuarto paso de cada S y consiste en una verificacion interna del cumplimiento de los '
    'criterios 5S. La realizan los empleados de la zona mediante un checklist estandarizado donde cada item se valora '
    'como OK (cumple), NOK (no cumple) o N/A (no aplica). Los items marcados como NOK requieren indicar '
    'obligatoriamente el hallazgo (que se encontro mal) y los puntos de mejora (que se propone para corregirlo). '
    'Esta informacion se utiliza automaticamente para alimentar el plan de accion, creando acciones correctivas '
    'para cada desviacion detectada.'
))
story.append(P(
    'La autoevaluacion tiene un caracter formativo: su proposito es que los empleados reflexionen sobre el grado de '
    'cumplimiento de los criterios antes de la auditoria externa. No determina si la S se aprueba o no (eso lo hace '
    'la auditoria), pero sirve como preparacion y como fuente de acciones de mejora. Cada empleado debe completar su '
    'propia autoevaluacion, por lo que es un paso individual.'
))

story.extend(subsection('10.2 Auditoria externa (paso 5)'))
story.append(P(
    'La auditoria externa es el quinto y ultimo paso de cada S. Solo puede ser realizada por un usuario con el rol '
    'de auditor. El auditor utiliza el mismo checklist que la autoevaluacion, pero su evaluacion tiene caracter oficial '
    'y es la que determina si la zona aprueba o no la S correspondiente. Los roles de responsable y empleado no pueden '
    'realizar auditorias externas; esta restriccion garantiza la objetividad e independencia del proceso de evaluacion.'
))
story.append(P(
    'El resultado de la auditoria se calcula automaticamente a partir de los items del checklist. La puntuacion maxima '
    'del checklist es del 90%, y cada punto a mejorar identificado puede anadir hasta un 5% adicional (maximo 2 '
    'mejoras = +10%), lo que permite alcanzar un 100% si se han identificado y documentado mejoras proactivas. Para '
    'aprobar la S, la zona debe obtener una puntuacion minima del 75%. Si la puntuacion es inferior, la S no se '
    'aprueba y se deberan resolver las acciones correctivas antes de poder repetir la auditoria.'
))

story.extend(subsection('10.3 Flujo de notificacion de auditoria'))
story.append(P(
    'La aplicacion incluye un sistema de notificaciones que facilita la comunicacion entre empleados y auditores. '
    'El flujo es el siguiente:'
))
story.append(bullet('<b>Paso 1:</b> Cuando un empleado completa los pasos 1-4 de una S, aparece automaticamente un banner naranja en el tablero indicando "Pendiente de auditoria: SX (nombre)".'))
story.append(bullet('<b>Paso 2:</b> El empleado pulsa el banner para enviar una notificacion al auditor. El sistema envia automaticamente una notificacion al auditor asignado.'))
story.append(bullet('<b>Paso 3:</b> El auditor recibe la notificacion (icono de campana en la barra superior) y puede aceptar la reunion de auditoria.'))
story.append(bullet('<b>Paso 4:</b> El auditor realiza la auditoria (paso 5) y emite su veredicto: Apto o No Apto.'))
story.append(bullet('<b>Paso 5:</b> Los resultados se registran automaticamente y, si es Apto, se concede el quesito correspondiente.'))

story.extend(subsection('10.4 Tipos de auditoria periodica'))
story.append(make_table(
    ['Tipo', 'Alcance', 'Descripcion'],
    [
        ['Semanal', 'Solo limpieza (S3)', 'Verificacion rapida del estado de limpieza de la zona. Se realiza cada semana y sirve para mantener el habito de limpieza.'],
        ['Mensual', 'Resumida (2 items/seccion)', 'Auditoria abreviada que revisa los 2 primeros items de cada seccion de cada S. Es mas rapida que la trimestral pero cubre todas las S.'],
        ['Trimestral', 'Completa (todas las S)', 'Auditoria completa que evalua las 5S con todo el checklist. Es la auditoria mas exhaustiva y la que determina el estado global de la implementacion.'],
    ],
    col_ratios=[0.12, 0.25, 0.63]
))
story.append(P('Tabla 6. Tipos de auditoria periodica', style_caption))

# ═══════════════════════════════════════════════════════════════
# 11. PLAN DE ACCION
# ═══════════════════════════════════════════════════════════════
story.extend(section('11. Plan de Accion'))
story.append(P(
    'El plan de accion es la herramienta central de la mejora continua en la metodologia 5S. Se nutre de las '
    'desviaciones detectadas tanto en las autoevaluaciones como en las auditorias externas, convirtiendo cada NOK '
    'en una accion concreta que debe ser resuelta. El plan de accion es accesible desde diferentes puntos de la '
    'aplicacion y su visibilidad depende del rol del usuario.'
))

story.extend(subsection('11.1 Estructura de una accion'))
story.append(make_table(
    ['Campo', 'Descripcion'],
    [
        ['S y Item', 'Referencia a la S y al item del checklist que origino la accion (por ejemplo, S1, item 1.2.3).'],
        ['Hallazgo', 'Descripcion de la desviacion detectada. Es obligatorio y explica que se encontro mal.'],
        ['Punto a Mejorar', 'Sugerencia de mejora o plan de accion propuesto para resolver la desviacion.'],
        ['Responsable', 'Persona encargada de resolver la accion. Se asigna manualmente.'],
        ['Prioridad', 'Alta, Media o Baja. Determina la urgencia de la resolucion.'],
        ['Estado', 'Abierta, En Proceso, Resuelta o Cerrada. Refleja el ciclo de vida de la accion.'],
        ['Fecha limite', 'Plazo maximo para la resolucion de la accion.'],
        ['Fecha de resolucion', 'Fecha real en la que la accion fue completada.'],
        ['Notas', 'Observaciones adicionales sobre la resolucion o el seguimiento.'],
        ['Origen', 'Indica si la accion proviene de una autoevaluacion, una auditoria o del plan de accion.'],
    ],
    col_ratios=[0.22, 0.78]
))
story.append(P('Tabla 7. Campos del plan de accion', style_caption))

story.extend(subsection('11.2 Ciclo de vida de una accion'))
story.append(P(
    'Las acciones del plan de accion siguen un ciclo de vida con cuatro estados claramente definidos. El flujo '
    'normal es: Abierta (se detecta la desviacion y se crea la accion) -> En Proceso (alguien se ha asignado '
    'la resolucion y esta trabajando en ella) -> Resuelta (la accion se ha completado y la desviacion se ha '
    'corregido) -> Cerrada (se ha verificado que la solucion es efectiva y la accion se da por finalizada). '
    'Es importante no saltarse el paso de verificacion: una accion solo debe cerrarse cuando se ha comprobado '
    'que la desviacion ha desaparecido realmente.'
))

story.extend(subsection('11.3 Visibilidad del plan de accion'))
story.append(bullet('<b>Gerente:</b> Ve todos los planes de accion de todos los proyectos de su empresa. Tiene una vision global del estado de la mejora continua.'))
story.append(bullet('<b>Responsable:</b> Ve los planes de accion de los proyectos que tiene asignados. Puede filtrar por zona dentro de sus proyectos.'))
story.append(bullet('<b>Empleado:</b> Ve solo las acciones de las zonas a las que esta asignado. Puede editar y actualizar las acciones que le han sido asignadas.'))
story.append(bullet('<b>Auditor:</b> Ve las acciones derivadas de sus auditorias para poder verificar que las desviaciones han sido corregidas.'))

# ═══════════════════════════════════════════════════════════════
# 12. SEGUIMIENTO DEL PROGRESO
# ═══════════════════════════════════════════════════════════════
story.extend(section('12. Seguimiento del Progreso'))

story.extend(subsection('12.1 Tabla DATOS y Grafico Radar'))
story.append(P(
    'La aplicacion incluye dos herramientas fundamentales para el seguimiento del progreso de la implementacion 5S: '
    'la tabla DATOS y el grafico radar. La tabla DATOS muestra la puntuacion obtenida en cada una de las cinco S, '
    'permitiendo comparar rapidamente el rendimiento entre las diferentes etapas de la metodologia. El grafico radar '
    'representa visualmente las puntuaciones como un poligono de cinco vertices, donde un area mayor indica un mejor '
    'cumplimiento global. Ambas herramientas estan disponibles en la pestana de Gerencia y permiten filtrar por '
    'proyecto y zona para analizar la evolucion del progreso a lo largo del tiempo.'
))

story.extend(subsection('12.2 Indicadores clave'))
story.append(P(
    'La aplicacion calcula automaticamente varios indicadores clave de rendimiento (KPIs) que permiten evaluar '
    'el estado de la implementacion 5S de un vistazo:'
))
story.append(bullet('<b>Puntuacion media:</b> Promedio de las puntuaciones obtenidas en las S completadas. Un valor superior al 80% indica una implementacion solida.'))
story.append(bullet('<b>S completadas:</b> Numero de S que han superado la auditoria externa. El objetivo es llegar a 5/5.'))
story.append(bullet('<b>Acciones abiertas:</b> Numero de acciones del plan de accion que aun estan pendientes de resolver. Un numero elevado indica que hay desviaciones sin corregir.'))
story.append(bullet('<b>Tasa de aprobacion:</b> Porcentaje de auditorias aprobadas sobre el total realizadas. Una tasa superior al 90% indica buena adherencia a los estandares.'))

story.extend(subsection('12.3 Panel del Gerente'))
story.append(P(
    'El panel del Gerente ofrece una vision consolidada de todos los proyectos de la empresa. Desde este panel, '
    'el gerente puede consultar estadisticas globales de implementacion, revisar los inventarios de todas las zonas '
    'y proyectos, acceder a los planes de accion con filtros por proyecto y zona, y verificar el estado de las '
    'auditorias. El panel incluye tres secciones principales: Estadisticas (con graficos de progreso por proyecto), '
    'Inventario consolidado (con todos los items de todos los proyectos) y Plan de Accion global (con todas las '
    'acciones de la empresa). Esta vision horizontal permite al gerente identificar patrones, comparar proyectos y '
    'priorizar recursos donde mas se necesitan.'
))

# ═══════════════════════════════════════════════════════════════
# 13. JAULA DE EXCEDENTES
# ═══════════════════════════════════════════════════════════════
story.extend(section('13. Jaula de Excedentes'))
story.append(P(
    'La Jaula de Excedentes es un espacio de almacenamiento temporal donde se depositan los elementos clasificados '
    'como innecesarios en la 1S antes de tomar una decision definitiva sobre su destino. Su funcion principal es '
    'evitar la eliminacion prematura de elementos que podrian ser utiles para otras zonas o departamentos, '
    'promoviendo la reutilizacion y reduciendo el desperdicio. La Jaula es una herramienta de gestion que permite '
    'un proceso de clasificacion ordenado y transparente.'
))
story.append(P('<b>Flujo de la Jaula:</b>'))
story.append(bullet('Un empleado clasifica un item como innecesario en la 1S y marca la decision como "Jaula". El item se incorpora automaticamente con el estado "en_jaula".'))
story.append(bullet('Otros empleados de otras zonas pueden consultar la Jaula y reclamar elementos que les sean utiles. El estado cambia a "reclamado".'))
story.append(bullet('Si el reclamo se confirma, el item se transfiere a la nueva zona y el estado cambia a "transferido". Si no se reclama en un plazo razonable, el item se elimina o se dona segun la decision final.'))
story.append(bullet('Se registran las fechas de entrada y salida de cada item en la Jaula, asi como la zona de origen y destino, para mantener una trazabilidad completa.'))

# ═══════════════════════════════════════════════════════════════
# 14. MEJORA CONTINUA
# ═══════════════════════════════════════════════════════════════
story.extend(section('14. Mejora Continua'))
story.append(P(
    'Cuando una zona ha completado las cinco S (ha obtenido los cinco quesitos), se desbloquea automaticamente la '
    'pestana de Mejora Continua. Esta fase representa la transicion de la implementacion inicial al mantenimiento a '
    'largo plazo, y se basa en el ciclo PDCA (Planificar, Hacer, Verificar, Actuar). La mejora continua no es un paso '
    'adicional sino la forma de trabajar permanente que garantiza que los logros alcanzados con las 5S no se pierdan '
    'con el tiempo.'
))
story.append(P(
    'La pestana de Mejora Continua incluye las siguientes funcionalidades:'
))
story.append(bullet('<b>Auditorias periodicas:</b> Auditorias semanales (solo limpieza), mensuales (resumidas) y trimestrales (completas) que verifican el mantenimiento de los estandares.'))
story.append(bullet('<b>Plan de Accion permanente:</b> Las anomalias detectadas en las auditorias periodicas se incorporan automaticamente al plan de accion, creando un ciclo continuo de mejora.'))
story.append(bullet('<b>Contadores de seguimiento:</b> Los contadores de la fase de implementacion se mantienen activos para medir la evolucion a lo largo del tiempo.'))
story.append(bullet('<b>Grafico Radar:</b> Permite comparar las puntuaciones de las cinco S a lo largo del tiempo, identificando tendencias y areas de deterioro.'))
story.append(Spacer(1, 6))
story.append(warning_box(
    'Completar las cinco S no es el final del proceso, sino el comienzo. Sin auditorias periodicas y seguimiento '
    'continuo, es muy probable que el lugar de trabajo vuelva a su estado anterior. La mejora continua requiere '
    'compromiso y disciplina a largo plazo.'
))

# ═══════════════════════════════════════════════════════════════
# 15. GESTION DE PERMISOS
# ═══════════════════════════════════════════════════════════════
story.extend(section('15. Gestion de Permisos'))
story.append(P(
    'La aplicacion cuenta con un sistema de permisos granular que permite al Administrador configurar exactamente '
    'que acciones puede realizar cada rol. El sistema incluye 68 permisos individuales organizados en dos categorias: '
    'permisos por S (50 permisos: 5 S x 5 pasos x 2 acciones - ver y ejecutar) y permisos generales (18 permisos '
    'transversales como ver tablero, gestionar zonas, anadir miembros, etc.).'
))
story.append(P(
    'La configuracion de permisos se realiza desde la pestana Admin, en la seccion de Permisos. El Administrador '
    'puede activar o desactivar permisos individuales para cada rol, creando configuraciones a medida segun las '
    'necesidades de la organizacion. Siempre puede restaurar los permisos por defecto pulsando el boton "Restaurar '
    'valores por defecto". Los permisos por defecto ya estan configurados de manera que cada rol tiene acceso a '
    'las funciones que le corresponden segun la tabla de roles y permisos (seccion 2.2), por lo que solo es necesario '
    'modificarlos si su organizacion tiene requisitos especificos.'
))

# ═══════════════════════════════════════════════════════════════
# 16. PANEL DE ADMINISTRACION
# ═══════════════════════════════════════════════════════════════
story.extend(section('16. Panel de Administracion'))
story.append(P(
    'El panel de administracion es exclusivo para el rol de Administrador y proporciona acceso a todas las funciones '
    'de gestion de la plataforma. Se accede desde la pestana "Admin" y esta organizado en cinco sub-pestanas:'
))
story.append(bullet('<b>Empresas:</b> Crear, editar y eliminar empresas. Asignar gerentes a nivel de empresa. Gestionar la informacion de cada organizacion.'))
story.append(bullet('<b>Usuarios:</b> Crear, editar y eliminar usuarios. Cambiar roles. Restablecer contrasenas. Activar o desactivar cuentas. Ver el listado completo de usuarios del sistema.'))
story.append(bullet('<b>Proyectos:</b> Crear, editar y eliminar proyectos. Gestionar zonas dentro de cada proyecto. Anadir y eliminar miembros. Asignar zonas a los miembros. Designar responsables de zona.'))
story.append(bullet('<b>Plantillas:</b> Crear, editar y eliminar plantillas de formacion, examenes, inventarios, auditorias, etc. Las plantillas son reutilizables y se asignan a las posiciones del tablero.'))
story.append(bullet('<b>Tablero 5S:</b> Configurar las 25 posiciones del tablero asignando plantillas y estandares. Gestionar tableros por sector. Ver el resumen de posiciones asignadas.'))
story.append(Spacer(1, 6))
story.append(tip_box(
    'El Administrador tambien puede activar el "modo navegacion libre" desde la barra superior, que permite '
    'acceder a cualquier paso del tablero sin las restricciones de progresion secuencial. Esto es util para '
    'revisar el contenido de los pasos sin tener que completar los anteriores, pero debe usarse con cautela '
    'ya que desactiva temporalmente las protecciones de la metodologia.'
))

# ═══════════════════════════════════════════════════════════════
# 17. PREGUNTAS FRECUENTES
# ═══════════════════════════════════════════════════════════════
story.extend(section('17. Preguntas Frecuentes'))

story.append(P('<b>Pregunta 1: Si hay varios empleados en una zona, todos deben completar la formacion antes de avanzar?</b>'))
story.append(P('Si. Los pasos individuales como la formacion y la autoevaluacion deben ser completados por cada empleado. La zona no puede avanzar al siguiente paso hasta que todos los empleados asignados hayan completado los pasos individuales que les corresponden. Esto garantiza que todo el equipo tiene los conocimientos necesarios antes de pasar a la fase practica.'))

story.append(P('<b>Pregunta 2: Un empleado puede realizar la autoevaluacion interna?</b>'))
story.append(P('Si. La autoevaluacion interna (paso 4) la realizan los empleados de la zona. Es un ejercicio de reflexion sobre el grado de cumplimiento de los criterios 5S. Cada empleado completa el checklist valorando cada item como OK, NOK o N/A. Los items NOK requieren indicar obligatoriamente el hallazgo y los puntos de mejora.'))

story.append(P('<b>Pregunta 3: Quien realiza la auditoria externa?</b>'))
story.append(P('Solo los usuarios con rol de auditor pueden realizar auditorias externas (paso 5). El responsable coordina el proyecto y hace seguimiento del progreso, pero la evaluacion externa debe ser realizada por un auditor independiente para garantizar la objetividad del proceso.'))

story.append(P('<b>Pregunta 4: Se pueden mezclar los inventarios de 1S y 2S?</b>'))
story.append(P('No. Los inventarios de 1S (innecesarios) y 2S (necesarios) son independientes. Esta separacion es intencionada desde el punto de vista pedagogico: primero se aprende a identificar lo que sobra y despues se aprende a organizar lo que queda. No deben mezclarse ambos tipos de elementos en el mismo inventario.'))

story.append(P('<b>Pregunta 5: Que pasa si no se aprueba la auditoria?</b>'))
story.append(P('Si la puntuacion de la auditoria es inferior al 75%, la S no se aprueba. Las desviaciones detectadas (items NOK) generan automaticamente acciones en el plan de accion. Una vez resueltas las acciones correctivas, se puede repetir la auditoria. No hay limite de intentos, pero cada intento requiere que un auditor este disponible para realizar la evaluacion.'))

story.append(P('<b>Pregunta 6: Como se asignan tableros diferentes a distintas empresas?</b>'))
story.append(P('El Administrador puede crear tableros personalizados desde la sub-pestana "Tablero 5S" del panel de administracion. Cada tablero tiene un nombre y una configuracion de 25 posiciones (plantillas y estandares). Una vez creado un tablero, puede asignarse a las empresas o zonas que lo necesiten, sustituyendo el tablero generico por el personalizado.'))

story.append(P('<b>Pregunta 7: Se puede repetir un examen de formacion?</b>'))
story.append(P('Si, no hay limite de intentos. Si un empleado no alcanza el 80% minimo, puede repasar el material formativo y volver a presentarse al examen cuantas veces sea necesario. La puntuacion registrada sera la del ultimo intento aprobado.'))

story.append(P('<b>Pregunta 8: Que pasa despues de completar las cinco S?</b>'))
story.append(P('Se desbloquea automaticamente la pestana de Mejora Continua, donde se realizan auditorias periodicas (semanales, mensuales y trimestrales) para asegurar que los logros se mantienen a lo largo del tiempo. La mejora continua es una fase permanente que no tiene fin: el objetivo es la mejora constante.'))

# ═══════════════════════════════════════════════════════════════
# 18. GLOSARIO
# ═══════════════════════════════════════════════════════════════
story.extend(section('18. Glosario de Terminos'))

story.append(make_table(
    ['Termino', 'Definicion'],
    [
        ['5S', 'Metodologia de organizacion del lugar de trabajo basada en cinco principios: Seiri, Seiton, Seiso, Seiketsu y Shitsuke.'],
        ['Seiri', 'Primera S: Clasificar. Separar lo necesario de lo innecesario y eliminar lo innecesario.'],
        ['Seiton', 'Segunda S: Ordenar. Organizar los elementos necesarios para que sean faciles de encontrar y usar.'],
        ['Seiso', 'Tercera S: Limpiar. Limpiar el lugar de trabajo identificando y eliminando fuentes de suciedad.'],
        ['Seiketsu', 'Cuarta S: Estandarizar. Crear estandares que mantengan los logros de las 3S anteriores.'],
        ['Shitsuke', 'Quinta S: Mantener. Crear el habito de respetar los estandares mediante disciplina.'],
        ['Quesito', 'Sector del diagrama central que se gana al completar una S (auditoria aprobada).'],
        ['Jaula de Excedentes', 'Espacio temporal para elementos innecesarios antes de su destino final.'],
        ['Checklist', 'Lista de verificacion utilizada en autoevaluaciones y auditorias para evaluar el cumplimiento 5S.'],
        ['Hallazgo', 'Desviacion detectada durante una autoevaluacion o auditoria que requiere accion correctiva.'],
        ['NOK', 'Item del checklist que no cumple con el criterio evaluado (No OK).'],
        ['PDCA', 'Ciclo Planificar-Hacer-Verificar-Actuar, base de la mejora continua.'],
        ['Poka-yoke', 'Sistema a prueba de errores que previene fallos humanos mediante diseno.'],
        ['Tablero', 'Diagrama pentagonal que muestra el progreso de las 5S de una zona.'],
        ['Plantilla', 'Documento reutilizable con contenido formativo, examenes o criterios de evaluacion.'],
        ['Estandar', 'Norma documentada que define como debe realizarse una tarea o como debe verse una zona.'],
    ],
    col_ratios=[0.22, 0.78]
))
story.append(P('Tabla 8. Glosario de terminos', style_caption))


# ─── Build ───
doc.multiBuild(story)
print(f'PDF generated: {OUTPUT}')
print(f'Pages: {doc.page}')
