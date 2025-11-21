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

            if not data.get('nombre') or not data.get('email') or not data.get('contrasena'):
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
            nuevo_usuario.set_password(data['contrasena'])

            db.session.add(nuevo_usuario)
            db.session.commit()

            email_sent = False
            try:
                verification_link = f"http://localhost:5000/auth/verify-email?token={verification_token}"
                email_sent = EmailService.send_verification_email(
                    email=nuevo_usuario.email,
                    nombre=nuevo_usuario.nombre,
                    verification_link=verification_link
                )
            except Exception as e:
                print(f"⚠️ Error al enviar email de verificación: {str(e)}")

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
            if not usuario.email_verified:
                LoginTracker.record_attempt(email, False, ip_address, user_agent, 'email_no_verificado')
                auth_ns.abort(403, error='Email no verificado', info='📧 Revisa tu correo de Gmail')

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