from app.extensions import db
from app.models.usuario import Usuario
from app.models.login_attempt import LoginAttempt
from app.models.account_lockout import AccountLockout
from app.security.email_service import EmailService
from flask import current_app, request
from datetime import datetime, timedelta
import secrets

class LoginTracker:
    """
    Rastrea intentos de login y gestiona bloqueos de cuenta
    
    Funcionalidades:
    - Registrar intentos exitosos y fallidos
    - Bloquear cuenta después de X intentos
    - Generar códigos de desbloqueo
    - Enviar emails de notificación
    - Verificar si una cuenta está bloqueada
    """
    
    @staticmethod
    def record_attempt(email: str, success: bool, ip_address: str = None, user_agent: str = None, failure_reason: str = None):
        """
        Registra un intento de login en la BD
        
        Args:
            email: Email del usuario
            success: True si fue exitoso, False si falló
            ip_address: IP del cliente
            user_agent: Navegador/cliente usado
            failure_reason: Razón del fallo (credenciales incorrectas, cuenta inactiva, etc.)
        """
        try:
            # Obtener IP y User-Agent si no se proporcionaron
            if ip_address is None:
                ip_address = request.remote_addr if request else 'unknown'
            
            if user_agent is None:
                user_agent = request.headers.get('User-Agent', 'unknown') if request else 'unknown'
            
            # Crear registro
            attempt = LoginAttempt(
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                failure_reason=failure_reason
            )
            
            db.session.add(attempt)
            db.session.commit()
            
            print(f"{'✅' if success else '❌'} Login attempt registrado: {email} desde {ip_address}")
            
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Error registrando intento de login: {str(e)}")
    
    
    @staticmethod
    def check_and_lock_account(email: str) -> dict:
        """
        Verifica intentos fallidos y bloquea cuenta si es necesario
        
        Args:
            email: Email del usuario a verificar
        
        Returns:
            dict: {
                'locked': bool,
                'attempts': int,
                'locked_until': datetime (si está bloqueado),
                'unlock_code': str (si se generó código)
            }
        """
        try:
            # Buscar usuario
            usuario = Usuario.query.filter_by(email=email).first()
            if not usuario:
                return {'locked': False, 'attempts': 0}
            
            # Configuración
            max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
            lockout_minutes = current_app.config.get('LOCKOUT_DURATION_MINUTES', 10)
            
            # Contar intentos fallidos recientes (últimos 30 minutos)
            time_window = datetime.utcnow() - timedelta(minutes=30)
            failed_attempts = LoginAttempt.query.filter(
                LoginAttempt.email == email,
                LoginAttempt.success == False,
                LoginAttempt.attempted_at >= time_window
            ).count()
            
            print(f"🔍 {email} tiene {failed_attempts}/{max_attempts} intentos fallidos")
            
            # Si alcanzó el límite, bloquear
            if failed_attempts >= max_attempts:
                locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
                
                # Generar código de desbloqueo
                unlock_code = LoginTracker._generate_unlock_code()
                code_expires = datetime.utcnow() + timedelta(
                    minutes=current_app.config.get('UNLOCK_CODE_EXPIRES_MINUTES', 15)
                )
                
                # Crear registro de bloqueo
                lockout = AccountLockout(
                    user_id=usuario.id_usuario,
                    locked_until=locked_until,
                    reason='intentos_fallidos',
                    unlock_code=unlock_code,
                    unlock_code_expires=code_expires
                )
                
                # Actualizar usuario
                usuario.failed_login_attempts = failed_attempts
                usuario.locked_until = locked_until
                
                db.session.add(lockout)
                db.session.commit()
                
                print(f"🔒 Cuenta bloqueada: {email} hasta {locked_until}")
                
                # Enviar email de desbloqueo (si está habilitado)
                if current_app.config.get('SEND_LOCKOUT_EMAIL', True):
                    EmailService.send_unlock_code(
                        email=email,
                        nombre=usuario.nombre,
                        unlock_code=unlock_code,
                        locked_until=locked_until.strftime('%H:%M:%S'),
                        attempts=failed_attempts
                    )
                
                return {
                    'locked': True,
                    'attempts': failed_attempts,
                    'locked_until': locked_until,
                    'unlock_code': unlock_code  # Solo para testing, en producción no devolver
                }
            
            # No se alcanzó el límite
            return {
                'locked': False,
                'attempts': failed_attempts
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error verificando bloqueo: {str(e)}")
            return {'locked': False, 'attempts': 0, 'error': str(e)}
    
    
    @staticmethod
    def is_account_locked(email: str) -> dict:
        """
        Verifica si una cuenta está actualmente bloqueada
        
        Args:
            email: Email del usuario
        
        Returns:
            dict: {
                'locked': bool,
                'locked_until': datetime (si está bloqueado),
                'reason': str
            }
        """
        try:
            usuario = Usuario.query.filter_by(email=email).first()
            if not usuario:
                return {'locked': False}
            
            # Verificar si tiene bloqueo activo en BD
            now = datetime.utcnow()
            active_lockout = AccountLockout.query.filter(
                AccountLockout.user_id == usuario.id_usuario,
                AccountLockout.is_active == True,
                AccountLockout.locked_until > now
            ).first()
            
            if active_lockout:
                return {
                    'locked': True,
                    'locked_until': active_lockout.locked_until,
                    'reason': active_lockout.reason
                }
            
            # Verificar campo locked_until en usuario (fallback)
            if usuario.locked_until and usuario.locked_until > now:
                return {
                    'locked': True,
                    'locked_until': usuario.locked_until,
                    'reason': 'intentos_fallidos'
                }
            
            return {'locked': False}
            
        except Exception as e:
            print(f"❌ Error verificando bloqueo: {str(e)}")
            return {'locked': False, 'error': str(e)}
    
    
    @staticmethod
    def unlock_account_with_code(email: str, unlock_code: str) -> dict:
        """
        Desbloquea una cuenta usando el código enviado por email
        
        Args:
            email: Email del usuario
            unlock_code: Código de 6 dígitos
        
        Returns:
            dict: {
                'success': bool,
                'message': str
            }
        """
        try:
            usuario = Usuario.query.filter_by(email=email).first()
            if not usuario:
                return {'success': False, 'message': 'Usuario no encontrado'}
            
            # Buscar bloqueo activo con código válido
            now = datetime.utcnow()
            lockout = AccountLockout.query.filter(
                AccountLockout.user_id == usuario.id_usuario,
                AccountLockout.is_active == True,
                AccountLockout.unlock_code == unlock_code,
                AccountLockout.unlock_code_expires > now
            ).first()
            
            if not lockout:
                return {'success': False, 'message': 'Código inválido o expirado'}
            
            # Desbloquear
            lockout.is_active = False
            lockout.unlocked_at = now
            usuario.locked_until = None
            usuario.failed_login_attempts = 0
            
            db.session.commit()
            
            print(f"🔓 Cuenta desbloqueada con código: {email}")
            
            return {'success': True, 'message': 'Cuenta desbloqueada exitosamente'}
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error desbloqueando cuenta: {str(e)}")
            return {'success': False, 'message': f'Error: {str(e)}'}
    
    
    @staticmethod
    def reset_failed_attempts(email: str):
        """
        Resetea el contador de intentos fallidos (cuando login es exitoso)
        
        Args:
            email: Email del usuario
        """
        try:
            usuario = Usuario.query.filter_by(email=email).first()
            if usuario:
                usuario.failed_login_attempts = 0
                usuario.locked_until = None
                db.session.commit()
                print(f"✅ Intentos fallidos reseteados: {email}")
                
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ Error reseteando intentos: {str(e)}")
    
    
    @staticmethod
    def _generate_unlock_code() -> str:
        """
        Genera un código de desbloqueo de 6 dígitos
        
        Returns:
            str: Código numérico de 6 dígitos
        """
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    
    @staticmethod
    def get_recent_attempts(email: str, hours: int = 24) -> list:
        """
        Obtiene los intentos de login recientes de un usuario
        
        Args:
            email: Email del usuario
            hours: Horas hacia atrás a buscar (default: 24)
        
        Returns:
            list: Lista de intentos con detalles
        """
        try:
            time_window = datetime.utcnow() - timedelta(hours=hours)
            attempts = LoginAttempt.query.filter(
                LoginAttempt.email == email,
                LoginAttempt.attempted_at >= time_window
            ).order_by(LoginAttempt.attempted_at.desc()).all()
            
            return [{
                'id': a.id,
                'email': a.email,
                'success': a.success,
                'ip_address': a.ip_address,
                'user_agent': a.user_agent,
                'attempted_at': a.attempted_at.isoformat(),
                'failure_reason': a.failure_reason
            } for a in attempts]
            
        except Exception as e:
            print(f"❌ Error obteniendo intentos: {str(e)}")
            return []