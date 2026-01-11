from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.usuario import Usuario
from app.models.preferencias_usuario import PreferenciasUsuario
from app.models.campeonato import Campeonato
from app.models.equipo import Equipo
from app.models.partido import Partido
from app.utils.validators import validar_email
from app.utils.sanitizer import InputSanitizer
from werkzeug.utils import secure_filename
from sqlalchemy import text
import os
import uuid
from datetime import datetime
import re

perfil_ns = Namespace('perfil', description='Gestión de perfil de usuario')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

perfil_update_model = perfil_ns.model('PerfilUpdate', {
    'nombre': fields.String(description='Nombre del usuario'),
    'apellido': fields.String(description='Apellido del usuario'),
    'biografia': fields.String(description='Biografía del usuario (máx 500 caracteres)')
})

preferencias_model = perfil_ns.model('Preferencias', {
    'idioma': fields.String(description='Idioma', enum=['es', 'en', 'pt-BR']),
    'tema': fields.String(description='Tema (modo visualización)', enum=['claro', 'oscuro', 'auto']),
    'color_primario': fields.String(description='Color primario (acento)', enum=['verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo']),
    'formato_fecha': fields.String(description='Formato de fecha', enum=['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    'zona_horaria': fields.String(description='Zona horaria'),
    'notificaciones_email': fields.Boolean(description='Notificaciones por email'),
    'notificaciones_push': fields.Boolean(description='Notificaciones push')
})

# ============================================
# VALIDACIONES
# ============================================

def validar_nombre_apellido(texto):
    """Valida que el texto contenga solo letras y espacios, entre 2 y 100 caracteres"""
    if not texto or len(texto.strip()) < 2:
        return False
    if len(texto) > 100:
        return False
    # Solo letras, espacios y algunos caracteres especiales comunes
    patron = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\'-]+$'
    return bool(re.match(patron, texto))

def validar_biografia(texto):
    """Valida que la biografía tenga máximo 500 caracteres"""
    if texto is None:
        return True  # Opcional
    return len(texto) <= 500

# ============================================
# GET /api/perfil - Obtener perfil completo
# ============================================

@perfil_ns.route('')
class Perfil(Resource):
    @jwt_required()
    @perfil_ns.doc(description='Obtener perfil completo del usuario autenticado')
    def get(self):
        """Obtener perfil completo del usuario autenticado"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            
            if not usuario:
                perfil_ns.abort(404, error='Usuario no encontrado')
            
            # Obtener preferencias (crear si no existen)
            preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
            if not preferencias:
                preferencias = PreferenciasUsuario(
                    id_usuario=current_user_id,
                    idioma='es',
                    tema='claro',
                    color_primario='verde',
                    formato_fecha='DD/MM/YYYY',
                    zona_horaria='America/Guayaquil',
                    notificaciones_email=True,
                    notificaciones_push=True
                )
                db.session.add(preferencias)
                try:
                    db.session.commit()
                except Exception:
                    # Si falla por duplicado, obtener de nuevo
                    db.session.rollback()
                    preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
            
            # Migración temporal: si no tiene color_primario, establecerlo
            if not hasattr(preferencias, 'color_primario') or preferencias.color_primario is None:
                # Si tema es un color antiguo, moverlo a color_primario
                if hasattr(preferencias, 'tema') and preferencias.tema in ['verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo']:
                    preferencias.color_primario = preferencias.tema
                    preferencias.tema = 'claro'
                else:
                    preferencias.color_primario = 'verde'
                    if not hasattr(preferencias, 'tema') or preferencias.tema is None:
                        preferencias.tema = 'claro'
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            
            # Construir respuesta con datos del perfil
            perfil_data = usuario.to_dict()
            perfil_data['preferencias'] = preferencias.to_dict()
            
            return {
                'mensaje': 'Perfil obtenido exitosamente',
                'perfil': perfil_data
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))
    
    @jwt_required()
    @perfil_ns.expect(perfil_update_model)
    @perfil_ns.doc(description='Actualizar información personal del perfil')
    def put(self):
        """Actualizar información personal del perfil"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            
            if not usuario:
                perfil_ns.abort(404, error='Usuario no encontrado')
            
            data = perfil_ns.payload
            
            # Validar y actualizar nombre
            if 'nombre' in data and data['nombre']:
                nombre_sanitizado = InputSanitizer.sanitize_string(data['nombre'], max_length=100)
                if not validar_nombre_apellido(nombre_sanitizado):
                    perfil_ns.abort(400, error='El nombre debe tener entre 2 y 100 caracteres y solo contener letras y espacios')
                usuario.nombre = nombre_sanitizado
            
            # Validar y actualizar apellido (opcional)
            if 'apellido' in data:
                if data['apellido']:
                    apellido_sanitizado = InputSanitizer.sanitize_string(data['apellido'], max_length=100)
                    if not validar_nombre_apellido(apellido_sanitizado):
                        perfil_ns.abort(400, error='El apellido debe tener entre 2 y 100 caracteres y solo contener letras y espacios')
                    usuario.apellido = apellido_sanitizado
                else:
                    usuario.apellido = None
            
            # Validar y actualizar biografía
            if 'biografia' in data:
                if data['biografia']:
                    biografia_sanitizada = InputSanitizer.sanitize_string(data['biografia'], max_length=500)
                    if not validar_biografia(biografia_sanitizada):
                        perfil_ns.abort(400, error='La biografía no puede exceder 500 caracteres')
                    usuario.biografia = biografia_sanitizada
                else:
                    usuario.biografia = None
            
            db.session.commit()
            
            return {
                'mensaje': 'Perfil actualizado exitosamente',
                'perfil': usuario.to_dict()
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))

# ============================================
# POST /api/perfil/foto - Subir foto de perfil
# ============================================

@perfil_ns.route('/foto')
class PerfilFoto(Resource):
    @jwt_required()
    @perfil_ns.doc(description='Subir foto de perfil (JPG, JPEG, PNG, máx 2MB)')
    def post(self):
        """Subir foto de perfil"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            
            if not usuario:
                perfil_ns.abort(404, error='Usuario no encontrado')
            
            if 'foto' not in request.files:
                perfil_ns.abort(400, error='No se envió archivo')
            
            file = request.files['foto']
            
            if file.filename == '':
                perfil_ns.abort(400, error='No se seleccionó archivo')
            
            # Validar extensión
            ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
            ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            if ext not in ALLOWED_EXTENSIONS:
                perfil_ns.abort(400, error='Formato no permitido. Use JPG, JPEG o PNG')
            
            # Validar tamaño (máximo 2MB)
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > 2 * 1024 * 1024:
                perfil_ns.abort(400, error='El archivo es muy grande. Máximo 2MB')
            
            # Eliminar foto anterior si existe
            if usuario.foto_url:
                foto_anterior_path = usuario.foto_url.replace('http://localhost:5000/uploads/', '')
                foto_anterior_full_path = os.path.join('uploads', 'perfiles', foto_anterior_path.split('/')[-1])
                if os.path.exists(foto_anterior_full_path):
                    try:
                        os.remove(foto_anterior_full_path)
                    except:
                        pass  # Si no se puede eliminar, continuar
            
            # Crear directorio si no existe
            UPLOAD_FOLDER = 'uploads/perfiles'
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Generar nombre único
            timestamp = int(datetime.utcnow().timestamp())
            filename = f"perfil_{current_user_id}_{timestamp}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            # Guardar archivo
            file.save(filepath)
            
            # Actualizar foto_url en el usuario
            foto_url = f"http://localhost:5000/uploads/perfiles/{filename}"
            usuario.foto_url = foto_url
            db.session.commit()
            
            return {
                'mensaje': 'Foto subida exitosamente',
                'foto_url': foto_url
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))
    
    @jwt_required()
    @perfil_ns.doc(description='Eliminar foto de perfil')
    def delete(self):
        """Eliminar foto de perfil"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            
            if not usuario:
                perfil_ns.abort(404, error='Usuario no encontrado')
            
            if not usuario.foto_url:
                perfil_ns.abort(400, error='No hay foto de perfil para eliminar')
            
            # Eliminar archivo
            foto_path = usuario.foto_url.replace('http://localhost:5000/uploads/', '')
            foto_full_path = os.path.join('uploads', 'perfiles', foto_path.split('/')[-1])
            if os.path.exists(foto_full_path):
                try:
                    os.remove(foto_full_path)
                except:
                    pass  # Si no se puede eliminar, continuar
            
            # Actualizar usuario
            usuario.foto_url = None
            db.session.commit()
            
            return {
                'mensaje': 'Foto eliminada exitosamente'
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))

# ============================================
# GET /api/perfil/preferencias - Obtener preferencias
# ============================================

@perfil_ns.route('/preferencias')
class PerfilPreferencias(Resource):
    @jwt_required()
    @perfil_ns.doc(description='Obtener preferencias del usuario')
    def get(self):
        """Obtener preferencias del usuario"""
        try:
            current_user_id = int(get_jwt_identity())
            
            # Intentar obtener preferencias normalmente
            try:
                preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
            except Exception as query_error:
                # Si falla por ENUM inválido, corregir en la BD primero
                db.session.rollback()
                try:
                    # Actualizar valores inválidos de tema
                    fix_query = text("""
                        UPDATE preferencias_usuario 
                        SET tema = 'claro'
                        WHERE id_usuario = :user_id 
                          AND tema NOT IN ('claro', 'oscuro', 'auto')
                    """)
                    db.session.execute(fix_query, {'user_id': current_user_id})
                    db.session.commit()
                    # Intentar obtener de nuevo
                    preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
                except Exception:
                    db.session.rollback()
                    preferencias = None
            
            if not preferencias:
                # Crear preferencias por defecto
                preferencias = PreferenciasUsuario(
                    id_usuario=current_user_id,
                    idioma='es',
                    tema='claro',
                    color_primario='verde',
                    formato_fecha='DD/MM/YYYY',
                    zona_horaria='America/Guayaquil',
                    notificaciones_email=True,
                    notificaciones_push=True
                )
                db.session.add(preferencias)
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                    try:
                        preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
                    except Exception:
                        # Si todo falla, devolver valores por defecto sin BD
                        return {
                            'mensaje': 'Preferencias obtenidas exitosamente',
                            'preferencias': {
                                'id': None,
                                'id_usuario': current_user_id,
                                'idioma': 'es',
                                'tema': 'claro',
                                'color_primario': 'verde',
                                'formato_fecha': 'DD/MM/YYYY',
                                'zona_horaria': 'America/Guayaquil',
                                'notificaciones_email': True,
                                'notificaciones_push': True,
                                'fecha_creacion': None,
                                'fecha_actualizacion': None
                            }
                        }, 200
            
            return {
                'mensaje': 'Preferencias obtenidas exitosamente',
                'preferencias': preferencias.to_dict()
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))
    
    @jwt_required()
    @perfil_ns.expect(preferencias_model)
    @perfil_ns.doc(description='Actualizar preferencias del usuario')
    def put(self):
        """Actualizar preferencias del usuario"""
        try:
            current_user_id = int(get_jwt_identity())
            preferencias = PreferenciasUsuario.query.filter_by(id_usuario=current_user_id).first()
            
            if not preferencias:
                # Crear preferencias si no existen
                preferencias = PreferenciasUsuario(
                    id_usuario=current_user_id,
                    idioma='es',
                    tema='claro',
                    color_primario='verde',
                    formato_fecha='DD/MM/YYYY',
                    zona_horaria='America/Guayaquil',
                    notificaciones_email=True,
                    notificaciones_push=True
                )
                db.session.add(preferencias)
            
            data = perfil_ns.payload
            
            # Actualizar campos permitidos
            if 'idioma' in data:
                if data['idioma'] not in ['es', 'en', 'pt-BR']:
                    perfil_ns.abort(400, error='Idioma inválido. Use "es", "en" o "pt-BR"')
                preferencias.idioma = data['idioma']
            
            if 'tema' in data:
                temas_validos = ['claro', 'oscuro', 'auto']
                if data['tema'] not in temas_validos:
                    perfil_ns.abort(400, error=f'Tema inválido. Debe ser uno de: {", ".join(temas_validos)}')
                preferencias.tema = data['tema']
            
            if 'color_primario' in data:
                colores_validos = ['verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo']
                if data['color_primario'] not in colores_validos:
                    perfil_ns.abort(400, error=f'Color primario inválido. Debe ser uno de: {", ".join(colores_validos)}')
                preferencias.color_primario = data['color_primario']
            
            if 'formato_fecha' in data:
                if data['formato_fecha'] not in ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']:
                    perfil_ns.abort(400, error='Formato de fecha inválido')
                preferencias.formato_fecha = data['formato_fecha']
            
            if 'zona_horaria' in data:
                preferencias.zona_horaria = InputSanitizer.sanitize_string(data['zona_horaria'], max_length=50)
            
            if 'notificaciones_email' in data:
                preferencias.notificaciones_email = bool(data['notificaciones_email'])
            
            if 'notificaciones_push' in data:
                preferencias.notificaciones_push = bool(data['notificaciones_push'])
            
            # Migración temporal: asegurar que color_primario exista
            if not hasattr(preferencias, 'color_primario') or preferencias.color_primario is None:
                preferencias.color_primario = 'verde'
            
            db.session.commit()
            
            return {
                'mensaje': 'Preferencias actualizadas exitosamente',
                'preferencias': preferencias.to_dict()
            }, 200
            
        except Exception as e:
            db.session.rollback()
            perfil_ns.abort(500, error=str(e))

# ============================================
# GET /api/perfil/estadisticas - Obtener estadísticas según rol
# ============================================

@perfil_ns.route('/estadisticas')
class PerfilEstadisticas(Resource):
    @jwt_required()
    @perfil_ns.doc(description='Obtener estadísticas del usuario según su rol')
    def get(self):
        """Obtener estadísticas del usuario según su rol"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            
            if not usuario:
                perfil_ns.abort(404, error='Usuario no encontrado')
            
            estadisticas = {}
            
            if usuario.rol == 'superadmin':
                # Estadísticas para superadmin
                total_usuarios = Usuario.query.filter_by(activo=True).count()
                total_campeonatos = Campeonato.query.count()
                total_equipos = Equipo.query.count()
                
                estadisticas = {
                    'total_usuarios_activos': total_usuarios,
                    'total_campeonatos': total_campeonatos,
                    'total_equipos_sistema': total_equipos
                }
                
            elif usuario.rol == 'admin':
                # Estadísticas para admin (organizador)
                campeonatos_gestionados = Campeonato.query.filter_by(creado_por=current_user_id).count()
                campeonatos = Campeonato.query.filter_by(creado_por=current_user_id).all()
                total_equipos = 0
                for campeonato in campeonatos:
                    total_equipos += campeonato.equipos_inscritos.count()
                
                # Próximo campeonato a iniciar
                proximo_campeonato = Campeonato.query.filter_by(
                    creado_por=current_user_id,
                    estado='planificacion'
                ).order_by(Campeonato.fecha_inicio.asc()).first()
                
                estadisticas = {
                    'campeonatos_gestionados': campeonatos_gestionados,
                    'total_equipos_inscritos': total_equipos,
                    'proximo_campeonato': {
                        'id_campeonato': proximo_campeonato.id_campeonato if proximo_campeonato else None,
                        'nombre': proximo_campeonato.nombre if proximo_campeonato else None,
                        'fecha_inicio': proximo_campeonato.fecha_inicio.isoformat() if proximo_campeonato and proximo_campeonato.fecha_inicio else None
                    } if proximo_campeonato else None
                }
                
            elif usuario.rol == 'lider':
                # Estadísticas para líder
                equipo = Equipo.query.filter_by(id_lider=current_user_id).first()
                
                if equipo:
                    total_jugadores = equipo.jugadores.filter_by(activo=True).count()
                    
                    # Próximo partido
                    # Buscar partidos donde el equipo participa
                    proximo_partido = Partido.query.filter(
                        ((Partido.id_equipo_local == equipo.id_equipo) | (Partido.id_equipo_visitante == equipo.id_equipo)),
                        Partido.estado.in_(['programado', 'pendiente'])
                    ).order_by(Partido.fecha_partido.asc()).first()
                    
                    estadisticas = {
                        'equipo': {
                            'id_equipo': equipo.id_equipo,
                            'nombre': equipo.nombre,
                            'estado': equipo.estado
                        },
                        'total_jugadores': total_jugadores,
                        'proximo_partido': {
                            'id_partido': proximo_partido.id_partido if proximo_partido else None,
                            'fecha': proximo_partido.fecha_partido.isoformat() if proximo_partido and proximo_partido.fecha_partido else None,
                            'rival': proximo_partido.equipo_visitante.nombre if proximo_partido and proximo_partido.id_equipo_local == equipo.id_equipo else (
                                proximo_partido.equipo_local.nombre if proximo_partido else None
                            )
                        } if proximo_partido else None
                    }
                else:
                    estadisticas = {
                        'equipo': None,
                        'total_jugadores': 0,
                        'proximo_partido': None
                    }
            
            return {
                'mensaje': 'Estadísticas obtenidas exitosamente',
                'estadisticas': estadisticas
            }, 200
            
        except Exception as e:
            perfil_ns.abort(500, error=str(e))

