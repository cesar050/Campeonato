from flask import request, jsonify, make_response
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.usuario import Usuario
from app.models.login_attempt import LoginAttempt
from app.models.account_lockout import AccountLockout
from app.models.security_log import SecurityLog
from app.utils.validators import validar_email
from app.utils.sanitizer import sanitize_input, InputSanitizer
from app.middlewares.rate_limit_middleware import rate_limit
from app.security.token_manager import TokenManager
from app.security.email_service import EmailService
from app.security.login_tracker import LoginTracker
from datetime import datetime
import secrets

auth_ns = Namespace('auth', description='Operaciones de autenticación y gestión de usuarios')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

register_model = auth_ns.model('Register', {
    'nombre': fields.String(required=True, description='Nombre completo del usuario'),
    'email': fields.String(required=True, description='Email de Gmail'),
    'contrasena': fields.String(required=True, description='Contraseña'),
    'rol': fields.String(description='Rol del usuario (opcional, default: lider)', enum=['lider', 'admin'])
})

login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, description='Email del usuario'),
    'contrasena': fields.String(required=True, description='Contraseña')
})

refresh_model = auth_ns.model('Refresh', {
    'refresh_token': fields.String(required=True, description='Token de refresco')
})

unlock_model = auth_ns.model('Unlock', {
    'email': fields.String(required=True, description='Email del usuario'),
    'unlock_code': fields.String(required=True, description='Código de desbloqueo de 6 dígitos')
})

resend_verification_model = auth_ns.model('ResendVerification', {
    'email': fields.String(required=True, description='Email del usuario')
})

user_model = auth_ns.model('User', {
    'id_usuario': fields.Integer(description='ID del usuario'),
    'nombre': fields.String(description='Nombre del usuario'),
    'email': fields.String(description='Email del usuario'),
    'rol': fields.String(description='Rol del usuario'),
    'activo': fields.Boolean(description='Estado activo'),
    'email_verified': fields.Boolean(description='Email verificado'),
    'fecha_registro': fields.DateTime(description='Fecha de registro')
})

token_response_model = auth_ns.model('TokenResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta'),
    'access_token': fields.String(description='Token de acceso'),
    'refresh_token': fields.String(description='Token de refresco'),
    'expires_in': fields.Integer(description='Tiempo de expiración en segundos'),
    'usuario': fields.Nested(user_model, description='Datos del usuario')
})

message_response_model = auth_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta'),
    'info': fields.String(description='Información adicional')
})

error_response_model = auth_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo')
})


# ============================================
# 📝 REGISTRO DE USUARIOS
# ============================================

    # ============================================
# 📝 REGISTRO DE USUARIOS
# ============================================

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(register_model)
    @auth_ns.marshal_with(message_response_model, code=201)
    @auth_ns.response(400, 'Error de validación', error_response_model)
    @auth_ns.response(429, 'Demasiadas peticiones', error_response_model)
    @auth_ns.response(500, 'Error interno del servidor', error_response_model)
    @auth_ns.doc(description='Registro de nuevos usuarios (SOLO GMAIL). Incluye rate limiting, sanitización y verificación de email obligatoria.')
    @rate_limit(max_requests=10, window_minutes=60)
    @sanitize_input({'nombre': 100, 'email': 'email'})
    def post(self):
        """Registro de nuevos usuarios (SOLO GMAIL)"""
        try:
            data = auth_ns.payload
            password = data.get('contrasena') or data.get('password')
            if not data.get('nombre') or not data.get('email') or not password:
                auth_ns.abort(400, error='Nombre, email y contraseña son requeridos')
            if not validar_email(data['email']):
                auth_ns.abort(400, error='Email no válido')

            email = data['email'].lower()
            if not email.endswith('@gmail.com'):
                auth_ns.abort(400, error='Solo se permiten cuentas de Gmail')

            if Usuario.query.filter_by(email=email).first():
                auth_ns.abort(400, error='El email ya está registrado')

            verification_token = secrets.token_urlsafe(32)

            nuevo_usuario = Usuario(
                nombre=InputSanitizer.sanitize_string(data['nombre'], max_length=100),
                email=email,
                rol=data.get('rol', 'lider'),
                activo=False,
                email_verified=False,
                email_verification_token=verification_token
            )
            #nuevo_usuario.set_password(data['contrasena'])
            nuevo_usuario.set_password(password)

            db.session.add(nuevo_usuario)
            db.session.commit()

            # ✅ AQUÍ VA EL CÓDIGO QUE TE PASÉ
            # ============================================
            # ENVIAR EMAIL DE VERIFICACIÓN
            # ============================================
            print("=" * 50)
            print("🔍 DEBUG - ENVIANDO EMAIL DE VERIFICACIÓN")
            print(f"   📧 Email destino: {nuevo_usuario.email}")
            print(f"   👤 Nombre: {nuevo_usuario.nombre}")
            print(f"   🎫 Token generado: {verification_token[:20]}...")
            print("=" * 50)

            email_sent = False
            try:
                # Link debe apuntar al FRONTEND, no al backend
                verification_link = f"http://localhost:4200/auth/verify-email?token={verification_token}"
                
                print(f"🔗 Link de verificación: {verification_link}")
                print("📨 Llamando a EmailService.send_verification_email()...")
                
                email_sent = EmailService.send_verification_email(
                    email=nuevo_usuario.email,
                    nombre=nuevo_usuario.nombre,
                    verification_link=verification_link
                )
                
                print(f"✅ EmailService retornó: {email_sent}")
                
            except Exception as e:
                print(f"❌ EXCEPCIÓN AL ENVIAR EMAIL:")
                print(f"   Error: {str(e)}")
                import traceback
                traceback.print_exc()

            print("=" * 50)
            # ============================================
            # FIN DEL CÓDIGO DE EMAIL
            # ============================================

            SecurityLog.log_event(
                event_type='login_success',
                user_id=nuevo_usuario.id_usuario,
                email=nuevo_usuario.email,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                details={'action': 'register', 'email_verified': False}
            )

            return {
                'mensaje': 'Usuario registrado exitosamente',
                'info': '📧 Revisa tu correo de Gmail para activar tu cuenta',
                'email': nuevo_usuario.email
            }, 201

        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))

# ============================================
# ✅ VERIFICAR EMAIL
# ============================================

@auth_ns.route('/verify-email')
class VerifyEmail(Resource):
    def get(self):
        """Verifica el email del usuario mediante token"""
        try:
            token = request.args.get('token')

            if not token:
                auth_ns.abort(400, error='Token de verificación requerido')

            usuario = Usuario.query.filter_by(email_verification_token=token).first()

            if not usuario:
                auth_ns.abort(400, error='Token inválido')

            if usuario.email_verified:
                return {'mensaje': 'Tu email ya está verificado'}, 200

            usuario.email_verified = True
            usuario.activo = True
            usuario.email_verification_token = None
            db.session.commit()

            return {
                'mensaje': '✅ Email verificado exitosamente',
                'info': 'Ya puedes iniciar sesión'
            }, 200

        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))


# ============================================
# 🔐 LOGIN
# ============================================

@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.expect(login_model)
    @rate_limit(max_requests=10, window_minutes=15)
    @sanitize_input({'email': 'email'})
    def post(self):
        """
        Login con protección contra fuerza bruta
        
        Seguridad:
        - Rate limiting: 10 intentos por 15 minutos
        - Máximo 5 intentos fallidos por cuenta
        - Bloqueo de 10 minutos tras 5 intentos
        - Código de desbloqueo enviado por email
        """
        try:
            data = auth_ns.payload
            ip_address = request.remote_addr
            user_agent = request.headers.get('User-Agent')

            if not data.get('email') or not data.get('contrasena'):
                auth_ns.abort(400, error='Email y contraseña requeridos')

            email = data['email'].lower()

            # 1️⃣ VERIFICAR SI EL USUARIO EXISTE
            usuario = Usuario.query.filter_by(email=email).first()

            if not usuario:
                LoginTracker.record_attempt(email, False, ip_address, user_agent, 'email_no_existe')
                SecurityLog.log_event('login_failed', email=email, ip_address=ip_address, user_agent=user_agent, details={'reason': 'email_no_existe'})
                auth_ns.abort(401, error='Credenciales inválidas')

            # 2️⃣ VERIFICAR EMAIL VERIFICADO
            # 2️⃣ VERIFICAR EMAIL VERIFICADO
            if not usuario.email_verified:
                LoginTracker.record_attempt(email, False, ip_address, user_agent, 'email_no_verificado')
                return make_response(jsonify({
                       'error': 'Email no verificado',
                        'mensaje': 'Debes verificar tu email antes de iniciar sesión',
                        'info': '📧 Revisa tu correo de Gmail (incluyendo spam)'
                     }), 403)

            # 3️⃣ VERIFICAR CUENTA ACTIVA
            if not usuario.activo:
                LoginTracker.record_attempt(email, False, ip_address, user_agent, 'cuenta_inactiva')
                auth_ns.abort(403, error='Cuenta inactiva')

            # 4️⃣ VERIFICAR SI YA ESTÁ BLOQUEADA
            lock_status = LoginTracker.is_account_locked(email)
            
            if lock_status.get('locked'):
                time_remaining = (lock_status['locked_until'] - datetime.utcnow()).total_seconds()
                minutes_remaining = int(time_remaining / 60)

                response_data = {
                    'error': 'Cuenta bloqueada',
                    'mensaje': f'Demasiados intentos fallidos. Intenta en {minutes_remaining} min.',
                    'locked_until': lock_status['locked_until'].isoformat(),
                    'minutes_remaining': minutes_remaining,
                    'info': '📧 Revisa tu email para el código de desbloqueo'
                }
                return make_response(jsonify(response_data), 403)

            # 5️⃣ VERIFICAR CONTRASEÑA
            if not usuario.check_password(data['contrasena']):
                # ❌ CONTRASEÑA INCORRECTA
                LoginTracker.record_attempt(email, False, ip_address, user_agent, 'contrasena_incorrecta')
                SecurityLog.log_event('login_failed', user_id=usuario.id_usuario, email=email, ip_address=ip_address, user_agent=user_agent, details={'reason': 'contrasena_incorrecta'})

                # 🔍 Verificar si debe bloquearse
                lock_result = LoginTracker.check_and_lock_account(email)
                
                # 6️⃣ SI SE BLOQUEÓ LA CUENTA
                if lock_result and lock_result.get('locked'):
                    response_data = {
                        'error': 'Cuenta bloqueada',
                        'mensaje': f"Has alcanzado el máximo de intentos fallidos ({lock_result.get('attempts', 5)}). Tu cuenta ha sido bloqueada por 10 minutos.",
                        'locked_until': lock_result['locked_until'].isoformat() if lock_result.get('locked_until') else None,
                        'minutes_remaining': 10,
                        'info': '📧 Revisa tu correo para obtener el código de desbloqueo',
                        'unlock_code': lock_result.get('unlock_code'),
                        'action': 'POST /api/auth/unlock con tu email y el código de 6 dígitos'
                    }
                    return make_response(jsonify(response_data), 403)
                
                # ⚠️ AÚN NO SE BLOQUEA - Mostrar intentos restantes
                attempts = lock_result.get('attempts', 0) if lock_result else 0
                attempts_remaining = 5 - attempts
                
                response_data = {
                    'error': 'Credenciales inválidas',
                    'attempts_remaining': attempts_remaining,
                    'warning': f'⚠️ Te quedan {attempts_remaining} intentos antes de bloquear la cuenta'
                }
                return make_response(jsonify(response_data), 401)

            # 7️⃣ ✅ LOGIN EXITOSO
            LoginTracker.record_attempt(email, True, ip_address, user_agent)
            LoginTracker.reset_failed_attempts(email)

            usuario.last_login_at = datetime.utcnow()
            usuario.last_login_ip = ip_address
            db.session.commit()

            tokens = TokenManager.create_tokens(
                user_id=usuario.id_usuario,
                email=usuario.email,
                nombre=usuario.nombre,
                rol=usuario.rol,
                ip_address=ip_address,
                user_agent=user_agent
            )

            return {
                'mensaje': 'Login exitoso',
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'expires_in': tokens['expires_in'],
                'usuario': usuario.to_dict()
            }, 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ ERROR LOGIN: {e}")
            import traceback
            traceback.print_exc()
            auth_ns.abort(500, error=str(e))


# ============================================
# 🔄 REFRESH TOKEN
# ============================================

@auth_ns.route('/refresh')
class RefreshToken(Resource):
    @auth_ns.expect(refresh_model)
    @rate_limit(max_requests=30, window_minutes=15)
    def post(self):
        """Renueva el access token"""
        try:
            data = auth_ns.payload

            if not data.get('refresh_token'):
                auth_ns.abort(400, error='Refresh token requerido')

            result = TokenManager.refresh_access_token(
                refresh_token_str=data['refresh_token'],
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )

            if not result:
                auth_ns.abort(401, error='Refresh token inválido o expirado')

            return {
                'mensaje': 'Token renovado',
                'access_token': result['access_token'],
                'expires_in': result['expires_in']
            }, 200

        except Exception as e:
            auth_ns.abort(500, error=str(e))


# ============================================
# 🔓 DESBLOQUEAR CUENTA
# ============================================

@auth_ns.route('/unlock')
class UnlockAccount(Resource):
    @auth_ns.expect(unlock_model)
    @rate_limit(max_requests=5, window_minutes=15)
    def post(self):
        """Desbloquea cuenta con código de 6 dígitos"""
        try:
            data = auth_ns.payload
            
            if not data.get('email') or not data.get('unlock_code'):
                auth_ns.abort(400, error='Email y código requeridos')
            
            usuario = Usuario.query.filter_by(email=data['email'].lower()).first()
            
            if not usuario:
                auth_ns.abort(404, error='Usuario no encontrado')
            
            active_lockout = AccountLockout.get_active_lockout(usuario.id_usuario)
            
            if not active_lockout:
                auth_ns.abort(404, error='No hay bloqueo activo')
            
            if not active_lockout.verify_unlock_code(data['unlock_code']):
                auth_ns.abort(400, error='Código inválido o expirado')
            
            active_lockout.unlock()
            usuario.failed_login_attempts = 0
            usuario.locked_until = None
            db.session.commit()
            
            return {'mensaje': '✅ Cuenta desbloqueada', 'info': 'Ya puedes iniciar sesión'}, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))


# ============================================
# 🚪 LOGOUT
# ============================================

@auth_ns.route('/logout')
class Logout(Resource):
    @jwt_required()
    def post(self):
        """Cierra sesión"""
        try:
            jwt_data = get_jwt()
            current_user_id = int(get_jwt_identity())
            TokenManager.revoke_token(jwt_data['jti'], 'access', current_user_id, 'logout')
            return {'mensaje': 'Logout exitoso'}, 200
        except Exception as e:
            auth_ns.abort(500, error=str(e))


# ============================================
# 👤 USUARIO ACTUAL
# ============================================

@auth_ns.route('/me')
class GetCurrentUser(Resource):
    @jwt_required()
    def get(self):
        """Obtiene usuario autenticado"""
        try:
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            if not usuario:
                auth_ns.abort(404, error='Usuario no encontrado')
            return usuario.to_dict(), 200
        except Exception as e:
            auth_ns.abort(500, error=str(e))
# ============================================
# 👑 SUPER ADMIN - GESTION DE ORGANIZADORES
# ============================================

def superadmin_required():
    """Decorador para verificar si es superadmin"""
    def wrapper(fn):
        from functools import wraps
        @wraps(fn)
        def decorator(*args, **kwargs):
            current_user_id = int(get_jwt_identity())
            usuario = Usuario.query.get(current_user_id)
            if not usuario or usuario.rol != 'superadmin':
                auth_ns.abort(403, error='Acceso denegado. Se requiere rol de superadmin')
            return fn(*args, **kwargs)
        return decorator
    return wrapper


# Modelos para documentacion
organizador_model = auth_ns.model('Organizador', {
    'nombre': fields.String(required=True, description='Nombre del organizador'),
    'email': fields.String(required=True, description='Email del organizador (Gmail)'),
    'nombre_campeonato': fields.String(required=True, description='Nombre del campeonato que gestionara')
})

organizador_update_model = auth_ns.model('OrganizadorUpdate', {
    'nombre': fields.String(description='Nombre del organizador'),
    'activo': fields.Boolean(description='Estado activo/inactivo')
})


@auth_ns.route('/superadmin/dashboard')
class SuperAdminDashboard(Resource):
    @jwt_required()
    @superadmin_required()
    def get(self):
        """Dashboard con estadisticas generales del sistema"""
        try:
            from app.models.equipo import Equipo
            from app.models.campeonato import Campeonato
            from app.models.partido import Partido
            
            total_usuarios = Usuario.query.count()
            total_admins = Usuario.query.filter_by(rol='admin').count()
            total_lideres = Usuario.query.filter_by(rol='lider').count()
            total_equipos = Equipo.query.count()
            total_campeonatos = Campeonato.query.count()
            total_partidos = Partido.query.count()
            
            # Ultimos organizadores registrados
            ultimos_admins = Usuario.query.filter_by(rol='admin').order_by(Usuario.fecha_registro.desc()).limit(5).all()
            
            return {
                'estadisticas': {
                    'total_usuarios': total_usuarios,
                    'total_organizadores': total_admins,
                    'total_lideres': total_lideres,
                    'total_equipos': total_equipos,
                    'total_campeonatos': total_campeonatos,
                    'total_partidos': total_partidos
                },
                'ultimos_organizadores': [admin.to_dict() for admin in ultimos_admins]
            }, 200
            
        except Exception as e:
            auth_ns.abort(500, error=str(e))


@auth_ns.route('/superadmin/organizadores')
class SuperAdminOrganizadores(Resource):
    @jwt_required()
    @superadmin_required()
    def get(self):
        """Lista todos los organizadores (admins)"""
        try:
            organizadores = Usuario.query.filter_by(rol='admin').order_by(Usuario.fecha_registro.desc()).all()
            return {
                'organizadores': [org.to_dict() for org in organizadores],
                'total': len(organizadores)
            }, 200
        except Exception as e:
            auth_ns.abort(500, error=str(e))
    
    @jwt_required()
    @superadmin_required()
    @auth_ns.expect(organizador_model)
    def post(self):
        """Crear nuevo organizador y enviar credenciales por correo"""
        try:
            data = auth_ns.payload
            
            if not data.get('nombre') or not data.get('email'):
                auth_ns.abort(400, error='Nombre y email son requeridos')
            
            email = data['email'].lower()
            
            if not email.endswith('@gmail.com'):
                auth_ns.abort(400, error='Solo se permiten cuentas de Gmail')
            
            if Usuario.query.filter_by(email=email).first():
                auth_ns.abort(400, error='El email ya esta registrado')
            
            # Generar contrasena temporal
            contrasena_temporal = secrets.token_urlsafe(12)
            
            nuevo_organizador = Usuario(
                nombre=InputSanitizer.sanitize_string(data['nombre'], max_length=100),
                email=email,
                rol='admin',
                activo=True,
                email_verified=True  # Ya verificado porque lo crea el superadmin
            )
            nuevo_organizador.set_password(contrasena_temporal)
            
            db.session.add(nuevo_organizador)
            db.session.commit()
            
            # Enviar correo con credenciales
            email_enviado = False
            try:
                email_enviado = EmailService.send_organizador_credentials(
                    email=email,
                    nombre=data['nombre'],
                    contrasena=contrasena_temporal,
                    nombre_campeonato=data.get('nombre_campeonato', 'Tu Campeonato')
                )
            except Exception as e:
                print(f"⚠️ Error enviando email: {str(e)}")
            
            SecurityLog.log_event(
                event_type='login_success',
                user_id=nuevo_organizador.id_usuario,
                email=email,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                details={'action': 'superadmin_create_organizador'}
            )
            
            return {
                'mensaje': 'Organizador creado exitosamente',
                'organizador': nuevo_organizador.to_dict(),
                'email_enviado': email_enviado,
                'contrasena_temporal': contrasena_temporal if not email_enviado else None,
                'info': '📧 Se enviaron las credenciales por correo' if email_enviado else '⚠️ No se pudo enviar el correo, entrega la contrasena manualmente'
            }, 201
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))


@auth_ns.route('/superadmin/organizadores/<int:id>')
class SuperAdminOrganizadorDetail(Resource):
    @jwt_required()
    @superadmin_required()
    def get(self, id):
        """Obtener detalle de un organizador"""
        try:
            organizador = Usuario.query.filter_by(id_usuario=id, rol='admin').first()
            if not organizador:
                auth_ns.abort(404, error='Organizador no encontrado')
            return organizador.to_dict(), 200
        except Exception as e:
            auth_ns.abort(500, error=str(e))
    
    @jwt_required()
    @superadmin_required()
    @auth_ns.expect(organizador_update_model)
    def put(self, id):
        """Actualizar organizador"""
        try:
            organizador = Usuario.query.filter_by(id_usuario=id, rol='admin').first()
            if not organizador:
                auth_ns.abort(404, error='Organizador no encontrado')
            
            data = auth_ns.payload
            
            if data.get('nombre'):
                organizador.nombre = InputSanitizer.sanitize_string(data['nombre'], max_length=100)
            
            if 'activo' in data:
                organizador.activo = data['activo']
            
            db.session.commit()
            
            return {
                'mensaje': 'Organizador actualizado',
                'organizador': organizador.to_dict()
            }, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))
    
    @jwt_required()
    @superadmin_required()
    def delete(self, id):
        """Desactivar organizador (no elimina, solo desactiva)"""
        try:
            organizador = Usuario.query.filter_by(id_usuario=id, rol='admin').first()
            if not organizador:
                auth_ns.abort(404, error='Organizador no encontrado')
            
            organizador.activo = False
            db.session.commit()
            
            return {
                'mensaje': 'Organizador desactivado',
                'organizador': organizador.to_dict()
            }, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))


@auth_ns.route('/superadmin/organizadores/<int:id>/reenviar-credenciales')
class SuperAdminReenviarCredenciales(Resource):
    @jwt_required()
    @superadmin_required()
    def post(self, id):
        """Generar nueva contrasena y reenviar credenciales"""
        try:
            organizador = Usuario.query.filter_by(id_usuario=id, rol='admin').first()
            if not organizador:
                auth_ns.abort(404, error='Organizador no encontrado')
            
            # Generar nueva contrasena
            nueva_contrasena = secrets.token_urlsafe(12)
            organizador.set_password(nueva_contrasena)
            db.session.commit()
            
            # Enviar correo
            email_enviado = False
            try:
                email_enviado = EmailService.send_organizador_credentials(
                    email=organizador.email,
                    nombre=organizador.nombre,
                    contrasena=nueva_contrasena,
                    nombre_campeonato='Tu Campeonato'
                )
            except Exception as e:
                print(f"⚠️ Error enviando email: {str(e)}")
            
            return {
                'mensaje': 'Credenciales regeneradas',
                'email_enviado': email_enviado,
                'contrasena_temporal': nueva_contrasena if not email_enviado else None
            }, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))
    # ============================================
# 🔐 RECUPERAR CONTRASEÑA
# ============================================

forgot_password_model = auth_ns.model('ForgotPassword', {
    'email': fields.String(required=True, description='Email del usuario')
})

reset_password_model = auth_ns.model('ResetPassword', {
    'email': fields.String(required=True, description='Email del usuario'),
    'code': fields.String(required=True, description='Codigo de 6 digitos'),
    'new_password': fields.String(required=True, description='Nueva contraseña')
})


@auth_ns.route('/forgot-password')
class ForgotPassword(Resource):
    @auth_ns.expect(forgot_password_model)
    @rate_limit(max_requests=5, window_minutes=15)
    def post(self):
        """Solicitar codigo para restablecer contraseña"""
        try:
            data = auth_ns.payload
            
            if not data.get('email'):
                auth_ns.abort(400, error='Email requerido')
            
            email = data['email'].lower()
            usuario = Usuario.query.filter_by(email=email).first()
            
            # Por seguridad, siempre responder igual (no revelar si existe el email)
            response_message = {
                'mensaje': 'Si el email existe, recibiras un codigo de verificacion',
                'info': '📧 Revisa tu bandeja de entrada y spam'
            }
            
            if not usuario:
                return response_message, 200
            
            # Generar codigo de 6 digitos
            reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
            
            # Guardar codigo en el usuario (expira en 15 min)
            from datetime import timedelta
            usuario.password_reset_code = reset_code
            usuario.password_reset_expires = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
            
            # Enviar email
            try:
                EmailService.send_password_reset(
                    email=usuario.email,
                    nombre=usuario.nombre,
                    reset_code=reset_code
                )
            except Exception as e:
                print(f"⚠️ Error enviando email: {str(e)}")
            
            return response_message, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))


@auth_ns.route('/reset-password')
class ResetPassword(Resource):
    @auth_ns.expect(reset_password_model)
    @rate_limit(max_requests=5, window_minutes=15)
    def post(self):
        """Restablecer contraseña con codigo"""
        try:
            data = auth_ns.payload
            
            if not data.get('email') or not data.get('code') or not data.get('new_password'):
                auth_ns.abort(400, error='Email, codigo y nueva contraseña son requeridos')
            
            email = data['email'].lower()
            usuario = Usuario.query.filter_by(email=email).first()
            
            if not usuario:
                auth_ns.abort(400, error='Codigo invalido o expirado')
            
            # Verificar codigo
            if not usuario.password_reset_code or usuario.password_reset_code != data['code']:
                auth_ns.abort(400, error='Codigo invalido o expirado')
            
            # Verificar expiracion
            if not usuario.password_reset_expires or usuario.password_reset_expires < datetime.utcnow():
                auth_ns.abort(400, error='Codigo invalido o expirado')
            
            # Validar nueva contraseña (minimo 8 caracteres)
            if len(data['new_password']) < 8:
                auth_ns.abort(400, error='La contraseña debe tener minimo 8 caracteres')
            
            # Actualizar contraseña
            usuario.set_password(data['new_password'])
            usuario.password_reset_code = None
            usuario.password_reset_expires = None
            
            # Resetear intentos fallidos por si estaba bloqueado
            usuario.failed_login_attempts = 0
            usuario.locked_until = None
            
            db.session.commit()
            
            return {
                'mensaje': '✅ Contraseña actualizada exitosamente',
                'info': 'Ya puedes iniciar sesion con tu nueva contraseña'
            }, 200
            
        except Exception as e:
            db.session.rollback()
            auth_ns.abort(500, error=str(e))