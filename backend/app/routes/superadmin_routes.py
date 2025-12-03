from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.usuario import Usuario
from app.models.campeonato import Campeonato
from datetime import datetime, timedelta
import secrets
import string

# Crear namespace
superadmin_ns = Namespace('superadmin', description='Operaciones de SuperAdmin')

# Modelos para documentación
organizador_input = superadmin_ns.model('OrganizadorInput', {
    'nombre': fields.String(required=True, description='Nombre completo del organizador'),
    'email': fields.String(required=True, description='Email del organizador (debe ser Gmail)'),
    'nombre_campeonato': fields.String(required=True, description='Nombre del campeonato que gestionará')
})

organizador_output = superadmin_ns.model('OrganizadorOutput', {
    'id': fields.Integer(description='ID del organizador'),
    'nombre': fields.String(description='Nombre del organizador'),
    'email': fields.String(description='Email del organizador'),
    'campeonato': fields.String(description='Nombre del campeonato'),
    'rol': fields.String(description='Rol del usuario'),
    'activo': fields.Boolean(description='Estado del usuario')
})

# Decorador para verificar rol de superadmin
def superadmin_required():
    def decorator(f):
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            
            if not user:
                superadmin_ns.abort(404, 'Usuario no encontrado')
            
            if user.rol != 'superadmin':
                superadmin_ns.abort(403, 'Acceso denegado. Se requiere rol de SuperAdmin')
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

@superadmin_ns.route('/organizadores')
class OrganizadorList(Resource):
    @superadmin_required()
    @superadmin_ns.doc('listar_organizadores')
    @superadmin_ns.marshal_list_with(organizador_output)
    def get(self):
        """Listar todos los organizadores"""
        try:
            organizadores = Usuario.query.filter_by(rol='admin').all()
            
            resultado = []
            for org in organizadores:
                # Buscar campeonato asociado
                campeonato = Campeonato.query.filter_by(creado_por=org.id_usuario).first()
                
                resultado.append({
                    'id': org.id_usuario,
                    'nombre': org.nombre,
                    'email': org.email,
                    'campeonato': campeonato.nombre if campeonato else 'Sin campeonato',
                    'rol': org.rol,
                    'activo': org.activo
                })
            
            return resultado, 200
            
        except Exception as e:
            print(f"❌ Error al listar organizadores: {str(e)}")
            superadmin_ns.abort(500, 'Error al obtener la lista de organizadores')
    
    @superadmin_required()
    @superadmin_ns.doc('crear_organizador')
    @superadmin_ns.expect(organizador_input)
    def post(self):
        """Crear nuevo organizador"""
        try:
            data = request.get_json()
            
            print(f"📥 Datos recibidos: {data}")
            
            # Validar datos requeridos
            if not data.get('nombre'):
                superadmin_ns.abort(400, 'El nombre es requerido')
            
            if not data.get('email'):
                superadmin_ns.abort(400, 'El email es requerido')
            
            if not data.get('nombre_campeonato'):
                superadmin_ns.abort(400, 'El nombre del campeonato es requerido')
            
            # Verificar que el email sea Gmail
            if not data['email'].endswith('@gmail.com'):
                superadmin_ns.abort(400, 'Solo se permiten correos de Gmail')
            
            # Verificar que el email no exista
            if Usuario.query.filter_by(email=data['email']).first():
                superadmin_ns.abort(400, 'El email ya está registrado')
            
            # Generar contraseña temporal segura
            password_temp = ''.join(secrets.choice(string.ascii_letters + string.digits + string.punctuation) for _ in range(16))
            print(f"🔑 Contraseña temporal generada: {password_temp}")
            
            # Crear usuario organizador - SIN email_verificado
            nuevo_organizador = Usuario(
                nombre=data['nombre'],
                email=data['email'],
                rol='admin',
                activo=True
            )
            nuevo_organizador.set_password(password_temp)
            print(f"👤 Usuario creado en memoria: {nuevo_organizador.email}")
            
            db.session.add(nuevo_organizador)
            db.session.flush()  # Para obtener el ID
            print(f"✅ Usuario guardado con ID: {nuevo_organizador.id_usuario}")
            
            # Crear campeonato asociado
            nuevo_campeonato = Campeonato(
                nombre=data['nombre_campeonato'],
                descripcion=f"Campeonato gestionado por {data['nombre']}",
                fecha_inicio=datetime.utcnow().date(),
                fecha_fin=(datetime.utcnow() + timedelta(days=90)).date(),
                estado='planificacion',
                max_equipos=16,
                creado_por=nuevo_organizador.id_usuario
            )
            
            db.session.add(nuevo_campeonato)
            db.session.commit()
            
            print(f"✅ Organizador creado exitosamente: {nuevo_organizador.email}")
            print(f"✅ Campeonato creado: {nuevo_campeonato.nombre}")
            print(f"🔑 Credenciales temporales - Email: {data['email']}, Password: {password_temp}")
            
            return {
                'mensaje': 'Organizador creado exitosamente',
                'organizador': {
                    'id': nuevo_organizador.id_usuario,
                    'nombre': nuevo_organizador.nombre,
                    'email': nuevo_organizador.email,
                    'campeonato': nuevo_campeonato.nombre
                },
                'credenciales_temporales': {
                    'email': data['email'],
                    'password': password_temp,
                    'nota': 'IMPORTANTE: Guarda estas credenciales de forma segura y envíalas al organizador'
                }
            }, 201
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al crear organizador: {str(e)}")
            import traceback
            traceback.print_exc()
            superadmin_ns.abort(500, f'Error al crear el organizador: {str(e)}')


@superadmin_ns.route('/organizadores/<int:id>')
class OrganizadorDetail(Resource):
    @superadmin_required()
    @superadmin_ns.doc('obtener_organizador')
    def get(self, id):
        """Obtener detalles de un organizador"""
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                superadmin_ns.abort(404, 'Organizador no encontrado')
            
            campeonato = Campeonato.query.filter_by(creado_por=organizador.id_usuario).first()
            
            # Verificar si tiene el atributo email_verified o email_verificado
            email_verificado = False
            if hasattr(organizador, 'email_verified'):
                email_verificado = organizador.email_verified
            elif hasattr(organizador, 'email_verificado'):
                email_verificado = organizador.email_verificado
            
            return {
                'id': organizador.id_usuario,
                'nombre': organizador.nombre,
                'email': organizador.email,
                'rol': organizador.rol,
                'activo': organizador.activo,
                'email_verificado': email_verificado,
                'fecha_registro': organizador.fecha_registro.isoformat() if organizador.fecha_registro else None,
                'campeonato': {
                    'id': campeonato.id_campeonato,
                    'nombre': campeonato.nombre,
                    'estado': campeonato.estado
                } if campeonato else None
            }, 200
            
        except Exception as e:
            print(f"❌ Error al obtener organizador: {str(e)}")
            superadmin_ns.abort(500, 'Error al obtener el organizador')
    
    @superadmin_required()
    @superadmin_ns.doc('actualizar_organizador')
    def put(self, id):
        """Actualizar organizador"""
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                superadmin_ns.abort(404, 'Organizador no encontrado')
            
            data = request.get_json()
            
            if 'nombre' in data:
                organizador.nombre = data['nombre']
            
            if 'activo' in data:
                organizador.activo = data['activo']
            
            db.session.commit()
            
            return {
                'mensaje': 'Organizador actualizado exitosamente',
                'organizador': {
                    'id': organizador.id_usuario,
                    'nombre': organizador.nombre,
                    'email': organizador.email,
                    'activo': organizador.activo
                }
            }, 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al actualizar organizador: {str(e)}")
            superadmin_ns.abort(500, 'Error al actualizar el organizador')
    
    @superadmin_required()
    @superadmin_ns.doc('eliminar_organizador')
    def delete(self, id):
        """Eliminar organizador"""
        try:
            organizador = Usuario.query.get(id)
            
            if not organizador or organizador.rol != 'admin':
                superadmin_ns.abort(404, 'Organizador no encontrado')
            
            # Eliminar campeonatos asociados
            Campeonato.query.filter_by(creado_por=organizador.id_usuario).delete()
            
            db.session.delete(organizador)
            db.session.commit()
            
            return {'mensaje': 'Organizador eliminado exitosamente'}, 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al eliminar organizador: {str(e)}")
            superadmin_ns.abort(500, 'Error al eliminar el organizador')


@superadmin_ns.route('/dashboard')
class SuperAdminDashboard(Resource):
    @superadmin_required()
    @superadmin_ns.doc('dashboard_superadmin')
    def get(self):
        """Obtener estadísticas del dashboard de SuperAdmin"""
        try:
            total_organizadores = Usuario.query.filter_by(rol='admin').count()
            organizadores_activos = Usuario.query.filter_by(rol='admin', activo=True).count()
            total_campeonatos = Campeonato.query.count()
            campeonatos_activos = Campeonato.query.filter_by(estado='en_curso').count()
            
            return {
                'total_organizadores': total_organizadores,
                'organizadores_activos': organizadores_activos,
                'total_campeonatos': total_campeonatos,
                'campeonatos_activos': campeonatos_activos
            }, 200
            
        except Exception as e:
            print(f"❌ Error en dashboard: {str(e)}")
            superadmin_ns.abort(500, 'Error al obtener estadísticas')