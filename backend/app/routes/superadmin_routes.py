from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.usuario import Usuario
from app.models.campeonato import Campeonato
from app.extensions import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash 
from app.security.email_service import EmailService  # ✅ CORREGIDO
from functools import wraps
import secrets
import string

superadmin_ns = Namespace('superadmin', description='SuperAdmin operations')

def superadmin_required():
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            
            if not user or user.rol != 'superadmin':
                return {'error': 'Acceso denegado. Se requieren privilegios de superadmin'}, 403
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

def generate_secure_password(length=16):
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for _ in range(length))
    return password

@superadmin_ns.route('/dashboard')
class Dashboard(Resource):
    @superadmin_required()
    def get(self):
        try:
            now = datetime.utcnow()
            thirty_days_ago = now - timedelta(days=30)
            sixty_days_ago = now - timedelta(days=60)

            total_organizadores = Usuario.query.filter_by(rol='admin').count()
            organizadores_activos = Usuario.query.filter_by(rol='admin', activo=True).count()

            total_campeonatos = Campeonato.query.count()
            campeonatos_activos = Campeonato.query.filter_by(estado='en_curso').count()
            campeonatos_planificacion = Campeonato.query.filter_by(estado='planificacion').count()
            campeonatos_finalizados = Campeonato.query.filter_by(estado='finalizado').count()

            usuarios_totales = Usuario.query.filter(Usuario.rol != 'superadmin').count()
            usuarios_espectadores = Usuario.query.filter_by(rol='espectador').count()
            usuarios_lideres = Usuario.query.filter_by(rol='lider').count()

            org_last_30 = Usuario.query.filter(
                Usuario.rol == 'admin',
                Usuario.fecha_registro >= thirty_days_ago
            ).count()
            org_prev_30 = Usuario.query.filter(
                Usuario.rol == 'admin',
                Usuario.fecha_registro >= sixty_days_ago,
                Usuario.fecha_registro < thirty_days_ago
            ).count()

            camp_last_30 = Campeonato.query.filter(
                Campeonato.fecha_creacion >= thirty_days_ago
            ).count()
            camp_prev_30 = Campeonato.query.filter(
                Campeonato.fecha_creacion >= sixty_days_ago,
                Campeonato.fecha_creacion < thirty_days_ago
            ).count()

            users_last_30 = Usuario.query.filter(
                Usuario.rol != 'superadmin',
                Usuario.fecha_registro >= thirty_days_ago
            ).count()
            users_prev_30 = Usuario.query.filter(
                Usuario.rol != 'superadmin',
                Usuario.fecha_registro >= sixty_days_ago,
                Usuario.fecha_registro < thirty_days_ago
            ).count()

            def calcular_tendencia(actual, anterior):
                if anterior == 0:
                    return 100 if actual > 0 else 0
                return round(((actual - anterior) / anterior) * 100, 1)

            trend_organizadores = calcular_tendencia(org_last_30, org_prev_30)
            trend_campeonatos = calcular_tendencia(camp_last_30, camp_prev_30)
            trend_usuarios = calcular_tendencia(users_last_30, users_prev_30)

            crecimiento_usuarios = []
            for i in range(29, -1, -1):
                fecha = now - timedelta(days=i)
                count = Usuario.query.filter(
                    Usuario.rol != 'superadmin',
                    Usuario.fecha_registro <= fecha
                ).count()
                crecimiento_usuarios.append({
                    'fecha': fecha.strftime('%Y-%m-%d'),
                    'usuarios': count
                })

            actividad_reciente = []
            recent_users = Usuario.query.order_by(Usuario.fecha_registro.desc()).limit(10).all()
            for user in recent_users:
                actividad_reciente.append({
                    'id': user.id_usuario,
                    'accion': f'Nuevo usuario registrado: {user.nombre}',
                    'usuario': user.nombre,
                    'fecha': user.fecha_registro.isoformat(),
                    'estado': 'Completado'
                })

            return {
                'estadisticas': {
                    'total_organizadores': total_organizadores,
                    'organizadores_activos': organizadores_activos,
                    'total_campeonatos': total_campeonatos,
                    'campeonatos_activos': campeonatos_activos,
                    'campeonatos_planificacion': campeonatos_planificacion,
                    'campeonatos_finalizados': campeonatos_finalizados,
                    'solicitudes_pendientes': 0,
                    'usuarios_totales': usuarios_totales,
                    'usuarios_espectadores': usuarios_espectadores,
                    'usuarios_lideres': usuarios_lideres,
                    'trend_organizadores': trend_organizadores,
                    'trend_campeonatos': trend_campeonatos,
                    'trend_usuarios': trend_usuarios
                },
                'actividad_reciente': actividad_reciente,
                'crecimiento_usuarios': crecimiento_usuarios
            }, 200

        except Exception as e:
            return {'error': f'Error al obtener dashboard: {str(e)}'}, 500

@superadmin_ns.route('/organizadores')
class OrganizadoresList(Resource):
    @superadmin_required()
    def get(self):
        try:
            search = request.args.get('search', '').strip()
            estado = request.args.get('estado', 'Todos')
            orden = request.args.get('orden', 'recent')
            
            query = Usuario.query.filter_by(rol='admin')
            
            if search:
                search_pattern = f'%{search}%'
                query = query.filter(
                    db.or_(
                        Usuario.nombre.ilike(search_pattern),
                        Usuario.email.ilike(search_pattern)
                    )
                )
            
            if estado == 'Activo':
                query = query.filter_by(activo=True)
            elif estado == 'Inactivo':
                query = query.filter_by(activo=False)
            
            if orden == 'name_asc':
                query = query.order_by(Usuario.nombre.asc())
            elif orden == 'name_desc':
                query = query.order_by(Usuario.nombre.desc())
            elif orden == 'email_asc':
                query = query.order_by(Usuario.email.asc())
            elif orden == 'email_desc':
                query = query.order_by(Usuario.email.desc())
            else:
                query = query.order_by(Usuario.fecha_registro.desc())
            
            organizadores = query.all()
            
            result = []
            for org in organizadores:
                campeonato = Campeonato.query.filter_by(creado_por=org.id_usuario).first()
                
                result.append({
                    'id_usuario': org.id_usuario,
                    'nombre': org.nombre,
                    'email': org.email,
                    'activo': org.activo,
                    'email_verified': org.email_verified,
                    'fecha_registro': org.fecha_registro.isoformat() if org.fecha_registro else None,
                    'campeonato': campeonato.nombre if campeonato else None
                })
            
            return {'organizadores': result}, 200

        except Exception as e:
            return {'error': f'Error al obtener organizadores: {str(e)}'}, 500

    @superadmin_required()
    def post(self):
        try:
            data = request.get_json()
        
            nombre = data.get('nombre')
            email = data.get('email')
            nombre_campeonato = data.get('nombre_campeonato')
        
            if not nombre or not email or not nombre_campeonato:
                return {'error': 'Nombre, email y nombre del campeonato son requeridos'}, 400
        
            if not email.lower().endswith('@gmail.com'):
                return {'error': 'Solo se permiten correos de Gmail'}, 400
        
            if Usuario.query.filter_by(email=email).first():
                return {'error': 'El email ya esta registrado'}, 400
        
            password_temporal = generate_secure_password(16)
        
            nuevo_organizador = Usuario(
                nombre=nombre,
                email=email,
                contrasena=generate_password_hash(password_temporal),
                rol='admin',
                activo=True,
                email_verified=False
            )
        
            db.session.add(nuevo_organizador)
            db.session.flush()
        
            fecha_inicio = datetime.utcnow().date()
            fecha_fin = fecha_inicio + timedelta(days=90)
        
            nuevo_campeonato = Campeonato(
                nombre=nombre_campeonato,
                descripcion=f'Campeonato gestionado por {nombre}',
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                estado='planificacion',
                max_equipos=16,
                creado_por=nuevo_organizador.id_usuario
            )
        
            db.session.add(nuevo_campeonato)
            db.session.commit()
        
            # Enviar email con credenciales
            try:
                email_enviado = EmailService.send_organizador_credentials(
                    email=email,
                    nombre=nombre,
                    contrasena=password_temporal,
                    nombre_campeonato=nombre_campeonato
                )
                print(f"📧 Email enviado: {email_enviado}")
            except Exception as e:
                print(f"❌ ERROR AL ENVIAR EMAIL: {str(e)}")
                import traceback
                traceback.print_exc()
                email_enviado = False
        
            return {
                'message': 'Organizador creado exitosamente',
                'organizador': {
                    'id_usuario': nuevo_organizador.id_usuario,
                    'nombre': nuevo_organizador.nombre,
                    'email': nuevo_organizador.email
                },
                'campeonato': {
                    'id_campeonato': nuevo_campeonato.id_campeonato,
                    'nombre': nuevo_campeonato.nombre
                },
                'email_enviado': email_enviado,
                'credenciales_temporales': {
                    'email': email,
                    'password': password_temporal,
                    'nota': 'Credenciales enviadas por email. Si no llega, usa estas.'
                }
            }, 201

        except Exception as e:
            db.session.rollback()
            return {'error': f'Error al crear organizador: {str(e)}'}, 500  # ✅ INDENTACIÓN CORRECTA

@superadmin_ns.route('/organizadores/<int:id>')
class OrganizadorDetalle(Resource):
    @superadmin_required()
    def get(self, id):
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                return {'error': 'Organizador no encontrado'}, 404
            
            campeonato = Campeonato.query.filter_by(creado_por=id).first()
            
            actividad_reciente = [
                {
                    'id': 1,
                    'accion': 'Inicio de sesion',
                    'fecha': organizador.last_login_at.isoformat() if organizador.last_login_at else None,
                    'detalles': 'Acceso desde la plataforma web'
                }
            ]
            
            return {
                'organizador': {
                    'id_usuario': organizador.id_usuario,
                    'nombre': organizador.nombre,
                    'email': organizador.email,
                    'activo': organizador.activo,
                    'email_verified': organizador.email_verified,
                    'fecha_registro': organizador.fecha_registro.isoformat() if organizador.fecha_registro else None,
                    'last_login_at': organizador.last_login_at.isoformat() if organizador.last_login_at else None,
                    'campeonato': {
                        'nombre': campeonato.nombre if campeonato else 'Sin campeonato',
                        'estado': campeonato.estado if campeonato else 'N/A',
                        'equipos_count': 0
                    }
                },
                'actividad_reciente': actividad_reciente
            }, 200

        except Exception as e:
            return {'error': f'Error al obtener organizador: {str(e)}'}, 500

    @superadmin_required()
    def put(self, id):
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                return {'error': 'Organizador no encontrado'}, 404
            
            data = request.get_json()
            
            if 'activo' in data:
                organizador.activo = data['activo']
            
            db.session.commit()
            
            return {'message': 'Organizador actualizado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            return {'error': f'Error al actualizar organizador: {str(e)}'}, 500

    @superadmin_required()
    def delete(self, id):
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                return {'error': 'Organizador no encontrado'}, 404
            
            Campeonato.query.filter_by(creado_por=id).delete()
            db.session.delete(organizador)
            db.session.commit()
            
            return {'message': 'Organizador eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            return {'error': f'Error al eliminar organizador: {str(e)}'}, 500

@superadmin_ns.route('/organizadores/<int:id>/reenviar-credenciales')
class ReenviarCredenciales(Resource):
    @superadmin_required()
    def post(self, id):
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                return {'error': 'Organizador no encontrado'}, 404
            
            nueva_password = generate_secure_password(16)
            organizador.contrasena = generate_password_hash(nueva_password)  # ✅ CORREGIDO
            db.session.commit()
            
            return {
                'message': 'Credenciales generadas exitosamente',
                'credenciales': {
                    'email': organizador.email,
                    'password': nueva_password
                }
            }, 200

        except Exception as e:
            db.session.rollback()
            return {'error': f'Error al reenviar credenciales: {str(e)}'}, 500

@superadmin_ns.route('/campeonatos')
class CampeonatosList(Resource):
    @superadmin_required()
    def get(self):
        try:
            search = request.args.get('search', '').strip()
            estado = request.args.get('estado', 'Todos')
            orden = request.args.get('orden', 'recent')
            
            query = Campeonato.query
            
            if search:
                search_pattern = f'%{search}%'
                query = query.join(Usuario, Campeonato.creado_por == Usuario.id_usuario).filter(
                    db.or_(
                        Campeonato.nombre.ilike(search_pattern),
                        Usuario.nombre.ilike(search_pattern)
                    )
                )
            
            if estado != 'Todos':
                query = query.filter_by(estado=estado.lower())
            
            if orden == 'name_asc':
                query = query.order_by(Campeonato.nombre.asc())
            elif orden == 'name_desc':
                query = query.order_by(Campeonato.nombre.desc())
            else:
                query = query.order_by(Campeonato.fecha_creacion.desc())
            
            campeonatos = query.all()
            
            result = []
            for camp in campeonatos:
                organizador = Usuario.query.get(camp.creado_por)
                
                result.append({
                    'id_campeonato': camp.id_campeonato,
                    'nombre': camp.nombre,
                    'descripcion': camp.descripcion,
                    'fecha_inicio': camp.fecha_inicio.isoformat() if camp.fecha_inicio else None,
                    'fecha_fin': camp.fecha_fin.isoformat() if camp.fecha_fin else None,
                    'estado': camp.estado,
                    'equipos_count': 0,
                    'partidos_count': 0,
                    'organizador_nombre': organizador.nombre if organizador else 'Desconocido',
                    'organizador_id': camp.creado_por
                })
            
            return {'campeonatos': result}, 200

        except Exception as e:
            return {'error': f'Error al obtener campeonatos: {str(e)}'}, 500

@superadmin_ns.route('/usuarios')
class UsuariosList(Resource):
    @superadmin_required()
    def get(self):
        try:
            search = request.args.get('search', '').strip()
            rol = request.args.get('rol', 'Todos')
            estado = request.args.get('estado', 'Todos')
            orden = request.args.get('orden', 'recent')
            
            query = Usuario.query.filter(Usuario.rol != 'superadmin')
            
            if search:
                search_pattern = f'%{search}%'
                query = query.filter(
                    db.or_(
                        Usuario.nombre.ilike(search_pattern),
                        Usuario.email.ilike(search_pattern)
                    )
                )
            
            if rol != 'Todos':
                query = query.filter_by(rol=rol.lower())
            
            if estado == 'Activo':
                query = query.filter_by(activo=True)
            elif estado == 'Inactivo':
                query = query.filter_by(activo=False)
            
            if orden == 'name_asc':
                query = query.order_by(Usuario.nombre.asc())
            elif orden == 'name_desc':
                query = query.order_by(Usuario.nombre.desc())
            elif orden == 'email_asc':
                query = query.order_by(Usuario.email.asc())
            elif orden == 'email_desc':
                query = query.order_by(Usuario.email.desc())
            else:
                query = query.order_by(Usuario.fecha_registro.desc())
            
            usuarios = query.all()
            
            result = []
            for user in usuarios:
                result.append({
                    'id_usuario': user.id_usuario,
                    'nombre': user.nombre,
                    'email': user.email,
                    'rol': user.rol,
                    'activo': user.activo,
                    'email_verified': user.email_verified,
                    'fecha_registro': user.fecha_registro.isoformat() if user.fecha_registro else None,
                    'campeonato_nombre': None,
                    'equipo_nombre': None
                })
            
            return {'usuarios': result}, 200

        except Exception as e:
            return {'error': f'Error al obtener usuarios: {str(e)}'}, 500