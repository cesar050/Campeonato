from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.usuario import Usuario
from app.models.login_attempt import LoginAttempt
from app.models.account_lockout import AccountLockout
from app.models.security_log import SecurityLog
from app.utils.validators import validar_email
from app.security.token_manager import TokenManager
from app.security.email_service import EmailService
from datetime import datetime
import secrets

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Registro de nuevos usuarios (SOLO GMAIL)
    
    Body:
        {
            "nombre": "Juan Pérez",
            "email": "juan@gmail.com",  # Solo Gmail permitido
            "contrasena": "MiPassword123",
            "rol": "lider"  // opcional, default: lider
        }
    
    Returns:
        201: Usuario creado (debe verificar email)
        400: Error de validación
    """
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('nombre') or not data.get('email') or not data.get('contrasena'):
            return jsonify({'error': 'Nombre, email y contraseña son requeridos'}), 400
        
        if not validar_email(data['email']):
            return jsonify({'error': 'Email no válido'}), 400
        
        # ⚠️ VALIDAR QUE SEA GMAIL
        email = data['email'].lower()
        if not email.endswith('@gmail.com'):
            return jsonify({
                'error': 'Solo se permiten cuentas de Gmail',
                'mensaje': 'Por favor usa un email de Gmail (@gmail.com)'
            }), 400
        
        # Verificar si el email ya existe
        if Usuario.query.filter_by(email=email).first():
            return jsonify({'error': 'El email ya está registrado'}), 400
        
        # Generar token de verificación
        verification_token = secrets.token_urlsafe(32)
        
        # Crear nuevo usuario (INACTIVO hasta verificar)
        nuevo_usuario = Usuario(
            nombre=data['nombre'],
            email=email,
            rol=data.get('rol', 'lider'),
            activo=False,  # ← Inactivo hasta verificar email
            email_verified=False,
            email_verification_token=verification_token
        )
        nuevo_usuario.set_password(data['contrasena'])
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        # 📧 Enviar email de VERIFICACIÓN
        try:
            # Construir link de verificación
            verification_link = f"http://localhost:5000/api/auth/verify-email?token={verification_token}"
            
            email_sent = EmailService.send_verification_email(
                email=nuevo_usuario.email,
                nombre=nuevo_usuario.nombre,
                verification_link=verification_link
            )
            
            if not email_sent:
                print("⚠️ No se pudo enviar email de verificación")
                
        except Exception as e:
            print(f"⚠️ Error al enviar email de verificación: {str(e)}")
        
        # Log del evento
        SecurityLog.log_event(
            event_type='login_success',
            user_id=nuevo_usuario.id_usuario,
            email=nuevo_usuario.email,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            details={'action': 'register', 'email_verified': False}
        )
        
        return jsonify({
            'mensaje': 'Usuario registrado exitosamente',
            'info': '📧 Revisa tu correo de Gmail para activar tu cuenta',
            'email': nuevo_usuario.email,
            'email_verification_required': True
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    """
    Verifica el email del usuario mediante token
    
    Query params:
        token: Token de verificación enviado por email
    
    Returns:
        200: Email verificado, cuenta activada
        400: Token inválido o expirado
        404: Usuario no encontrado
    """
    try:
        token = request.args.get('token')
        
        if not token:
            return jsonify({'error': 'Token de verificación requerido'}), 400
        
        # Buscar usuario con ese token
        usuario = Usuario.query.filter_by(
            email_verification_token=token
        ).first()
        
        if not usuario:
            return jsonify({
                'error': 'Token inválido',
                'mensaje': 'El enlace de verificación no es válido o ya fue usado'
            }), 400
        
        # Verificar si ya estaba verificado
        if usuario.email_verified:
            return jsonify({
                'mensaje': 'Tu email ya está verificado',
                'info': 'Ya puedes iniciar sesión'
            }), 200
        
        # ✅ ACTIVAR CUENTA
        usuario.email_verified = True
        usuario.activo = True
        usuario.email_verification_token = None  # Invalidar token
        db.session.commit()
        
        # Log del evento
        SecurityLog.log_event(
            event_type='login_success',
            user_id=usuario.id_usuario,
            email=usuario.email,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            details={'action': 'email_verified'}
        )
        
        return jsonify({
            'mensaje': '✅ Email verificado exitosamente',
            'info': 'Tu cuenta está activa. Ya puedes iniciar sesión.',
            'email': usuario.email
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """
    Reenvía el email de verificación
    
    Body:
        {
            "email": "juan@gmail.com"
        }
    
    Returns:
        200: Email reenviado
        404: Usuario no encontrado
        400: Email ya verificado
    """
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({'error': 'Email requerido'}), 400
        
        email = data['email'].lower()
        
        # Buscar usuario
        usuario = Usuario.query.filter_by(email=email).first()
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar si ya está verificado
        if usuario.email_verified:
            return jsonify({
                'mensaje': 'Tu email ya está verificado',
                'info': 'Ya puedes iniciar sesión'
            }), 400
        
        # Generar nuevo token
        verification_token = secrets.token_urlsafe(32)
        usuario.email_verification_token = verification_token
        db.session.commit()
        
        # Reenviar email
        verification_link = f"http://localhost:5000/api/auth/verify-email?token={verification_token}"
        
        email_sent = EmailService.send_verification_email(
            email=usuario.email,
            nombre=usuario.nombre,
            verification_link=verification_link
        )
        
        if email_sent:
            return jsonify({
                'mensaje': '📧 Email de verificación reenviado',
                'info': 'Revisa tu correo de Gmail'
            }), 200
        else:
            return jsonify({'error': 'No se pudo enviar el email'}), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login con protección contra fuerza bruta
    
    Seguridad:
    - Máximo 5 intentos fallidos
    - Bloqueo de 10 minutos tras 5 intentos
    - Código de desbloqueo enviado por email
    - Logs de todos los intentos
    - Verificación de email obligatoria
    
    Body:
        {
            "email": "juan@gmail.com",
            "contrasena": "MiPassword123"
        }
    
    Returns:
        200: Login exitoso + tokens
        401: Credenciales inválidas
        403: Cuenta bloqueada o email no verificado
    """
    try:
        data = request.get_json()
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        
        # Validaciones básicas
        if not data.get('email') or not data.get('contrasena'):
            return jsonify({'error': 'Email y contraseña requeridos'}), 400
        
        email = data['email'].lower()
        
        # 1️⃣ VERIFICAR SI EL USUARIO EXISTE
        usuario = Usuario.query.filter_by(email=email).first()
        
        if not usuario:
            # Registrar intento fallido (email no existe)
            LoginAttempt.record_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason='email_no_existe'
            )
            
            SecurityLog.log_event(
                event_type='login_failed',
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                details={'reason': 'email_no_existe'}
            )
            
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # 2️⃣ VERIFICAR SI EL EMAIL ESTÁ VERIFICADO
        if not usuario.email_verified:
            LoginAttempt.record_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason='email_no_verificado'
            )
            
            SecurityLog.log_event(
                event_type='login_failed',
                user_id=usuario.id_usuario,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                details={'reason': 'email_no_verificado'}
            )
            
            return jsonify({
                'error': 'Email no verificado',
                'mensaje': 'Debes verificar tu email antes de iniciar sesión',
                'info': '📧 Revisa tu correo de Gmail y haz clic en el enlace de verificación',
                'action': 'Puedes solicitar un nuevo email de verificación en /api/auth/resend-verification'
            }), 403
        
        # 3️⃣ VERIFICAR SI LA CUENTA ESTÁ ACTIVA
        if not usuario.activo:
            LoginAttempt.record_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason='cuenta_inactiva'
            )
            
            SecurityLog.log_event(
                event_type='login_failed',
                user_id=usuario.id_usuario,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                details={'reason': 'cuenta_inactiva'}
            )
            
            return jsonify({'error': 'Cuenta inactiva. Contacta al administrador'}), 403
        
        # 4️⃣ VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA
        active_lockout = AccountLockout.get_active_lockout(usuario.id_usuario)
        
        if active_lockout and active_lockout.is_locked():
            # Calcular tiempo restante de bloqueo
            time_remaining = (active_lockout.locked_until - datetime.utcnow()).total_seconds()
            minutes_remaining = int(time_remaining / 60)
            
            LoginAttempt.record_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason='cuenta_bloqueada'
            )
            
            return jsonify({
                'error': 'Cuenta temporalmente bloqueada',
                'mensaje': f'Demasiados intentos fallidos. Intenta nuevamente en {minutes_remaining} minutos.',
                'locked_until': active_lockout.locked_until.isoformat(),
                'unlock_hint': 'Revisa tu email para obtener el código de desbloqueo',
                'minutes_remaining': minutes_remaining
            }), 403
        
        # 5️⃣ VERIFICAR CONTRASEÑA
        if not usuario.check_password(data['contrasena']):
            # Contraseña incorrecta
            
            # Registrar intento fallido
            LoginAttempt.record_attempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason='contrasena_incorrecta'
            )
            
            SecurityLog.log_event(
                event_type='login_failed',
                user_id=usuario.id_usuario,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                details={'reason': 'contrasena_incorrecta'}
            )
            
            # Contar intentos fallidos recientes (últimos 10 minutos)
            failed_attempts = LoginAttempt.count_recent_failures(email, minutes=10)
            
            # Incrementar contador en el modelo Usuario
            usuario.failed_login_attempts = failed_attempts
            db.session.commit()
            
            # 6️⃣ SI ALCANZÓ 5 INTENTOS → BLOQUEAR CUENTA
            if failed_attempts >= 5:
                # Crear bloqueo de 10 minutos
                lockout = AccountLockout.create_lockout(
                    user_id=usuario.id_usuario,
                    minutes=10,
                    reason='intentos_fallidos'
                )
                
                # Actualizar campo locked_until en usuario
                usuario.locked_until = lockout.locked_until
                db.session.commit()
                
                # 📧 ENVIAR EMAIL CON CÓDIGO DE DESBLOQUEO
                email_sent = EmailService.send_unlock_code(
                    email=usuario.email,
                    nombre=usuario.nombre,
                    unlock_code=lockout.unlock_code,
                    locked_until=lockout.locked_until.strftime('%H:%M:%S'),
                    attempts=failed_attempts
                )
                
                # Log del bloqueo
                SecurityLog.log_event(
                    event_type='account_locked',
                    user_id=usuario.id_usuario,
                    email=email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={
                        'reason': 'intentos_fallidos',
                        'attempts': failed_attempts,
                        'locked_minutes': 10,
                        'unlock_code': lockout.unlock_code,
                        'email_sent': email_sent
                    }
                )
                
                return jsonify({
                    'error': 'Cuenta bloqueada',
                    'mensaje': f'Has alcanzado el máximo de intentos fallidos ({failed_attempts}). Tu cuenta ha sido bloqueada por 10 minutos.',
                    'locked_until': lockout.locked_until.isoformat(),
                    'email_notification': 'Se ha enviado un código de desbloqueo a tu email' if email_sent else 'No se pudo enviar el email, espera 10 minutos'
                }), 403
            
            # Informar intentos restantes
            attempts_remaining = 5 - failed_attempts
            
            return jsonify({
                'error': 'Credenciales inválidas',
                'attempts_remaining': attempts_remaining,
                'warning': f'Te quedan {attempts_remaining} intentos antes de bloquear la cuenta'
            }), 401
        
        # 7️⃣ ✅ LOGIN EXITOSO
        
        # Resetear contador de intentos fallidos
        usuario.failed_login_attempts = 0
        usuario.last_login_at = datetime.utcnow()
        usuario.last_login_ip = ip_address
        db.session.commit()
        
        # Registrar intento exitoso
        LoginAttempt.record_attempt(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
        
        # Generar tokens usando TokenManager
        tokens = TokenManager.create_tokens(
            user_id=usuario.id_usuario,
            email=usuario.email,
            nombre=usuario.nombre,
            rol=usuario.rol,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'mensaje': 'Login exitoso',
            'access_token': tokens['access_token'],
            'refresh_token': tokens['refresh_token'],
            'expires_in': tokens['expires_in'],
            'usuario': usuario.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# 🔄 RENOVAR ACCESS TOKEN
# ============================================

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """
    Renueva el access token usando un refresh token
    
    ¿Cuándo usar esto?
    - Cada vez que el access token expire (15 min)
    - El frontend detecta 401 y automáticamente llama a este endpoint
    
    Body:
        {
            "refresh_token": "a1b2c3d4e5f6..."
        }
    
    Returns:
        200: Nuevo access token
        401: Refresh token inválido/expirado
    """
    try:
        data = request.get_json()
        
        if not data.get('refresh_token'):
            return jsonify({'error': 'Refresh token requerido'}), 400
        
        # Intentar renovar el token
        result = TokenManager.refresh_access_token(
            refresh_token_str=data['refresh_token'],
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        if not result:
            return jsonify({'error': 'Refresh token inválido o expirado'}), 401
        
        return jsonify({
            'mensaje': 'Token renovado',
            'access_token': result['access_token'],
            'expires_in': result['expires_in']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# 🚪 LOGOUT
# ============================================

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Cierra sesión revocando los tokens
    
    Headers:
        Authorization: Bearer <access_token>
    
    Body (opcional):
        {
            "refresh_token": "a1b2c3d4e5f6..."
        }
    
    Returns:
        200: Logout exitoso
    """
    try:
        # Obtener info del token actual
        jwt_data = get_jwt()
        jti = jwt_data['jti']
        current_user_id = int(get_jwt_identity())
        
        # Revocar el access token actual
        TokenManager.revoke_token(
            jti=jti,
            token_type='access',
            user_id=current_user_id,
            reason='logout'
        )
        
        # Si envió el refresh token, revocarlo también
        data = request.get_json() or {}
        if data.get('refresh_token'):
            from app.models.refresh_token import RefreshToken
            refresh_token = RefreshToken.query.filter_by(
                token=data['refresh_token'],
                user_id=current_user_id
            ).first()
            
            if refresh_token:
                refresh_token.is_revoked = True
                db.session.commit()
        
        # Log del evento
        SecurityLog.log_event(
            event_type='logout',
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            details={'jti': jti}
        )
        
        return jsonify({
            'mensaje': 'Logout exitoso'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# 👤 OBTENER USUARIO ACTUAL
# ============================================

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Obtiene información del usuario autenticado
    
    Headers:
        Authorization: Bearer <access_token>
    
    Returns:
        200: Datos del usuario
        404: Usuario no encontrado
    """
    try:
        current_user_id = int(get_jwt_identity())
        usuario = Usuario.query.get(current_user_id)
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({'usuario': usuario.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# 🔓 DESBLOQUEAR CUENTA CON CÓDIGO
# ============================================

@auth_bp.route('/unlock', methods=['POST'])
def unlock_account():
    """
    Desbloquea una cuenta usando el código de 6 dígitos
    
    Body:
        {
            "email": "juan@gmail.com",
            "unlock_code": "123456"
        }
    
    Returns:
        200: Cuenta desbloqueada
        400: Código inválido o expirado
        404: No hay bloqueo activo
    """
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('unlock_code'):
            return jsonify({'error': 'Email y código de desbloqueo requeridos'}), 400
        
        # Buscar usuario
        usuario = Usuario.query.filter_by(email=data['email'].lower()).first()
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Buscar bloqueo activo
        active_lockout = AccountLockout.get_active_lockout(usuario.id_usuario)
        
        if not active_lockout:
            return jsonify({'error': 'No hay bloqueo activo en esta cuenta'}), 404
        
        # Verificar código
        if not active_lockout.verify_unlock_code(data['unlock_code']):
            return jsonify({'error': 'Código de desbloqueo inválido o expirado'}), 400
        
        # Desbloquear cuenta
        active_lockout.unlock()
        
        # Resetear contador de intentos fallidos
        usuario.failed_login_attempts = 0
        usuario.locked_until = None
        db.session.commit()
        
        # Log del evento
        SecurityLog.log_event(
            event_type='account_unlocked',
            user_id=usuario.id_usuario,
            email=usuario.email,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            details={
                'method': 'unlock_code',
                'lockout_id': active_lockout.id
            }
        )
        
        return jsonify({
            'mensaje': 'Cuenta desbloqueada exitosamente',
            'info': 'Ya puedes iniciar sesión'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500