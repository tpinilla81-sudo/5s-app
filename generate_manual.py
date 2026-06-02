#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera el Manual de Usuario de la aplicacion Metodologia 5S.
Incluye portada, indice y todas las secciones del manual actualizado.
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, CondPageBreak, ListFlowable, ListItem
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Palette ───────────────────────────────────────────────────────────────
ACCENT       = colors.HexColor('#461fbc')
TEXT_PRIMARY  = colors.HexColor('#232220')
TEXT_MUTED    = colors.HexColor('#908b84')
BG_SURFACE   = colors.HexColor('#e1deda')
BG_PAGE      = colors.HexColor('#eeebe8')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# 5S step colors
S1_COLOR = colors.HexColor('#8B5CF6')
S2_COLOR = colors.HexColor('#EAB308')
S3_COLOR = colors.HexColor('#3B82F6')
S4_COLOR = colors.HexColor('#F43F5E')
S5_COLOR = colors.HexColor('#F97316')
S_COLORS = [S1_COLOR, S2_COLOR, S3_COLOR, S4_COLOR, S5_COLOR]

# ─── Fonts ─────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/chinese/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))

registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerif')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans')
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# ─── Install font fallback ────────────────────────────────────────────────
_scripts = os.path.join(os.path.expanduser('~'), 'skills', 'pdf', 'scripts') if os.path.exists(os.path.expanduser('~/skills/pdf/scripts')) else ''
if _scripts and _scripts not in sys.path:
    sys.path.insert(0, _scripts)

try:
    from pdf import install_font_fallback
    install_font_fallback()
except Exception:
    pass  # Fallback not critical for Spanish text

# ─── Page setup ────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.8 * cm
RIGHT_MARGIN = 1.8 * cm
TOP_MARGIN = 2.0 * cm
BOTTOM_MARGIN = 2.0 * cm
AVAILABLE_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ─── Styles ────────────────────────────────────────────────────────────────
FONT_HEADING = 'Carlito-Bold'
FONT_BODY = 'LiberationSerif'
FONT_SANS = 'Carlito'
FONT_SANS_BOLD = 'Carlito-Bold'
FONT_SYMBOL = 'DejaVuSans'

styles = getSampleStyleSheet()

# Title page styles
style_cover_title = ParagraphStyle(
    'CoverTitle', fontName=FONT_HEADING, fontSize=36, leading=44,
    alignment=TA_CENTER, textColor=colors.white, spaceAfter=12
)
style_cover_sub = ParagraphStyle(
    'CoverSub', fontName=FONT_SANS, fontSize=16, leading=22,
    alignment=TA_CENTER, textColor=colors.HexColor('#e0d4f7'), spaceAfter=6
)
style_cover_meta = ParagraphStyle(
    'CoverMeta', fontName=FONT_SANS, fontSize=12, leading=18,
    alignment=TA_CENTER, textColor=colors.HexColor('#c4b5e0')
)

# TOC styles
style_toc_title = ParagraphStyle(
    'TOCTitle', fontName=FONT_HEADING, fontSize=22, leading=28,
    alignment=TA_LEFT, textColor=ACCENT, spaceBefore=0, spaceAfter=18
)

# Body styles
style_h1 = ParagraphStyle(
    'H1', fontName=FONT_HEADING, fontSize=22, leading=28,
    alignment=TA_LEFT, textColor=ACCENT, spaceBefore=18, spaceAfter=10
)
style_h2 = ParagraphStyle(
    'H2', fontName=FONT_HEADING, fontSize=16, leading=22,
    alignment=TA_LEFT, textColor=colors.HexColor('#5b3db8'), spaceBefore=14, spaceAfter=8
)
style_h3 = ParagraphStyle(
    'H3', fontName=FONT_SANS_BOLD, fontSize=13, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6
)
style_body = ParagraphStyle(
    'Body', fontName=FONT_BODY, fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=6
)
style_body_just = ParagraphStyle(
    'BodyJust', fontName=FONT_BODY, fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=6
)
style_bullet = ParagraphStyle(
    'Bullet', fontName=FONT_BODY, fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=20,
    bulletIndent=8, spaceBefore=1, spaceAfter=3
)
style_note = ParagraphStyle(
    'Note', fontName=FONT_SANS, fontSize=9.5, leading=15,
    alignment=TA_LEFT, textColor=TEXT_MUTED, leftIndent=16,
    spaceBefore=4, spaceAfter=4
)
style_table_header = ParagraphStyle(
    'TableHeader', fontName=FONT_SANS_BOLD, fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=TABLE_HEADER_TEXT
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName=FONT_BODY, fontSize=9.5, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK'
)
style_table_cell_c = ParagraphStyle(
    'TableCellC', fontName=FONT_BODY, fontSize=9.5, leading=14,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY
)
style_caption = ParagraphStyle(
    'Caption', fontName=FONT_SANS, fontSize=9, leading=13,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=12
)

# ─── Helper functions ──────────────────────────────────────────────────────

def P(text, style=style_body):
    return Paragraph(text, style)

def H1(text):
    return Paragraph(text, style_h1)

def H2(text):
    return Paragraph(text, style_h2)

def H3(text):
    return Paragraph(text, style_h3)

def Body(text):
    return Paragraph(text, style_body_just)

def Bullet(text):
    return Paragraph(text, style_bullet)

def Note(text):
    return Paragraph(text, style_note)

def Spacer6():
    return Spacer(1, 6)

def Spacer12():
    return Spacer(1, 12)

def Spacer18():
    return Spacer(1, 18)

def Spacer24():
    return Spacer(1, 24)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with headers and rows."""
    available = AVAILABLE_W
    if col_ratios:
        col_widths = [r * available for r in col_ratios]
    else:
        n = len(headers)
        col_widths = [available / n] * n

    data = []
    header_row = [Paragraph('<b>{}</b>'.format(h), style_table_header) for h in headers]
    data.append(header_row)
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) if not isinstance(c, Paragraph) else c for c in row])

    tbl = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

    tbl.setStyle(TableStyle(style_cmds))
    return tbl


def add_heading(text, style, level=0):
    """Create a heading paragraph with bookmark for TOC."""
    key = 'h_%s' % hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


# ─── TOC DocTemplate ──────────────────────────────────────────────────────

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


# ─── Build document ───────────────────────────────────────────────────────

OUTPUT = '/home/z/my-project/download/Manual_Usuario_5S.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = TocDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title='Manual de Usuario - Metodologia 5S',
    author='Z.ai',
    creator='Z.ai',
    subject='Manual de Usuario para la aplicacion de Metodologia 5S'
)

story = []

# ═══════════════════════════════════════════════════════════════════════════
# COVER PAGE (simple text-based, no HTML cover for simplicity)
# ═══════════════════════════════════════════════════════════════════════════

# We create a colored block for the cover
from reportlab.platypus.flowables import HRFlowable

cover_data = [
    [Paragraph('', ParagraphStyle('empty', fontSize=1))],
]
cover_table = Table(cover_data, colWidths=[AVAILABLE_W], rowHeights=[PAGE_H - TOP_MARGIN - BOTTOM_MARGIN])
cover_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), ACCENT),
    ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
]))

# Instead of a complex cover, use a simple styled page
story.append(Spacer(1, 120))

# Decorative line
story.append(HRFlowable(width='60%', thickness=3, color=ACCENT, spaceAfter=20, spaceBefore=0, hAlign='CENTER'))

story.append(Paragraph('<b>MANUAL DE USUARIO</b>', ParagraphStyle(
    'CoverMain', fontName=FONT_HEADING, fontSize=34, leading=42,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=12
)))
story.append(Paragraph('<b>Aplicacion Metodologia 5S</b>', ParagraphStyle(
    'CoverApp', fontName=FONT_SANS_BOLD, fontSize=20, leading=28,
    alignment=TA_CENTER, textColor=colors.HexColor('#5b3db8'), spaceAfter=24
)))

story.append(HRFlowable(width='40%', thickness=1.5, color=S1_COLOR, spaceAfter=30, spaceBefore=0, hAlign='CENTER'))

# 5S labels
s_labels = [
    ('1S', 'Seiri', 'Clasificar', S1_COLOR),
    ('2S', 'Seiton', 'Ordenar', S2_COLOR),
    ('3S', 'Seiso', 'Limpiar', S3_COLOR),
    ('4S', 'Seiketsu', 'Estandarizar', S4_COLOR),
    ('5S', 'Shitsuke', 'Mantener', S5_COLOR),
]
s_cells = []
for abbr, jp, es, clr in s_labels:
    s_cells.append(Paragraph(
        '<b>{}</b><br/>{}<br/>{}'.format(abbr, jp, es),
        ParagraphStyle('SLabel', fontName=FONT_SANS_BOLD, fontSize=10, leading=14,
                       alignment=TA_CENTER, textColor=clr)
    ))
s_table = Table([s_cells], colWidths=[AVAILABLE_W / 5] * 5, hAlign='CENTER')
s_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LINEAFTER', (0, 0), (-2, 0), 0.5, colors.HexColor('#d1d5db')),
]))
story.append(s_table)

story.append(Spacer(1, 40))
story.append(HRFlowable(width='30%', thickness=1, color=TEXT_MUTED, spaceAfter=16, spaceBefore=0, hAlign='CENTER'))
story.append(Paragraph('Guia completa para la implementacion de la metodologia 5S', ParagraphStyle(
    'CoverDesc', fontName=FONT_BODY, fontSize=12, leading=18,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=8
)))
story.append(Paragraph('Version 3.0 - Mayo 2026', ParagraphStyle(
    'CoverVer', fontName=FONT_SANS, fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=TEXT_MUTED
)))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════════════════

story.append(Paragraph('<b>Indice de Contenidos</b>', style_toc_title))
story.append(Spacer12())

toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName=FONT_SANS_BOLD, fontSize=12, leading=20,
                   leftIndent=10, textColor=ACCENT),
    ParagraphStyle('TOC2', fontName=FONT_SANS, fontSize=10.5, leading=18,
                   leftIndent=30, textColor=TEXT_PRIMARY),
    ParagraphStyle('TOC3', fontName=FONT_BODY, fontSize=9.5, leading=16,
                   leftIndent=50, textColor=TEXT_MUTED),
]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: INTRODUCCION
# ═══════════════════════════════════════════════════════════════════════════

story.append(add_heading('<b>1. Introduccion</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'La metodologia 5S es un sistema de organizacion del lugar de trabajo originario de Japon que '
    'consta de cinco principios fundamentales: Seiri (Clasificar), Seiton (Ordenar), Seiso (Limpiar), '
    'Seiketsu (Estandarizar) y Shitsuke (Mantener). Su objetivo es crear un entorno de trabajo limpio, '
    'ordenado y seguro que mejore la productividad, reduzca los tiempos de busqueda y minimice los errores.'
))
story.append(Body(
    'Esta aplicacion web ha sido disenada para facilitar la implementacion y seguimiento de la metodologia 5S '
    'en cualquier tipo de organizacion. Permite gestionar multiples empresas, proyectos y zonas de trabajo, '
    'asignar responsabilidades a diferentes perfiles de usuario, documentar el progreso con fotografias e '
    'inventarios, realizar autoevaluaciones y auditorias externas, y llevar un control exhaustivo de las '
    'acciones correctivas derivadas de las desviaciones detectadas.'
))
story.append(Body(
    'El manual que tiene en sus manos le guiara paso a paso por todas las funcionalidades de la aplicacion, '
    'desde el registro de usuarios y la configuracion inicial de la estructura organizativa, hasta la '
    'realizacion de auditorias trimestrales y el seguimiento de planes de accion. Ya sea usted un empleado '
    'que realiza su primer taller 5S, un responsable que coordina un proyecto, o un gerente que supervisa '
    'toda una empresa, este manual le proporcionara las instrucciones necesarias para sacar el maximo '
    'provecho de la herramienta.'
))

story.append(Spacer12())
story.append(add_heading('<b>1.1 Que es la metodologia 5S</b>', style_h2, level=1))
story.append(Spacer6())

steps_data = [
    ['1S - Seiri', 'Clasificar', 'Separar los elementos necesarios de los innecesarios y eliminar estos ultimos. Se realiza un inventario de innecesarios para tomar decisiones sobre su destino.'],
    ['2S - Seiton', 'Ordenar', 'Organizar los elementos necesarios de manera que sean faciles de encontrar, usar y devolver. Cada objeto debe tener una ubicacion asignada y senalizada.'],
    ['3S - Seiso', 'Limpiar', 'Limpiar el lugar de trabajo identificando y eliminando las fuentes de suciedad. La limpieza es inspeccion: al limpiar se detectan anomalias.'],
    ['4S - Seiketsu', 'Estandarizar', 'Crear estandares y normas que mantengan los logros de las 3S anteriores. Lo que no esta estandarizado tiende a deteriorarse.'],
    ['5S - Shitsuke', 'Mantener', 'Crear el habito de respetar los estandares establecidos mediante disciplina y compromiso. Es el paso mas dificil y el mas importante.'],
]
story.append(make_table(
    ['Paso', 'Espanol', 'Descripcion'],
    steps_data,
    col_ratios=[0.15, 0.12, 0.73]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 1. Las cinco S de la metodologia', style_caption))

story.append(Spacer18())
story.append(add_heading('<b>1.2 Flujo de trabajo por cada S</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Cada una de las cinco S sigue un flujo de trabajo estructurado con cinco mini-pasos que deben '
    'completarse en orden secuencial. Este flujo garantiza que los usuarios sigan una metodologia '
    'rigurosa y documentada en cada etapa del proceso. Los cinco mini-pasos son los siguientes:'
))

mini_steps_data = [
    ['1', 'Formacion + Examen', 'El empleado completa la formacion especifica de la S y aprueba un examen con una puntuacion minima del 80%.'],
    ['2', 'Fotografias (Antes)', 'Se toman fotografias del estado actual de la zona antes de actuar, para documentar la situacion de partida.'],
    ['3', 'Inventario', 'Se realiza el inventario correspondiente a cada S: innecesarios (1S), necesarios (2S), puntos de suciedad (3S), estandares (4S), o plan de accion (5S).'],
    ['4', 'Autoevaluacion (Interna)', 'Verificacion interna mediante el checklist de auditoria. La realizan los EMPLEADOS de la zona como ejercicio de reflexion sobre el cumplimiento de los criterios 5S.'],
    ['5', 'Auditoria Externa', 'Validacion por un auditor externo que verifica el cumplimiento de los criterios 5S mediante el mismo checklist estandarizado.'],
]
story.append(make_table(
    ['Paso', 'Nombre', 'Descripcion'],
    mini_steps_data,
    col_ratios=[0.06, 0.20, 0.74]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 2. Los cinco mini-pasos de cada S', style_caption))

story.append(Spacer18())
story.append(add_heading('<b>1.3 Progresion entre pasos: zonas con multiples empleados</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'En muchas organizaciones, una misma zona de trabajo puede tener varios empleados asignados. '
    'Esto plantea una cuestion fundamental: como se gestiona la progresion de la zona cuando '
    'varias personas deben completar los mismos pasos? La respuesta depende del tipo de mini-paso:'
))

story.append(Spacer6())
story.append(H3('Pasos individuales (requieren que TODOS los empleados los completen):'))
story.append(Bullet('<b>Formacion + Examen (paso 1):</b> Cada empleado debe completar la formacion y aprobar '
                     'el examen individualmente. La zona no puede avanzar al paso 2 (Fotografias) hasta que '
                     '<b>todos los empleados asignados</b> hayan aprobado el examen.'))
story.append(Spacer6())
story.append(H3('Pasos colectivos (se realizan una vez por zona):'))
story.append(Bullet('<b>Fotografias (paso 2):</b> Se toman como equipo para documentar el estado de la zona. '
                     'Cualquier empleado puede subir las fotografias.'))
story.append(Bullet('<b>Inventario (paso 3):</b> Se realiza un inventario compartido de la zona. Todos los '
                     'empleados pueden anadir items al inventario, pero el inventario es unico para la zona.'))
story.append(Bullet('<b>Autoevaluacion (paso 4):</b> La realizan los EMPLEADOS de la zona. Cada empleado '
                     'evalua el cumplimiento de los criterios 5S mediante el checklist estandarizado. '
                     'Es un ejercicio de reflexion interna que prepara a la zona para la auditoria externa.'))
story.append(Bullet('<b>Auditoria Externa (paso 5):</b> Solo puede realizarla un usuario con rol de auditor. '
                     'La auditoria evalua la zona completa, no a cada empleado individualmente.'))
story.append(Spacer6())
story.append(Note(
    'Regla clave: Para que una zona avance de una S a la siguiente (por ejemplo, de 1S a 2S), '
    'todos los empleados de la zona deben haber completado el paso individual (formacion), '
    'y los pasos colectivos (fotos, inventario, autoevaluacion por los empleados y auditoria) '
    'deben estar completados y aprobados. Si hay dos empleados en una zona, AMBOS deben pasar '
    'la formacion antes de poder acceder al paso 2, y asi sucesivamente para cada S.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: ESTRUCTURA ORGANIZATIVA
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>2. Estructura Organizativa</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'La aplicacion organiza la informacion siguiendo una jerarquia de cuatro niveles: Empresa, Proyecto, '
    'Zona y Empleado. Esta estructura refleja la realidad de la mayoria de las organizaciones, donde una '
    'empresa puede tener multiples proyectos de implementacion 5S, cada proyecto puede abarcar varias zonas '
    'de trabajo, y cada zona puede tener uno o varios empleados asignados. Comprender esta jerarquia es '
    'esencial para configurar correctamente la aplicacion y asignar los roles apropiados a cada usuario.'
))

story.append(Spacer12())
story.append(add_heading('<b>2.1 Jerarquia: Empresa, Proyecto, Zona, Empleado</b>', style_h2, level=1))
story.append(Spacer6())

hier_data = [
    ['Empresa', 'La organizacion o compania que implementa la metodologia 5S. Una empresa puede tener multiples proyectos 5S activos simultaneamente.'],
    ['Proyecto', 'Un proyecto de implementacion 5S dentro de una empresa. Cada proyecto tiene sus propias zonas, progreso y equipo asignado. Un proyecto puede corresponder a una planta, un departamento o una linea de produccion.'],
    ['Zona', 'Un area de trabajo especifica dentro de un proyecto. Cada zona tiene su propio tablero 5S, inventarios, fotografias, auditorias y plan de accion. Una zona puede tener multiples empleados asignados.'],
    ['Empleado', 'Un trabajador asignado a una o varias zonas. Los empleados son quienes ejecutan los talleres 5S, completan los pasos y realizan las actividades de mejora continua.'],
]
story.append(make_table(
    ['Nivel', 'Descripcion'],
    hier_data,
    col_ratios=[0.15, 0.85]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 3. Niveles de la jerarquia organizativa', style_caption))

story.append(Spacer18())
story.append(add_heading('<b>2.2 Roles y permisos</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La aplicacion define cinco roles de usuario, cada uno con permisos y responsabilidades especificas. '
    'Los roles estan disenados para reflejar la estructura organizativa y garantizar que cada persona '
    'acceda solo a la informacion y funciones que le corresponden. Es fundamental entender que el '
    'Administrador es el dueno de la aplicacion: es quien primero crea la estructura organizativa '
    '(empresas, proyectos y zonas) y despues crea los usuarios y les asigna roles para los proyectos '
    'creados. Este orden es clave: sin empresa, proyecto y zona no se pueden asignar usuarios. El '
    'auto-registro siempre crea cuentas de empleado que despues deben ser asignadas a proyectos y '
    'zonas por un administrador o responsable.'
))

roles_data = [
    ['Administrador (Dueno)', 'Empresa completa', 'Dueno de la aplicacion. PRIMERO crea la estructura (empresas, proyectos y zonas), LUEGO crea usuarios y les asigna roles para los proyectos creados. Acceso total a todas las funciones.'],
    ['Gerente', 'Empresa completa', 'Supervisa todos los proyectos de su empresa. Ve el progreso global, inventarios y planes de accion de todos los proyectos. No ejecuta pasos 5S.'],
    ['Responsable', 'Sus proyectos', 'Coordina uno o varios proyectos. Gestiona zonas, asigna empleados y hace seguimiento del progreso. No puede realizar auditorias externas.'],
    ['Auditor', 'Zonas asignadas', 'Realiza auditorias externas en las zonas que le corresponden. Evalua el cumplimiento de los criterios 5S con el checklist estandarizado.'],
    ['Empleado', 'Sus zonas', 'Ejecuta los talleres 5S: completa formacion, sube fotos, registra inventarios, realiza autoevaluaciones internas (paso 4) y ejecuta acciones de mejora.'],
]
story.append(make_table(
    ['Rol', 'Alcance', 'Funciones principales'],
    roles_data,
    col_ratios=[0.14, 0.14, 0.72]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 4. Roles y permisos de la aplicacion', style_caption))

story.append(Spacer18())
story.append(add_heading('<b>2.3 Asignacion de roles a la jerarquia</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La asignacion de roles sigue la estructura organizativa de manera natural. Cada nivel de la jerarquia '
    'tiene uno o varios responsables que supervisan el nivel inferior. Es importante entender que un mismo '
    'usuario no necesita tener un unico rol: en organizaciones pequenas, una persona puede asumir multiples '
    'funciones. Sin embargo, la aplicacion respeta estrictamente los permisos de cada rol, de modo que un '
    'responsable, por ejemplo, no puede realizar auditorias externas aunque coordine un proyecto.'
))

story.append(Bullet('<b>Gerente -> Empresa:</b> Se asigna un gerente a una empresa. Este gerente podra ver '
                     'todos los proyectos, zonas y planes de accion de dicha empresa. Un gerente puede '
                     'estar asignado a varias empresas si la organizacion lo requiere.'))
story.append(Bullet('<b>Responsable -> Proyecto:</b> Se asigna un responsable a uno o varios proyectos. '
                     'Dentro de sus proyectos, el responsable puede crear zonas, asignar empleados y '
                     'hacer seguimiento del progreso, pero no puede realizar auditorias externas.'))
story.append(Bullet('<b>Empleados -> Zonas:</b> Los empleados se asignan a zonas especificas dentro de un '
                     'proyecto. Una zona puede tener multiples empleados, y un empleado puede estar asignado '
                     'a varias zonas. La asignacion la realiza el responsable del proyecto o el administrador.'))
story.append(Bullet('<b>Auditor -> Zonas:</b> Los auditores se asignan para evaluar zonas especificas. '
                     'Un auditor puede auditar zonas de diferentes proyectos, siempre que le hayan sido '
                     'asignadas. Solo el rol de auditor puede realizar auditorias externas (paso 5).'))

story.append(Spacer12())
story.append(add_heading('<b>2.4 Zonas con multiples empleados</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Una de las caracteristicas mas importantes de la aplicacion es su capacidad para gestionar zonas '
    'donde trabajan varios empleados simultaneamente. En la practica, la mayoria de las zonas de trabajo '
    'compartidas tendran entre dos y diez empleados, y todos ellos deben participar activamente en la '
    'implementacion de la metodologia 5S. La aplicacion gestiona esta complejidad diferenciando entre '
    'pasos individuales y pasos colectivos, tal como se explico en la seccion 1.3.'
))
story.append(Body(
    'Cuando un empleado accede al tablero 5S de su zona, vera su propio progreso en el paso individual '
    '(formacion) y el progreso colectivo de la zona en los pasos compartidos (fotos, '
    'inventario, autoevaluacion por los empleados y auditoria). Si alguno de sus companeros de zona aun '
    'no ha completado el paso individual de formacion, se le indicara visualmente que la zona no puede '
    'avanzar hasta que todos lo hayan completado. La autoevaluacion (paso 4) la realizan los '
    'empleados de la zona, lo que fomenta el trabajo en equipo y la corresponsabilidad, principios '
    'fundamentales de la metodologia 5S.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: ESQUEMA DEL SISTEMA
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>3. Esquema del Sistema</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'Para comprender la aplicacion en su conjunto, es fundamental tener una vision clara de como se '
    'articulan sus diferentes capas: desde los usuarios que acceden, pasando por la interfaz de navegacion, '
    'las ventanas emergentes, la API REST y la base de datos. El siguiente esquema muestra la arquitectura '
    'completa del sistema en cinco capas, lo que permite identificar rapidamente quien hace que, donde se '
    'procesa la informacion y como fluyen los datos a traves de la aplicacion. Este esquema es el punto de '
    'partida para cualquier persona que necesite entender el funcionamiento general antes de profundizar en '
    'cada seccion del manual.'
))

story.append(Spacer12())
story.append(add_heading('<b>3.1 Vision general por capas</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'El sistema se estructura en cinco capas diferenciadas, cada una con una funcion especifica. De arriba '
    'abajo, la informacion fluye desde los usuarios hacia la base de datos, y las respuestas vuelven de forma '
    'inversa. A continuacion se describe cada capa y sus componentes principales:'
))

# --- Layer 1: Users ---
story.append(H3('Capa 1 - Usuarios / Roles'))
story.append(Body(
    'La capa superior la conforman los cinco roles de usuario que interactuan con la aplicacion. Cada rol '
    'tiene un alcance y unas capacidades diferenciadas que determinan que funciones puede utilizar y que '
    'datos puede acceder. El Administrador es el dueno de la aplicacion y tiene control total sobre el '
    'sistema: es quien PRIMERO crea la estructura (empresas, proyectos y zonas) y LUEGO crea usuarios y '
    'les asigna roles para los proyectos creados. Ademas puede navegar libremente entre pasos sin '
    'restricciones. El Gerente supervisa a nivel de empresa, viendo estadisticas globales, inventarios y '
    'planes de accion de todos los proyectos, pero no ejecuta pasos 5S ni realiza auditorias. El '
    'Responsable coordina uno o varios proyectos, gestiona zonas y asigna empleados, pero tampoco puede '
    'realizar auditorias externas. El Empleado es quien ejecuta los talleres 5S: completa formacion, sube '
    'fotos, registra inventarios, realiza autoevaluaciones internas (paso 4) y ejecuta acciones de mejora. Finalmente, el '
    'Auditor tiene como unica funcion realizar auditorias externas en las zonas que le han sido asignadas, '
    'evaluando el cumplimiento de los criterios 5S con el checklist estandarizado.'
))

# --- Layer 2: App ---
story.append(H3('Capa 2 - Aplicacion (Pantalla Unica)'))
story.append(Body(
    'La aplicacion funciona en una sola pantalla organizada mediante pestañas, lo que elimina la necesidad '
    'de navegar entre paginas distintas. Las cuatro pestañas principales son: Tablero 5S (accesible para '
    'todos los roles, contiene el diagrama circular y el grid de 5 pasos S por 5 mini-pasos), Gerencia '
    '(visible para administrador y gerente, con estadisticas globales, inventario cruzado y plan de accion), '
    'Admin (solo para administrador, con gestion de usuarios, empresas, proyectos, permisos y reseed de la '
    'base de datos), y Mejora Continua (que se desbloquea tras completar las 5S, con auditorias periodicas, '
    'seguimiento y radar chart). Adicionalmente, la barra superior siempre visible ofrece accesos rapidos '
    'al Plan de Accion, Inventario Global, Auditorias, selector de zona, toggle de navegacion libre para '
    'admin, gestion de equipo, permisos y descarga del manual.'
))

# --- Layer 3: Modals ---
story.append(H3('Capa 3 - Ventanas Emergentes (Modales)'))
story.append(Body(
    'Al pulsar sobre cada celda del grid 5S, se abre una ventana modal especifica para ese mini-paso. '
    'Existen seis modales principales: FormacionModal (formacion + examen, minimo 80% para aprobar), '
    'FotosModal (captura de camara y subida de galeria, minimo 3 fotos), InventarioModal (formulario '
    'especifico por S con CRUD de items, import/export CSV y plantillas Excel; en S1 incluye la Jaula de '
    'Excedentes), ActionPlanModal (plan de accion con secciones DEMANDA, ACCION y SEGUIMIENTO, accesible '
    'desde S5 o globalmente), AutoevaluacionModal (checklist interno OK/NOK/NA, minimo 70%, SOLO puede '
    'realizarlo los EMPLEADOS de la zona como verificacion interna), y '
    'AuditoriaModal (auditoria externa, solo para admin y auditor, minimo 75%, donde los NOKs generan '
    'acciones automaticamente).'
))

# --- Layer 4: API ---
story.append(H3('Capa 4 - API REST'))
story.append(Body(
    'Los modales se comunican con el servidor a traves de una API REST con mas de 25 endpoints organizados '
    'en: autenticacion (login, registro, sesion), proyectos y zonas (CRUD), inventario (CRUD de items), '
    'acciones (CRUD de items del plan de accion), auditorias (guardar y recuperar resultados), progreso '
    '(actualizar estado de pasos), examenes (enviar respuestas), estadisticas (dashboard), plantillas '
    '(formacion e inventario), permisos (matriz de roles), usuarios y empresas (CRUD), y endpoints '
    'especificos para gerencia (estadisticas, acciones e inventario global).'
))

# --- Layer 5: DB ---
story.append(H3('Capa 5 - Base de Datos (SQLite via Prisma)'))
story.append(Body(
    'En la capa inferior, Prisma ORM gestiona la base de datos SQLite (archivo custom.db) con 14 tablas '
    'principales: User (usuarios con email, rol y contrasena), Company (empresas), Project (proyectos 5S), '
    'Zone (zonas de trabajo), Progress (progreso colectivo por zona), EmployeeProgress (progreso individual '
    'por empleado), InventoryItem (items de inventario con campos especificos por S y datos de Jaula), '
    'AuditResult (resultados de auditorias), ChecklistResponse (respuestas detalladas de checklist), '
    'ActionItem (acciones con campos DEMANDA/ACCION/SEGUIMIENTO), AuditTarget (puntuaciones objetivo), '
    'Template (plantillas de formacion y examen), ExamAnswer (respuestas de examenes) y '
    'RolePermissionConfig (matriz de permisos por rol).'
))

# --- Schema image ---
story.append(Spacer18())
story.append(add_heading('<b>3.2 Esquema visual del sistema</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'A continuacion se presenta el esquema visual completo del sistema, donde se pueden identificar las '
    'cinco capas y como se relacionan entre si. Este diagrama resume la arquitectura completa de la '
    'aplicacion y sirve como referencia rapida para entender el flujo de informacion.'
))

# Embed the schema image
from reportlab.platypus import Image as RLImage
_schema_path = '/home/z/my-project/download/esquema-sistema-5s.png'
if os.path.exists(_schema_path):
    from PIL import Image as PILImage
    _pil = PILImage.open(_schema_path)
    _img_w, _img_h = _pil.size
    _pil.close()
    # Scale to fit page width
    _target_w = AVAILABLE_W
    _scale = _target_w / _img_w
    _target_h = _img_h * _scale
    # Cap height at ~500px to avoid spanning too many pages
    if _target_h > 500:
        _scale2 = 500 / _target_h
        _target_w = _target_w * _scale2
        _target_h = 500
    story.append(Spacer12())
    story.append(RLImage(_schema_path, width=_target_w, height=_target_h))
    story.append(Paragraph('Figura 1. Esquema del Sistema 5S - Arquitectura por capas', style_caption))
else:
    story.append(Note(
        'Nota: El esquema visual del sistema no esta disponible en esta generacion del manual. '
        'Puede consultarse en la aplicacion mediante el boton de descarga del manual.'
    ))

# --- Execution flow ---
story.append(Spacer18())
story.append(add_heading('<b>3.3 Como se ejecuta la aplicacion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'El proceso de puesta en marcha de la aplicacion sigue un flujo secuencial de cinco pasos. En primer '
    'lugar, se compila el proyecto con el comando "npm run build", que genera los archivos optimizados en '
    'el directorio .next/standalone/. A continuacion, se inicia el servidor mediante "pm2 start npm --name '
    '5s-app -- start" o bien "npm start", lo que arranca Next.js en modo produccion en el puerto 3000. '
    'En tercer lugar, Prisma ORM inicializa automaticamente la conexion con la base de datos SQLite, '
    'verificando que el archivo custom.db existe y aplicando las migraciones pendientes si las hubiera. '
    'En cuarto lugar, los 25+ endpoints de la API REST quedan disponibles para recibir peticiones. '
    'Finalmente, los usuarios pueden acceder a la aplicacion abriendo un navegador y navegando a '
    'http://localhost:3000, donde seran recibidos por la pantalla de inicio de sesion.'
))

exec_flow_data = [
    ['1', 'Compilar', 'npm run build', 'Genera los archivos optimizados de produccion en .next/standalone/'],
    ['2', 'Iniciar servidor', 'pm2 start npm --name "5s-app" -- start', 'Arranca Next.js en modo produccion (puerto 3000)'],
    ['3', 'Base de datos', 'Automatico (Prisma)', 'Inicializa SQLite (custom.db) y aplica migraciones'],
    ['4', 'API REST', 'Automatico', 'Los 25+ endpoints quedan disponibles para peticiones'],
    ['5', 'Acceso', 'http://localhost:3000', 'Los usuarios acceden via navegador a la pantalla de login'],
]
story.append(make_table(
    ['Paso', 'Accion', 'Comando/Metodo', 'Resultado'],
    exec_flow_data,
    col_ratios=[0.05, 0.15, 0.35, 0.45]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 5. Pasos de ejecucion de la aplicacion', style_caption))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: PRIMEROS PASOS
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>4. Primeros Pasos</b>', style_h1, level=0))
story.append(Spacer6())

story.append(add_heading('<b>4.1 Registro e inicio de sesion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Para comenzar a utilizar la aplicacion, el primer paso es crear una cuenta de usuario. Desde la '
    'pantalla de inicio, pulse el boton "Crear Cuenta" e introduzca su nombre completo, correo electronico '
    'y una contrasena de al menos 6 caracteres. Al registrarse, su cuenta se creara con el rol de '
    'empleado, que es el rol predeterminado para el auto-registro.'
))
story.append(Body(
    'Si ya tiene una cuenta, simplemente introduzca su correo electronico y contrasena en el formulario '
    'de inicio de sesion y pulse "Iniciar Sesion". La aplicacion le redirigira automaticamente al panel '
    'correspondiente a su rol. Si su cuenta aun no ha sido asignada a ningun proyecto o zona, vera un '
    'mensaje indicandole que debe esperar a que un administrador o responsable complete su asignacion.'
))
story.append(Note(
    'Nota: Solo el administrador puede crear usuarios con roles especificos (gerente, responsable, '
    'auditor). Si necesita un rol diferente al de empleado, solicite al administrador que le cree la '
    'cuenta correspondiente o que actualice su rol.'
))

story.append(Spacer12())
story.append(add_heading('<b>4.2 Configuracion inicial por el administrador</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'El administrador es el dueno de la aplicacion y es responsable de la configuracion inicial de '
    'la plataforma. Es fundamental entender el orden de la configuracion: PRIMERO se crea la estructura '
    'organizativa (empresas, proyectos y zonas), y LUEGO se crean los usuarios y se les asignan roles '
    'para los proyectos ya creados. Sin estructura previa no es posible asignar usuarios. Este flujo '
    'garantiza que cada usuario tenga un contexto de trabajo asignado desde el primer momento en que '
    'accede a la aplicacion. A continuacion se detalla el proceso paso a paso que debe seguir el '
    'administrador para poner en marcha la aplicacion en una organizacion:'
))

story.append(H3('Fase 1: Crear la estructura organizativa'))
story.append(Body(
    'Antes de crear ningun usuario, el administrador debe definir la estructura organizativa completa. '
    'Sin empresa, proyecto y zona, no es posible asignar usuarios ni roles.'
))
story.append(Bullet('<b>Paso 1 - Crear la empresa:</b> Desde el panel de administracion, pulse "Nueva Empresa" '
                     'e introduzca el nombre y la descripcion de la organizacion.'))
story.append(Bullet('<b>Paso 2 - Crear proyectos:</b> Dentro de la empresa, cree los proyectos 5S necesarios. '
                     'Cada proyecto puede representar una planta, un departamento o una linea de produccion.'))
story.append(Bullet('<b>Paso 3 - Definir zonas:</b> En cada proyecto, cree las zonas de trabajo. Asigne un '
                     'responsable de zona y un color identificativo a cada una.'))
story.append(Spacer12())
story.append(H3('Fase 2: Crear usuarios y asignar roles'))
story.append(Body(
    'Una vez creada la estructura organizativa, el administrador procede a crear los usuarios y '
    'asignarles roles dentro de los proyectos y zonas ya definidos. Cada usuario recibe un rol '
    'que determina sus permisos y su alcance dentro de la aplicacion.'
))
story.append(Bullet('<b>Paso 4 - Crear usuarios:</b> Cree las cuentas de usuario con el rol apropiado. '
                     'Asigne los gerentes a las empresas, los responsables a los proyectos y los auditores.'))
story.append(Bullet('<b>Paso 5 - Asignar empleados:</b> Asigne cada empleado a una o varias zonas dentro de '
                     'los proyectos correspondientes. Un empleado solo puede trabajar en las zonas a las que '
                     'ha sido asignado.'))
story.append(Spacer12())
story.append(Note(
    'Importante: El flujo es siempre ESTRUCTURA PRIMERO, USUARIOS DESPUES. El administrador (dueno) '
    'crea la empresa, los proyectos y las zonas, y despues crea los usuarios y les asigna roles para '
    'los proyectos creados. No es posible asignar un usuario a un proyecto que aun no existe.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: EL TABLERO 5S
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>5. El Tablero 5S</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'El tablero 5S es la pantalla principal de la aplicacion y constituye el centro de operaciones '
    'para los empleados. Se representa como un diagrama circular dividido en cinco sectores, cada uno '
    'correspondiente a una de las S de la metodologia. Cada sector contiene cinco puntos que representan '
    'los mini-pasos, y que se van completando segun el usuario avanza en el proceso. El centro del '
    'diagrama muestra los "quesitos" ganados por cada S completada, formando una estrella de cinco puntas '
    'cuando todas las S han sido superadas.'
))

story.append(Spacer12())
story.append(add_heading('<b>5.1 Elementos del tablero</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Bullet('<b>Sectores de color:</b> Cada S tiene un color identificativo: 1S (violeta), 2S (amarillo), '
                     '3S (azul), 4S (rosa) y 5S (naranja). Pulse sobre un sector para acceder al detalle de esa S.'))
story.append(Bullet('<b>Puntos de mini-paso:</b> Dentro de cada sector hay 5 circulos numerados. Un circulo verde '
                     'con marca de verificacion indica un paso completado. Un circulo blanco con borde indica un '
                     'paso disponible. Un circulo gris indica un paso bloqueado (requiere completar el anterior).'))
story.append(Bullet('<b>Quesitos centrales:</b> En el centro del diagrama, cada sector coloreado indica que la S '
                     'correspondiente ha sido completada (auditoria aprobada). Los sectores grises indican S pendientes.'))
story.append(Bullet('<b>Indicadores de progreso:</b> En la parte superior del tablero se muestran tres KPIs: '
                     'puntuacion media, S completadas y acciones abiertas.'))

story.append(Spacer12())
story.append(add_heading('<b>5.2 Navegacion por los pasos</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La navegacion por los mini-pasos de cada S es estrictamente secuencial. Para desbloquear un paso, '
    'es necesario haber completado el anterior. Por ejemplo, no se pueden subir fotografias (paso 2) '
    'sin haber aprobado antes el examen de formacion (paso 1). Al pulsar sobre un sector del tablero, '
    'se abre el detalle de esa S, donde se muestra informacion sobre cada mini-paso y los botones '
    'para completarlos. Los pasos disponibles se muestran con un borde resaltado y pueden ejecutarse '
    'pulsando sobre ellos; los pasos completados muestran la puntuacion obtenida y la fecha de finalizacion; '
    'y los pasos bloqueados aparecen atenuados y no son accesibles hasta que se cumplan los requisitos previos.'
))

story.append(Note(
    'Nota: En zonas con multiples empleados, el paso individual de formacion se '
    'muestran con el progreso de cada empleado. El paso no se considera completado para la zona hasta '
    'que todos los empleados asignados lo hayan superado.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: LAS 5S EN DETALLE
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>6. Las 5S en Detalle</b>', style_h1, level=0))
story.append(Spacer6())

# --- 1S ---
story.append(add_heading('<b>6.1 1S - Seiri (Clasificar)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La primera S se centra en clasificar y separar los elementos necesarios de los innecesarios en el '
    'lugar de trabajo. El objetivo es eliminar todo aquello que no es util para el trabajo diario, '
    'creando un entorno mas despejado y eficiente. Esta es la base de toda la metodologia: sin una '
    'clasificacion rigurosa, no es posible organizar correctamente en los pasos posteriores.'
))
story.append(H3('Inventario de Innecesarios'))
story.append(Body(
    'El inventario de la 1S es especifico para registrar elementos innecesarios. Cada item se clasifica '
    'en una de tres categorias: Innecesario (elemento que no se usa y debe eliminarse), Dudoso (elemento '
    'cuya utilidad esta en duda y requiere revision) o Necesario (elemento que se usa y debe conservarse). '
    'Ademas, para cada item se registra el estado fisico (Bueno, Regular, Malo), la frecuencia de uso '
    '(Diario, Semanal, Mensual, etc.) y la decision tomada (Eliminar, Reubicar, Jaula, Donar, Vender).'
))
story.append(H3('Jaula de Excedentes'))
story.append(Body(
    'Los items marcados con decision "Jaula" se incorporan automaticamente a la Jaula de Excedentes, '
    'que es un espacio temporal donde los elementos innecesarios se almacenan antes de su destino final. '
    'La Jaula permite que otras zonas o departamentos reclamen elementos que para una zona son innecesarios '
    'pero que para otra pueden ser utiles. Cada item en la Jaula tiene un seguimiento de estado: en_jaula '
    '(disponible), reclamado (alguien lo ha solicitado), o transferido (se ha movido a su nuevo destino). '
    'Tambien se registran las fechas de entrada y salida, el area de origen y el area de destino.'
))

# --- 2S ---
story.append(Spacer18())
story.append(add_heading('<b>6.2 2S - Seiton (Ordenar)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La segunda S consiste en organizar los elementos necesarios de manera que sean faciles de encontrar, '
    'usar y devolver. Cada objeto debe tener una ubicacion asignada y senalizada, de forma que cualquiera '
    'pueda localizarlo rapidamente y detectar cuando falta. La 2S se basa en el principio de que un '
    'lugar para cada cosa y cada cosa en su lugar, lo que reduce drasticamente los tiempos de busqueda '
    'y los errores de ubicacion.'
))
story.append(H3('Inventario de Necesarios'))
story.append(Body(
    'A diferencia de la 1S que registra innecesarios, el inventario de la 2S se centra en los elementos '
    'necesarios y su organizacion. Cada item se clasifica por su frecuencia de uso: Muy frecuente '
    '(acceso constante, debe estar al alcance de la mano), Frecuente (uso regular, cerca del puesto), '
    'Ocasional (uso periodico, puede estar mas alejado) o Raro (uso esporadico, almacenamiento mas '
    'lejano). Para cada elemento necesario se registra la ubicacion asignada, el metodo de identificacion '
    '(etiqueta, codigo de color, sombra/contorno, codigo numerico, etc.) y la cercania al puesto de trabajo.'
))
story.append(Note(
    'Importante: El inventario de la 1S (innecesarios) y el de la 2S (necesarios) son inventarios '
    'separados. Esta separacion es intencionada pedagogicamente: primero se aprende a identificar lo '
    'que sobra (1S), y despues se aprende a organizar lo que queda (2S). No se mezclan ambos inventarios.'
))

# --- 3S ---
story.append(Spacer18())
story.append(add_heading('<b>6.3 3S - Seiso (Limpiar)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La tercera S se centra en la limpieza del lugar de trabajo, pero va mas alla de la simple limpieza: '
    'se trata de identificar y eliminar las fuentes de suciedad. El principio fundamental es que "limpiar '
    'es inspeccionar": al limpiar una maquina o una superficie, el trabajador detecta anomalias, fugas, '
    'desgastes y otros problemas que de otro modo pasarian desapercibidos. La 3S convierte la limpieza '
    'en una actividad de mantenimiento preventivo.'
))
story.append(H3('Inventario de Puntos de Suciedad'))
story.append(Body(
    'El inventario de la 3S registra los puntos de suciedad detectados en la zona. Cada punto se clasifica '
    'por tipo: Polvo, Grasa, Mancha, Residuos, Humedad, Oxidacion u Otro. Para cada punto se indica el '
    'nivel de gravedad (Leve, Moderado, Grave), la fuente de suciedad (proceso productivo, medio ambiente, '
    'falta de limpieza, escape/fuga, desgaste, derrame), el metodo de limpieza recomendado (aspirado, '
    'fregado, pulido, desinfeccion, reparacion) y la frecuencia de limpieza necesaria.'
))

# --- 4S ---
story.append(Spacer18())
story.append(add_heading('<b>6.4 4S - Seiketsu (Estandarizar)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La cuarta S tiene como objetivo crear estandares y normas que mantengan los logros alcanzados con '
    'las tres S anteriores. Sin estandarizacion, es inevitable que el lugar de trabajo vuelva a su estado '
    'anterior: lo que no esta definido y documentado tiende a deteriorarse con el tiempo. La 4S convierte '
    'las mejores practicas identificadas en normas visuales y procedimientos que cualquiera puede seguir '
    'y verificar.'
))
story.append(H3('Inventario de Estandares'))
story.append(Body(
    'El inventario de la 4S registra los estandares implantados en la zona. Cada estandar se clasifica '
    'por tipo: Visual (senalizacion, marcado), Procedimiento (instrucciones de trabajo), Checklist '
    '(listas de verificacion), Senalizacion (carteles, indicadores), Diagrama de flujo, Registro '
    '(formularios, hojas de seguimiento) u Otro. Para cada estandar se registra el estado de implantacion '
    '(Implantado, En proceso, Pendiente), si esta documentado (Si, No, Parcialmente), el porcentaje de '
    'cumplimiento y la fecha de la ultima revision.'
))
story.append(H3('Biblioteca de Estandares'))
story.append(Body(
    'Dentro del inventario de la 4S existe una Biblioteca de Estandares que centraliza los estandares '
    'corporativos aplicables a todas las zonas. La biblioteca facilita la replicacion de buenas '
    'practicas entre zonas y proyectos, evitando que cada zona tenga que crear sus propios estandares '
    'desde cero. Los estandares de la biblioteca pueden copiarse y adaptarse a las necesidades '
    'especificas de cada zona.'
))

# --- 5S ---
story.append(Spacer18())
story.append(add_heading('<b>6.5 5S - Shitsuke (Mantener)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La quinta y ultima S es la mas dificil y la mas importante: crear el habito de respetar los '
    'estandares establecidos mediante disciplina y compromiso. Sin disciplina, todo el trabajo '
    'realizado en las cuatro S anteriores se pierde. La 5S se sostiene sobre tres pilares: las '
    'auditorias periodicas (semanales, mensuales y trimestrales), la gestion sistematica de anomalias '
    'y el plan de accion de mejora continua.'
))
story.append(H3('Plan de Accion'))
story.append(Body(
    'El inventario de la 5S consiste en el Plan de Accion, donde se definen las acciones necesarias '
    'para mantener la disciplina y la mejora continua. Cada accion tiene un responsable, una prioridad '
    '(Alta, Media, Baja), un estado (Abierta, En Proceso, Resuelta, Cerrada) y una fecha limite. '
    'Las acciones pueden provenir de autoevaluaciones, auditorias externas o del propio plan de accion. '
    'El plan de accion es visible para diferentes roles segun su alcance: el gerente ve todos los planes '
    'de accion de todos los proyectos de su empresa; el responsable ve los planes de accion de sus '
    'proyectos asignados; y el empleado ve solo las acciones de sus zonas.'
))
story.append(H3('Inventario de Practicas de Disciplina'))
story.append(Body(
    'Ademas del plan de accion, la 5S incluye un inventario de practicas de disciplina observadas. '
    'Cada practica se clasifica como Cumplida, Parcial o Incumplida, y se registra la practica o habito '
    'especifico, el responsable y la frecuencia de seguimiento (Diaria, Semanal, Mensual). Este '
    'inventario permite identificar patrones de incumplimiento y tomar medidas correctivas.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: FORMACION Y EXAMENES
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>7. Formacion y Examenes</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'La formacion es el primer paso de cada S y tiene caracter individual: cada empleado debe completarla '
    'y aprobar el examen correspondiente antes de poder avanzar a los pasos siguientes. La formacion '
    'consiste en material didactico especifico para cada S (presentaciones, imagenes y explicaciones) '
    'seguido de un examen de evaluacion de conocimientos. La puntuacion minima para aprobar es del 80%, '
    'lo que garantiza que el empleado ha comprendido los conceptos fundamentales antes de pasar a la '
    'practica. Si un empleado no alcanza el 80%, puede repetir el examen las veces que necesite.'
))

story.append(Spacer12())
story.append(add_heading('<b>7.1 Contenido formativo</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Cada S dispone de material formativo propio que cubre los conceptos teoricos, las tecnicas de '
    'aplicacion practica y los criterios de evaluacion. El contenido se presenta en formato visual '
    'con imagenes y diagramas que facilitan la comprension. Al acceder al paso de formacion, el empleado '
    'puede navegar por las paginas del material a su propio ritmo. Es importante leer y comprender todo '
    'el contenido antes de presentarse al examen, ya que las preguntas se basan en el material mostrado.'
))

story.append(Spacer12())
story.append(add_heading('<b>7.2 El examen de evaluacion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Al finalizar la revision del material formativo, el empleado puede acceder al examen. El examen '
    'consta de preguntas de opcion multiple sobre los contenidos de la formacion. Cada pregunta tiene '
    'una unica respuesta correcta, y la puntuacion se calcula como el porcentaje de respuestas correctas '
    'sobre el total de preguntas. Para aprobar, es necesario obtener al menos un 80% de aciertos. '
    'Tras completar el examen, la aplicacion muestra la puntuacion obtenida y, si ha aprobado, marca '
    'automaticamente el paso de formacion como completado. Si no aprueba, podra revisar el material '
    'y volver a intentarlo sin limite de intentos.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: FOTOGRAFIAS
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>8. Documentacion Fotografica</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'La documentacion fotografica es un paso esencial en cada S. Las fotografias del estado "antes" '
    'permiten registrar la situacion de partida de la zona antes de actuar, lo que resulta fundamental '
    'para valorar la mejora alcanzada y para servir como evidencia en las auditorias. Se requiere un '
    'minimo de 3 fotografias para completar este paso, aunque se recomienda tomar todas las que sean '
    'necesarias para documentar adecuadamente el estado de la zona.'
))
story.append(Body(
    'Las fotografias deben capturar los aspectos relevantes de la S correspondiente. En la 1S, se '
    'fotografiaran los elementos innecesarios; en la 2S, la organizacion actual; en la 3S, los puntos '
    'de suciedad; en la 4S, el estado de los estandares; y en la 5S, el nivel de cumplimiento. '
    'Cualquier empleado de la zona puede subir fotografias, ya que es un paso colectivo. Las fotos '
    'se almacenan en la aplicacion y estan disponibles para su consulta durante las autoevaluaciones '
    'y auditorias.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: INVENTARIOS
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>9. Sistema de Inventarios</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'Cada S tiene su propio inventario especifico con categorias y campos adaptados al tipo de elementos '
    'que se deben registrar. Los inventarios son compartidos por todos los empleados de la zona, lo que '
    'significa que cualquier empleado puede anadir, editar o eliminar items. Esta caracteristica fomenta '
    'la colaboracion y asegura que el inventario refleje el conocimiento colectivo del equipo. A continuacion '
    'se muestra un resumen de las categorias y campos especificos de cada inventario.'
))

inv_data = [
    ['1S', 'Innecesarios', 'Innecesario, Dudoso, Necesario', 'Estado, Frecuencia uso, Decision'],
    ['2S', 'Necesarios', 'Muy frecuente, Frecuente, Ocasional, Raro', 'Ubicacion asignada, Metodo identificacion, Cercania'],
    ['3S', 'Puntos de Suciedad', 'Polvo, Grasa, Mancha, Residuos, Humedad, Oxidacion', 'Nivel, Fuente, Metodo limpieza, Frecuencia'],
    ['4S', 'Estandares', 'Visual, Procedimiento, Checklist, Senalizacion, Diagrama, Registro', 'Estado, Documentado, Cumplimiento %, Fecha revision'],
    ['5S', 'Disciplina', 'Cumplido, Parcial, Incumplido', 'Practica/Habito, Responsable, Frecuencia'],
]
story.append(make_table(
    ['S', 'Inventario', 'Categorias', 'Campos especificos'],
    inv_data,
    col_ratios=[0.06, 0.16, 0.38, 0.40]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 5. Resumen de inventarios por S', style_caption))

story.append(Spacer12())
story.append(add_heading('<b>9.1 Anadir elementos al inventario</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Para anadir un nuevo elemento al inventario, abra el modal del inventario dentro del paso '
    'correspondiente y pulse el boton "Anadir item". Rellene los campos obligatorios (nombre, categoria, '
    'ubicacion) y los campos especificos de la S. Puede anadir una foto del elemento como evidencia. '
    'Los items se guardan automaticamente en la base de datos y quedan disponibles para todos los '
    'empleados de la zona. Recuerde que los inventarios de 1S y 2S son independientes: en la 1S se '
    'registran innecesarios y en la 2S se registran necesarios. No mezcle ambos tipos de elementos.'
))

story.append(Spacer12())
story.append(add_heading('<b>9.2 Plantillas de exportacion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Cada inventario dispone de una plantilla Excel que puede descargarse desde la aplicacion. Las '
    'plantillas contienen las columnas necesarias para registrar los elementos fuera de linea y luego '
    'importarlos masivamente. Las plantillas disponibles son: S1_Inventario_Innecesarios_Seiri.xlsx, '
    'S2_Inventario_Necesarios_Seiton.xlsx, S3_Inventario_Puntos_Suciedad_Seiso.xlsx, '
    'S4_Inventario_Estandares_Seiketsu.xlsx y S5_Inventario_Disciplina_Shitsuke.xlsx. '
    'Estas plantillas son especialmente utiles para realizar el inventario in situ con un portatil o '
    'tableta y despues cargar los datos en la aplicacion.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: AUTOEVALUACION Y AUDITORIA
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>10. Autoevaluacion y Auditoria</b>', style_h1, level=0))
story.append(Spacer6())

story.append(add_heading('<b>10.1 Autoevaluacion interna (paso 4)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La autoevaluacion es el cuarto paso de cada S y consiste en una verificacion interna del estado de '
    'la zona utilizando el mismo checklist que empleara el auditor externo. La autoevaluacion la realizan '
    'los empleados de la zona de forma completa, como ejercicio de reflexion sobre el grado de cumplimiento '
    'de los criterios 5S. Cada empleado debe completar el checklist evaluando todos los items de su zona. '
    'El checklist esta dividido en secciones tematicas, y cada item puede valorarse como '
    'OK (cumple), NOK (no cumple) o N/A (no aplica). Los items marcados como NOK requieren obligatoriamente '
    'indicar la referencia del hallazgo (desviacion detectada) y los puntos de mejora. Ademas, los NOK '
    'generan automaticamente acciones en el plan de accion.'
))

story.append(Spacer12())
story.append(add_heading('<b>10.2 Auditoria externa (paso 5)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La auditoria externa es el quinto y ultimo paso de cada S. Solo puede ser realizada por un usuario '
    'con el rol de auditor. El auditor utiliza el mismo checklist que la autoevaluacion, pero su '
    'evaluacion tiene caracter oficial y es la que determina si la zona aprueba o no la S correspondiente. '
    'Los roles de responsable y empleado no pueden realizar auditorias externas; esta restriccion garantiza '
    'la objetividad e independencia del proceso de evaluacion. La autoevaluacion (paso 4) la realizan '
    'los empleados, mientras que la auditoria (paso 5) es competencia exclusiva del auditor.'
))
story.append(Body(
    'El resultado de la auditoria se calcula automaticamente a partir de los items del checklist. La '
    'puntuacion maxima del checklist es del 90%, y cada punto a mejorar identificado puede anadir hasta '
    'un 5% adicional (maximo 2 mejoras = +10%), lo que permite alcanzar un 100% si se han identificado '
    'y documentado mejoras proactivas. Para aprobar la S, la zona debe obtener una puntuacion minima '
    'del 75%. Si la puntuacion es inferior, la S no se aprueba y se deberan resolver las acciones '
    'correctivas antes de poder repetir la auditoria.'
))

story.append(Spacer12())
story.append(add_heading('<b>10.3 Tipos de auditoria periodica</b>', style_h2, level=1))
story.append(Spacer6())

audit_types = [
    ['Semanal', 'Solo limpieza (S3)', 'Verificacion rapida del estado de limpieza de la zona. Se realiza cada semana.'],
    ['Mensual', 'Resumida (2 items/seccion)', 'Auditoria abreviada que revisa los 2 primeros items de cada seccion de cada S.'],
    ['Trimestral', 'Completa (todas las S)', 'Auditoria completa que evalua las 5S con todo el checklist. Es la auditoria oficial de certificacion.'],
]
story.append(make_table(
    ['Tipo', 'Alcance', 'Descripcion'],
    audit_types,
    col_ratios=[0.14, 0.22, 0.64]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 6. Tipos de auditorias periodicas', style_caption))

story.append(Spacer12())
story.append(add_heading('<b>10.4 Checklist de auditoria por S</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Cada S tiene su propio checklist de auditoria con secciones e items especificos. Los checklists '
    'estan basados en plantillas profesionales de auditoria 5S y cubren todos los aspectos relevantes '
    'de cada S. A continuacion se presenta un resumen de las secciones evaluadas en cada S:'
))

checklist_data = [
    ['1S', 'Materiales, Maquinas y equipos, Transporte y almacenaje, Mobiliario, Informacion'],
    ['2S', 'Equipos y maquinas, Pasillos y lugares de ubicacion, Senalizacion, Stocks de material'],
    ['3S', 'Maquinas o puestos de trabajo, Entorno de trabajo, Herramientas y equipos, Mantener limpio, Kit de limpieza'],
    ['4S', 'Estandarizacion, Respetar estandares, Inspeccion y mantenimiento, Instrucciones visuales, Indicadores visuales'],
    ['5S', 'Auditorias, Gestion de anomalias, Accion'],
]
story.append(make_table(
    ['S', 'Secciones del checklist'],
    checklist_data,
    col_ratios=[0.08, 0.92]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 7. Secciones del checklist de auditoria por S', style_caption))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 10: PLAN DE ACCION
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>11. Plan de Accion</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'El plan de accion es la herramienta central de la mejora continua en la metodologia 5S. Se nutre '
    'de las desviaciones detectadas tanto en las autoevaluaciones como en las auditorias externas, '
    'convirtiendo cada NOK en una accion concreta que debe ser resuelta. El plan de accion es accesible '
    'desde diferentes puntos de la aplicacion y su visibilidad depende del rol del usuario, tal como '
    'se describe en la seccion de roles y permisos.'
))

story.append(Spacer12())
story.append(add_heading('<b>11.1 Estructura de una accion</b>', style_h2, level=1))
story.append(Spacer6())

action_fields = [
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
]
story.append(make_table(
    ['Campo', 'Descripcion'],
    action_fields,
    col_ratios=[0.22, 0.78]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 8. Campos del plan de accion', style_caption))

story.append(Spacer12())
story.append(add_heading('<b>11.2 Ciclo de vida de una accion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'Las acciones del plan de accion siguen un ciclo de vida con cuatro estados claramente definidos. '
    'El flujo normal es: Abierta (se detecta la desviacion) -> En Proceso (alguien asume la resolucion) '
    '-> Resuelta (la desviacion ha sido corregida) -> Cerrada (se verifica que la solucion es efectiva). '
    'Sin embargo, tambien es posible reabrir una accion cerrada si la solucion no fue efectiva, lo que '
    'la devuelve al estado Abierta para reiniciar el ciclo. Este flujo garantiza que ninguna desviacion '
    'quede sin atencion y que todas las acciones sean verificadas antes de darse por cerradas.'
))

story.append(Spacer12())
story.append(add_heading('<b>11.3 Visibilidad del plan de accion</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La visibilidad del plan de accion esta determinada por el rol del usuario y su posicion en la '
    'jerarquia organizativa. Esta segmentacion garantiza que cada persona vea solo la informacion '
    'relevante para su nivel de responsabilidad, evitando la sobrecarga informativa y protegiendo '
    'la confidencialidad de los datos de otras areas. Los criterios de visibilidad son los siguientes:'
))
story.append(Bullet('<b>Gerente:</b> Ve todos los planes de accion de todos los proyectos de su empresa. '
                     'Tiene una vision global del estado de la mejora continua en toda la organizacion.'))
story.append(Bullet('<b>Responsable:</b> Ve los planes de accion de los proyectos que tiene asignados. '
                     'Puede filtrar por zona dentro de sus proyectos y hacer seguimiento de las acciones.'))
story.append(Bullet('<b>Empleado:</b> Ve solo las acciones de las zonas a las que esta asignado. '
                     'Puede editar y actualizar las acciones que le han sido asignadas como responsable.'))
story.append(Bullet('<b>Auditor:</b> Ve las acciones derivadas de sus auditorias para poder verificar '
                     'que las desviaciones han sido corregidas en revisiones posteriores.'))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 11: SEGUIMIENTO DEL PROGRESO
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>12. Seguimiento del Progreso</b>', style_h1, level=0))
story.append(Spacer6())

story.append(add_heading('<b>12.1 Tabla DATOS y Grafico Radar</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'La aplicacion incluye dos herramientas fundamentales para el seguimiento del progreso de la '
    'implementacion 5S: la tabla DATOS y el grafico radar. La tabla DATOS muestra la puntuacion '
    'obtenida en cada una de las cinco S, permitiendo comparar rapidamente el rendimiento entre las '
    'diferentes etapas de la metodologia. El grafico radar representa visualmente las puntuaciones '
    'como un poligono de cinco vertices, donde un poligono mas amplio indica un mejor cumplimiento '
    'global. Estas herramientas estan disponibles tanto a nivel de zona como a nivel de proyecto y empresa, '
    'lo que permite identificar areas de mejora a diferentes escalas organizativas.'
))

story.append(Spacer12())
story.append(add_heading('<b>12.2 Panel de indicadores (KPIs)</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'En la parte superior del tablero 5S se muestran tres indicadores clave de rendimiento (KPIs) que '
    'proporcionan una vision rapida del estado de la implementacion. El primer KPI muestra la puntuacion '
    'media de las S evaluadas, dando una idea global del nivel de cumplimiento. El segundo KPI indica '
    'cuantas S han sido completadas (auditoria aprobada) sobre el total de cinco. El tercer KPI muestra '
    'el numero de acciones abiertas en el plan de accion, alertando sobre las desviaciones pendientes de '
    'resolucion. Estos tres indicadores permiten a los responsables y gerentes detectar rapidamente '
    'situaciones que requieren atencion sin necesidad de revisar el detalle de cada zona.'
))

story.append(Spacer12())
story.append(add_heading('<b>12.3 Panel del Gerente</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'El panel del gerente ofrece una vision consolidada de todos los proyectos de la empresa. Desde '
    'este panel, el gerente puede consultar estadisticas globales de implementacion, revisar los '
    'inventarios de todas las zonas y proyectos, acceder a los planes de accion con filtros por '
    'proyecto y zona, y verificar el estado de las auditorias. El panel incluye tres secciones principales: '
    'Estadisticas (con graficos de progreso por proyecto), Inventario consolidado (con todos los items '
    'de todos los proyectos) y Plan de Accion global (con todas las acciones de la empresa). '
    'Esta vision horizontal permite al gerente identificar patrones, comparar proyectos y priorizar '
    'recursos donde mas se necesitan.'
))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 12: JAULA DE EXCEDENTES
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>13. Jaula de Excedentes</b>', style_h1, level=0))
story.append(Spacer6())

story.append(Body(
    'La Jaula de Excedentes es un espacio de almacenamiento temporal donde se depositan los elementos '
    'clasificados como innecesarios en la 1S antes de tomar una decision definitiva sobre su destino. '
    'Su funcion principal es evitar la eliminacion prematura de elementos que podrian ser utiles para '
    'otras zonas o departamentos, promoviendo la reutilizacion y reduciendo el desperdicio. La Jaula '
    'es una herramienta de gestion que permite un proceso de clasificacion ordenado y transparente.'
))

story.append(Spacer12())
story.append(add_heading('<b>13.1 Flujo de la Jaula</b>', style_h2, level=1))
story.append(Spacer6())

story.append(Body(
    'El flujo de trabajo de la Jaula de Excedentes es el siguiente: cuando un empleado clasifica un '
    'item como innecesario en el inventario de la 1S y marca la decision como "Jaula", el item se '
    'incorpora automaticamente a la Jaula con el estado "en_jaula". Otros empleados o responsables '
    'pueden consultar la Jaula y reclamar items que les sean utiles, cambiando el estado a "reclamado". '
    'Finalmente, cuando el item se traslada a su nuevo destino, se marca como "transferido" y se '
    'registran la fecha de salida y el area de destino. Si nadie reclama un item en un plazo '
    'razonable, se procede a su eliminacion, donacion o venta segun la decision final tomada.'
))

jaula_states = [
    ['en_jaula', 'El item esta disponible en la Jaula para ser reclamado por cualquier zona o departamento.'],
    ['reclamado', 'Alguien ha solicitado el item y esta pendiente de traslado.'],
    ['transferido', 'El item ha sido trasladado a su nuevo destino y ya no esta en la Jaula.'],
]
story.append(make_table(
    ['Estado', 'Descripcion'],
    jaula_states,
    col_ratios=[0.18, 0.82]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 9. Estados de la Jaula de Excedentes', style_caption))

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 13: PREGUNTAS FRECUENTES
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>14. Preguntas Frecuentes</b>', style_h1, level=0))
story.append(Spacer6())

faqs = [
    ('Si hay varios empleados en una zona, todos deben completar la formacion antes de avanzar?',
     'Si. Los pasos individuales como la formacion y la autoevaluacion deben ser completados por cada '
     'empleado. La zona no puede avanzar al siguiente paso hasta que todos los empleados asignados hayan '
     'completado los pasos individuales que les corresponden. Esto garantiza que todo el equipo tiene '
     'los conocimientos necesarios antes de pasar a la fase practica.'),
    ('Un empleado puede realizar la autoevaluacion interna?',
     'Si. La autoevaluacion interna (paso 4) la realizan los empleados de la zona. Es un ejercicio de reflexion '
     'sobre el grado de cumplimiento de los criterios 5S. Cada empleado completa el checklist valorando '
     'cada item como OK, NOK o N/A. Los items NOK requieren indicar obligatoriamente el hallazgo y los puntos de mejora.'),
    ('Quien realiza la auditoria externa?',
     'Solo los usuarios con rol de auditor pueden realizar auditorias externas (paso 5). El responsable '
     'coordina el proyecto y hace seguimiento del progreso, pero la evaluacion externa debe ser realizada '
     'por un auditor independiente para garantizar la objetividad del proceso.'),
    ('Se pueden mezclar los inventarios de 1S y 2S?',
     'No. Los inventarios de 1S (innecesarios) y 2S (necesarios) son independientes. Esta separacion es '
     'intencionada desde el punto de vista pedagogico: primero se aprende a identificar lo que sobra y '
     'despues se aprende a organizar lo que queda. No deben mezclarse ambos tipos de elementos.'),
    ('Que puntuacion es necesaria para aprobar una auditoria?',
     'La puntuacion del checklist puede llegar hasta el 90%. Cada punto a mejorar identificado puede '
     'anadir un 5% adicional (maximo 2 mejoras = +10%), permitiendo alcanzar un 100%. La puntuacion '
     'minima para aprobar es del 75%. Si la puntuacion es inferior, la S no se aprueba y se deberan '
     'resolver las acciones correctivas antes de repetir la auditoria.'),
    ('Como se asignan empleados a zonas?',
     'Los empleados se asignan a zonas por el administrador o por el responsable del proyecto. Un '
     'empleado puede estar asignado a varias zonas, y una zona puede tener multiples empleados. La '
     'asignacion se gestiona desde el panel de administracion o de gestion del equipo del proyecto.'),
    ('Quien puede ver el plan de accion?',
     'La visibilidad depende del rol: el gerente ve todos los planes de accion de su empresa; el '
     'responsable ve los planes de sus proyectos asignados; el empleado ve solo las acciones de sus '
     'zonas; y el auditor ve las acciones derivadas de sus auditorias para verificar su resolucion.'),
    ('Se puede repetir un examen de formacion?',
     'Si, no hay limite de intentos. Si un empleado no alcanza el 80% minimo, puede repasar el '
     'material formativo y volver a presentarse al examen cuantas veces sea necesario.'),
]

for i, (q, a) in enumerate(faqs, 1):
    story.append(H3('Pregunta {}: {}'.format(i, q)))
    story.append(Body(a))
    story.append(Spacer6())

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 14: GLOSARIO
# ═══════════════════════════════════════════════════════════════════════════

story.append(Spacer24())
story.append(add_heading('<b>15. Glosario de Terminos</b>', style_h1, level=0))
story.append(Spacer6())

glossary = [
    ['5S', 'Metodologia japonesa de organizacion del lugar de trabajo basada en cinco principios: Seiri, Seiton, Seiso, Seiketsu y Shitsuke.'],
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
    ['Poka-yoke', 'Sistema a prueba de errores que impide que se cometa un error de forma involuntaria.'],
]
story.append(make_table(
    ['Termino', 'Definicion'],
    glossary,
    col_ratios=[0.22, 0.78]
))
story.append(Spacer6())
story.append(Paragraph('Tabla 10. Glosario de terminos', style_caption))


# ═══════════════════════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════════════════════

doc.multiBuild(story)
print(f"Manual generado exitosamente: {OUTPUT}")
