import re

def validar_email(email):
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(patron, email) is not None

def validar_equipo(data):
    errores = []
    if 'nombre' not in data or not data['nombre'].strip():
        errores.append('El nombre del equipo es requerido')
    elif len(data['nombre']) < 3:
        errores.append('El nombre debe tener al menos 3 caracteres')
    if 'id_lider' not in data:
        errores.append('El ID del líder es requerido')
    return errores

def validar_jugador(data):
    errores = []
    if 'nombre' not in data or not data['nombre'].strip():
        errores.append('El nombre es requerido')
    if 'apellido' not in data or not data['apellido'].strip():
        errores.append('El apellido es requerido')
    if 'documento' not in data or not data['documento'].strip():
        errores.append('El documento es requerido')
    if 'dorsal' not in data:
        errores.append('El dorsal es requerido')
    if 'id_equipo' not in data:
        errores.append('El ID del equipo es requerido')
    return errores
