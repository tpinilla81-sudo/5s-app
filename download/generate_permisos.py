#!/usr/bin/env python3
"""
Genera la Ficha de Permisos por Rol de la aplicación 5S.
Documento PDF profesional con matriz de permisos detallada.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#1a7898')
TEXT_PRIMARY  = colors.HexColor('#1b1c1d')
TEXT_MUTED    = colors.HexColor('#848b90')
BG_SURFACE   = colors.HexColor('#d4dadf')
BG_PAGE      = colors.HexColor('#f0f2f3')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Semantic colors for permission icons
COLOR_FULL  = colors.HexColor('#16a34a')  # green - full access
COLOR_PART  = colors.HexColor('#d97706')  # amber - partial
COLOR_NONE  = colors.HexColor('#dc2626')  # red - no access
COLOR_OWN   = colors.HexColor('#2563eb')  # blue - own data only

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('Serif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SerifBold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Sans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SansBold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('Serif', normal='Serif', bold='SerifBold')
registerFontFamily('Sans', normal='Sans', bold='SansBold')

# ━━ Output path ━━
OUTPUT_DIR = '/home/z/my-project/download'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'Ficha_Permisos_Roles_5S.pdf')

# ━━ Styles ━━
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOTTOM_M = 0.8 * inch
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

title_style = ParagraphStyle(
    name='DocTitle', fontName='Serif', fontSize=24, leading=30,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6
)
subtitle_style = ParagraphStyle(
    name='DocSubtitle', fontName='Sans', fontSize=12, leading=16,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=18
)
h1_style = ParagraphStyle(
    name='H1', fontName='Serif', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=18, spaceAfter=8
)
h2_style = ParagraphStyle(
    name='H2', fontName='Serif', fontSize=13, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6
)
body_style = ParagraphStyle(
    name='Body', fontName='Serif', fontSize=10.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=6
)
body_left_style = ParagraphStyle(
    name='BodyLeft', fontName='Serif', fontSize=10.5, leading=16,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=6
)
cell_style = ParagraphStyle(
    name='Cell', fontName='Serif', fontSize=9.5, leading=13,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY
)
cell_center = ParagraphStyle(
    name='CellCenter', fontName='Serif', fontSize=9.5, leading=13,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY
)
header_style = ParagraphStyle(
    name='Header', fontName='Serif', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=TABLE_HEADER_TEXT
)
legend_style = ParagraphStyle(
    name='Legend', fontName='Sans', fontSize=9, leading=13,
    alignment=TA_LEFT, textColor=TEXT_MUTED
)
role_admin_style = ParagraphStyle(
    name='RoleAdmin', fontName='Serif', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=colors.HexColor('#7c3aed')
)
role_resp_style = ParagraphStyle(
    name='RoleResp', fontName='Serif', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=colors.HexColor('#2563eb')
)
role_empl_style = ParagraphStyle(
    name='RoleEmpl', fontName='Serif', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=colors.HexColor('#16a34a')
)
role_audit_style = ParagraphStyle(
    name='RoleAudit', fontName='Serif', fontSize=10, leading=14,
    alignment=TA_CENTER, textColor=colors.HexColor('#d97706')
)

# ━━ Helper functions ━━
def P(text, style=cell_style):
    return Paragraph(text, style)

def PH(text):
    return Paragraph(f'<b>{text}</b>', header_style)

def full_access():
    return P('<font color="#16a34a"><b>Completo</b></font>', cell_center)

def partial_access(desc):
    return P(f'<font color="#d97706"><b>Parcial</b></font><br/><font size="8" color="#848b90">{desc}</font>', cell_center)

def own_data_access(desc="Solo sus datos"):
    return P(f'<font color="#2563eb"><b>Propio</b></font><br/><font size="8" color="#848b90">{desc}</font>', cell_center)

def no_access():
    return P('<font color="#dc2626"><b>No</b></font>', cell_center)

def yes_access():
    return P('<font color="#16a34a"><b>Si</b></font>', cell_center)

def cond_access(desc):
    return P(f'<font color="#d97706"><b>Condicional</b></font><br/><font size="8" color="#848b90">{desc}</font>', cell_center)

# ━━ Build Document ━━
doc = SimpleDocTemplate(
    OUTPUT_FILE, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='Ficha de Permisos por Rol - Aplicacion 5S',
    author='Z.ai', creator='Z.ai'
)

story = []

# ─── Title Block ───
story.append(Spacer(1, 30))
story.append(P('<b>Ficha de Permisos por Rol</b>', title_style))
story.append(P('Aplicacion Metodologia 5S - Juego de Mesa', subtitle_style))
story.append(HRFlowable(width="60%", thickness=1.5, color=ACCENT, spaceAfter=12, spaceBefore=6))

story.append(P(
    'Este documento define los permisos y niveles de acceso asignados a cada rol dentro de la aplicacion '
    'de implementacion de la metodologia 5S. Los cuatro roles establecidos son: <b>Administrador</b>, '
    '<b>Responsable</b>, <b>Empleado</b> y <b>Auditor</b>. Cada rol tiene un conjunto especifico de '
    'permisos que determina que acciones puede realizar, que datos puede consultar y que funciones tiene '
    'disponibles dentro de la plataforma. Esta ficha sirve como referencia para la configuracion del '
    'sistema y para la formacion de los usuarios en sus respectivas responsabilidades.',
    body_style
))
story.append(Spacer(1, 10))

# ─── Legend ───
legend_data = [
    [P('<font color="#16a34a"><b>Completo</b></font> - Acceso total sin restricciones', legend_style),
     P('<font color="#d97706"><b>Parcial</b></font> - Acceso con limitaciones', legend_style)],
    [P('<font color="#2563eb"><b>Propio</b></font> - Solo sus propios datos y zonas asignadas', legend_style),
     P('<font color="#dc2626"><b>No</b></font> - Sin acceso a la funcion', legend_style)],
]
legend_table = Table(legend_data, colWidths=[AVAILABLE_W*0.5, AVAILABLE_W*0.5])
legend_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8f9fa')),
    ('BOX', (0,0), (-1,-1), 0.5, BG_SURFACE),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 10),
    ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(legend_table)
story.append(Spacer(1, 18))

# ─── Section 1: Role Descriptions ───
story.append(P('<b>1. Descripcion de Roles</b>', h1_style))
story.append(Spacer(1, 6))

role_desc_data = [
    [PH('Rol'), PH('Descripcion'), PH('Perfil Tipo')],
    [P('<b><font color="#7c3aed">Administrador</font></b>', cell_center),
     P('Control total del sistema. Gestiona proyectos, usuarios, zonas y configuracion general. Puede crear, modificar y eliminar cualquier elemento. Responsable de la configuracion inicial y mantenimiento del sistema.', cell_style),
     P('Director de fabrica, Gerente de operaciones, Jefe de calidad', cell_style)],
    [P('<b><font color="#2563eb">Responsable</font></b>', cell_center),
     P('Gestiona las zonas asignadas y supervisa el progreso del equipo. Puede aprobar pasos, asignar tareas y revisar el avance de los empleados en su zona. No puede modificar la configuracion global del proyecto.', cell_style),
     P('Jefe de produccion, Supervisor de linea, Coordinador de calidad', cell_style)],
    [P('<b><font color="#16a34a">Empleado</font></b>', cell_center),
     P('Ejecuta las actividades 5S en su zona asignada. Completa los mini-pasos (formacion, fotos, inventario, autoevaluacion), sube evidencias y participa en el proceso de mejora continua. Acceso limitado a sus propias tareas.', cell_style),
     P('Operario, Tecnico de produccion, Auxiliar de fabrica', cell_style)],
    [P('<b><font color="#d97706">Auditor</font></b>', cell_center),
     P('Realiza auditorias externas periodicas para verificar el cumplimiento de los estandares 5S. Solo puede acceder a los datos de auditoria y calificar los criterios establecidos. No participa en la ejecucion de las actividades.', cell_style),
     P('Auditor externo, Consultor de calidad, Inspector', cell_style)],
]

col_w_roles = [AVAILABLE_W*0.15, AVAILABLE_W*0.55, AVAILABLE_W*0.30]
role_table = Table(role_desc_data, colWidths=col_w_roles, hAlign='CENTER')
role_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0,1), (-1,1), colors.white),
    ('BACKGROUND', (0,2), (-1,2), TABLE_ROW_ODD),
    ('BACKGROUND', (0,3), (-1,3), colors.white),
    ('BACKGROUND', (0,4), (-1,4), TABLE_ROW_ODD),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
]))
story.append(role_table)
story.append(Spacer(1, 18))

# ─── Section 2: Permissions Matrix ───
story.append(P('<b>2. Matriz de Permisos por Funcionalidad</b>', h1_style))
story.append(P(
    'La siguiente tabla muestra el nivel de acceso de cada rol para cada funcionalidad de la aplicacion. '
    'Los niveles de acceso son: <b>Completo</b> (sin restricciones), <b>Parcial</b> (con limitaciones), '
    '<b>Propio</b> (solo sus datos/zonas) y <b>No</b> (sin acceso).',
    body_style
))
story.append(Spacer(1, 10))

# Permission categories and rows
perm_data = [
    [PH('Funcionalidad'),
     P('<b><font color="#7c3aed">Administrador</font></b>', header_style),
     P('<b><font color="#2563eb">Responsable</font></b>', header_style),
     P('<b><font color="#16a34a">Empleado</font></b>', header_style),
     P('<b><font color="#d97706">Auditor</font></b>', header_style)],
]

# Category: Gestion de Proyectos
perm_data.append([
    P('<b>Gestion de Proyectos</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Crear proyecto', cell_style),
    full_access(), no_access(), no_access(), no_access()
])
perm_data.append([
    P('Editar proyecto', cell_style),
    full_access(),
    partial_access('Solo zonas asignadas'),
    no_access(), no_access()
])
perm_data.append([
    P('Eliminar proyecto', cell_style),
    full_access(), no_access(), no_access(), no_access()
])
perm_data.append([
    P('Ver informacion del proyecto', cell_style),
    full_access(), full_access(),
    own_data_access('Proyecto asignado'),
    own_data_access('Proyecto asignado')
])

# Category: Gestion de Zonas
perm_data.append([
    P('<b>Gestion de Zonas</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Crear zonas', cell_style),
    full_access(), no_access(), no_access(), no_access()
])
perm_data.append([
    P('Editar zonas', cell_style),
    full_access(),
    partial_access('Solo zonas asignadas'),
    no_access(), no_access()
])
perm_data.append([
    P('Ver zonas', cell_style),
    full_access(), full_access(),
    own_data_access('Zona asignada'),
    own_data_access('Zona asignada')
])

# Category: Gestion de Equipo
perm_data.append([
    P('<b>Gestion de Equipo</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Agregar miembros', cell_style),
    full_access(),
    partial_access('Solo a sus zonas'),
    no_access(), no_access()
])
perm_data.append([
    P('Eliminar miembros', cell_style),
    full_access(),
    partial_access('Solo de sus zonas'),
    no_access(), no_access()
])
perm_data.append([
    P('Cambiar roles', cell_style),
    full_access(),
    partial_access('Solo empleados de sus zonas'),
    no_access(), no_access()
])
perm_data.append([
    P('Ver miembros del equipo', cell_style),
    full_access(), full_access(),
    own_data_access('Companeros de zona'),
    own_data_access('Zona asignada')
])

# Category: Actividades 5S
perm_data.append([
    P('<b>Actividades 5S (Mini-pasos)</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Formacion y examen', cell_style),
    full_access(),
    full_access(),
    own_data_access('Realizar examenes'),
    no_access()
])
perm_data.append([
    P('Subir fotos evidencia', cell_style),
    full_access(),
    full_access(),
    own_data_access('Solo su zona'),
    no_access()
])
perm_data.append([
    P('Inventario (clasificar items)', cell_style),
    full_access(),
    full_access(),
    own_data_access('Solo su zona'),
    no_access()
])
perm_data.append([
    P('Autoevaluacion', cell_style),
    full_access(),
    full_access(),
    own_data_access('Completar propias'),
    no_access()
])
perm_data.append([
    P('Auditoria externa', cell_style),
    full_access(),
    partial_access('Ver resultados'),
    no_access(),
    full_access()
])

# Category: Progreso y Resultados
perm_data.append([
    P('<b>Progreso y Resultados</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Ver progreso global', cell_style),
    full_access(), full_access(),
    own_data_access('Solo su avance'),
    own_data_access('Solo datos auditoria')
])
perm_data.append([
    P('Ver progreso por zona', cell_style),
    full_access(), full_access(),
    own_data_access('Solo su zona'),
    own_data_access('Zona asignada')
])
perm_data.append([
    P('Marcar paso como completado', cell_style),
    full_access(),
    partial_access('Solo sus zonas'),
    own_data_access('Solo sus pasos'),
    no_access()
])
perm_data.append([
    P('Desmarcar paso completado', cell_style),
    full_access(),
    partial_access('Solo sus zonas'),
    no_access(), no_access()
])

# Category: Administracion
perm_data.append([
    P('<b>Administracion del Sistema</b>', cell_style), '', '', '', ''
])
perm_data.append([
    P('Gestion de usuarios', cell_style),
    full_access(), no_access(), no_access(), no_access()
])
perm_data.append([
    P('Reiniciar datos (seed)', cell_style),
    full_access(), no_access(), no_access(), no_access()
])
perm_data.append([
    P('Configurar plantillas', cell_style),
    full_access(),
    partial_access('Ver plantillas'),
    no_access(), no_access()
])
perm_data.append([
    P('Exportar datos/informes', cell_style),
    full_access(),
    partial_access('Solo sus zonas'),
    no_access(),
    partial_access('Solo auditorias')
])

col_w_perms = [AVAILABLE_W*0.28, AVAILABLE_W*0.18, AVAILABLE_W*0.18, AVAILABLE_W*0.18, AVAILABLE_W*0.18]
perm_table = Table(perm_data, colWidths=col_w_perms, hAlign='CENTER')

# Build style commands for permissions table
perm_styles = [
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]

# Category row backgrounds (span across all columns)
category_rows = [1, 6, 11, 17, 23, 29]
for row in category_rows:
    perm_styles.append(('SPAN', (0, row), (-1, row)))
    perm_styles.append(('BACKGROUND', (0, row), (-1, row), colors.HexColor('#e8ecef')))
    perm_styles.append(('TOPPADDING', (0, row), (-1, row), 6))
    perm_styles.append(('BOTTOMPADDING', (0, row), (-1, row), 6))

# Alternating row colors for data rows
data_rows = [i for i in range(2, len(perm_data)) if i not in category_rows]
for idx, row in enumerate(data_rows):
    if idx % 2 == 1:
        perm_styles.append(('BACKGROUND', (0, row), (-1, row), TABLE_ROW_ODD))
    else:
        perm_styles.append(('BACKGROUND', (0, row), (-1, row), TABLE_ROW_EVEN))

perm_table.setStyle(TableStyle(perm_styles))
story.append(perm_table)
story.append(Spacer(1, 24))

# ─── Section 3: Detailed Role Breakdown ───
story.append(P('<b>3. Detalle de Permisos por Rol</b>', h1_style))
story.append(Spacer(1, 6))

# Admin detail
story.append(P('<b><font color="#7c3aed">3.1 Administrador</font></b>', h2_style))
story.append(P(
    'El Administrador tiene control absoluto sobre la plataforma. Es el unico rol que puede crear y eliminar '
    'proyectos, gestionar usuarios a nivel global, y modificar la configuracion del sistema. Puede acceder a '
    'todas las zonas, ver el progreso completo de todos los miembros, y realizar cualquier accion dentro de '
    'la aplicacion. Se recomienda asignar este rol unicamente a personas con responsabilidad directiva, ya que '
    'los cambios realizados por un administrador afectan a toda la organizacion. El administrador tambien es '
    'responsable de la configuracion inicial del sistema, incluyendo la creacion del primer proyecto, la '
    'definicion de zonas de trabajo y la asignacion de los primeros miembros del equipo.',
    body_style
))
story.append(Spacer(1, 8))

# Responsable detail
story.append(P('<b><font color="#2563eb">3.2 Responsable</font></b>', h2_style))
story.append(P(
    'El Responsable actua como supervisor de las zonas que le han sido asignadas. Puede ver y aprobar el '
    'progreso de los empleados dentro de sus zonas, agregar nuevos miembros a las mismas, y completar las '
    'actividades 5S como formacion, subida de fotos, inventario y autoevaluacion. Sin embargo, no puede '
    'crear proyectos, modificar la configuracion global del sistema, ni gestionar usuarios fuera de sus '
    'zonas asignadas. Este rol es ideal para jefes de produccion o supervisores de linea que necesitan '
    'supervisar el trabajo de su equipo y garantizar el cumplimiento de los estandares 5S en su area. '
    'El Responsable tambien puede ver los resultados de las auditorias externas de sus zonas, pero no '
    'puede realizar las auditorias ni modificar sus calificaciones.',
    body_style
))
story.append(Spacer(1, 8))

# Empleado detail
story.append(P('<b><font color="#16a34a">3.3 Empleado</font></b>', h2_style))
story.append(P(
    'El Empleado es el rol con menor nivel de permisos dentro del sistema operativo. Su funcion principal '
    'es ejecutar las actividades 5S asignadas en su zona de trabajo: completar la formacion y los examenes, '
    'subir fotografias como evidencia del estado de su area, clasificar los items del inventario segun las '
    'categorias establecidas (util, innecesario, dudoso), y realizar las autoevaluaciones correspondientes. '
    'Solo puede ver y modificar sus propios datos y su propio progreso. No tiene acceso a la gestion de '
    'zonas, miembros del equipo, ni a la administracion del sistema. Tampoco puede ver el progreso de otros '
    'empleados ni acceder a las funciones de auditoria. Este rol esta disenado para los operarios y tecnicos '
    'que implementan las 5S en su puesto de trabajo diario.',
    body_style
))
story.append(Spacer(1, 8))

# Auditor detail
story.append(P('<b><font color="#d97706">3.4 Auditor</font></b>', h2_style))
story.append(P(
    'El Auditor tiene un rol especializado y limitado exclusivamente a la funcion de auditoria externa. '
    'Su unica capacidad dentro del sistema es realizar las auditorias periodicas de las zonas asignadas, '
    'calificando cada criterio de auditoria segun los estandares 5S establecidos. Puede ver los datos de '
    'las zonas que le han sido asignadas para auditar, pero no puede participar en ninguna otra actividad '
    'del proceso 5S (formacion, fotos, inventario, autoevaluacion). Tampoco puede gestionar proyectos, '
    'zonas, miembros ni acceder a la administracion del sistema. Este diseno garantiza la independencia '
    'del auditor, asegurando que sus evaluaciones sean objetivas y no esten influenciadas por su participacion '
    'en las actividades que audita. El Auditor puede exportar informes de sus auditorias para documentacion '
    'externa o presentacion a la direccion.',
    body_style
))
story.append(Spacer(1, 24))

# ─── Section 4: Quick Reference Table ───
story.append(P('<b>4. Tabla de Referencia Rapida</b>', h1_style))
story.append(P(
    'Resumen visual de las acciones permitidas por rol. Util para consultas rapidas durante el uso diario '
    'de la aplicacion o para formacion de nuevos usuarios.',
    body_style
))
story.append(Spacer(1, 10))

quick_data = [
    [PH('Accion'), PH('Admin'), PH('Resp.'), PH('Empl.'), PH('Audit.')],
    [P('Crear proyecto', cell_style), yes_access(), no_access(), no_access(), no_access()],
    [P('Gestionar zonas', cell_style), yes_access(), partial_access('Asignadas'), no_access(), no_access()],
    [P('Agregar miembros', cell_style), yes_access(), partial_access('Sus zonas'), no_access(), no_access()],
    [P('Realizar formacion', cell_style), yes_access(), yes_access(), own_data_access(), no_access()],
    [P('Subir fotos', cell_style), yes_access(), yes_access(), own_data_access(), no_access()],
    [P('Clasificar inventario', cell_style), yes_access(), yes_access(), own_data_access(), no_access()],
    [P('Autoevaluacion', cell_style), yes_access(), yes_access(), own_data_access(), no_access()],
    [P('Realizar auditoria', cell_style), yes_access(), no_access(), no_access(), yes_access()],
    [P('Ver progreso global', cell_style), yes_access(), yes_access(), own_data_access(), own_data_access()],
    [P('Gestionar usuarios', cell_style), yes_access(), no_access(), no_access(), no_access()],
    [P('Configurar sistema', cell_style), yes_access(), no_access(), no_access(), no_access()],
    [P('Exportar informes', cell_style), yes_access(), partial_access('Sus zonas'), no_access(), partial_access('Auditorias')],
]

col_w_quick = [AVAILABLE_W*0.30, AVAILABLE_W*0.175, AVAILABLE_W*0.175, AVAILABLE_W*0.175, AVAILABLE_W*0.175]
quick_table = Table(quick_data, colWidths=col_w_quick, hAlign='CENTER')
quick_styles = [
    ('BACKGROUND', (0,0), (-1,0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0,0), (-1,0), TABLE_HEADER_TEXT),
    ('GRID', (0,0), (-1,-1), 0.5, TEXT_MUTED),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]
for i in range(1, len(quick_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 0 else TABLE_ROW_ODD
    quick_styles.append(('BACKGROUND', (0, i), (-1, i), bg))

quick_table.setStyle(TableStyle(quick_styles))
story.append(quick_table)
story.append(Spacer(1, 24))

# ─── Section 5: Important Notes ───
story.append(P('<b>5. Notas Importantes</b>', h1_style))
story.append(Spacer(1, 4))

notes = [
    '<b>Asignacion responsable:</b> Los roles deben asignarse con criterio, especialmente el de Administrador. '
    'Un exceso de administradores puede comprometer la integridad de los datos y la coherencia del sistema.',

    '<b>Principio de minimo privilegio:</b> Se recomienda asignar el rol con menos permisos que permita al '
    'usuario realizar sus funciones. Un empleado no necesita permisos de responsable, y un responsable no '
    'necesita ser administrador para desempenar su trabajo.',

    '<b>Independencia del auditor:</b> El rol de Auditor esta disenado para ser independiente del proceso '
    'operativo. Un usuario con rol de Auditor no deberia tener simultaneamente un rol de Empleado o Responsable '
    'en el mismo proyecto, para garantizar la objetividad de las evaluaciones.',

    '<b>Zonas asignadas:</b> Tanto el Responsable como el Empleado y el Auditor solo pueden acceder a las zonas '
    'que les han sido expresamente asignadas. Un cambio de zona requiere la intervencion del Administrador '
    'o del Responsable de la zona de destino.',

    '<b>Auditoria como paso final:</b> La auditoria externa es el ultimo mini-paso de cada S (Seiri, Seiton, '
    'Seiso, Seiketsu, Shitsuke). Solo puede realizarse cuando los cuatro pasos anteriores (formacion, fotos, '
    'inventario y autoevaluacion) han sido completados satisfactoriamente. Esto asegura que el area este '
    'preparada antes de la evaluacion externa.',
]

for i, note in enumerate(notes):
    story.append(P(f'{i+1}. {note}', body_left_style))
    story.append(Spacer(1, 4))

# ─── Footer ───
story.append(Spacer(1, 24))
story.append(HRFlowable(width="40%", thickness=0.5, color=TEXT_MUTED, spaceAfter=6, spaceBefore=6))
story.append(P(
    '<font color="#848b90">Metodologia 5S - Juego de Mesa para la Implementacion | Ficha de Permisos v1.0</font>',
    ParagraphStyle(name='Footer', fontName='Sans', fontSize=8, leading=12, alignment=TA_CENTER, textColor=TEXT_MUTED)
))

# ━━ Build ━━
doc.build(story)
print(f"PDF generado exitosamente: {OUTPUT_FILE}")

# Get file size
size_kb = os.path.getsize(OUTPUT_FILE) / 1024
print(f"Tamano: {size_kb:.1f} KB")
