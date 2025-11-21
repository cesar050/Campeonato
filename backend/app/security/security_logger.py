from app.extensions import db
from app.models.security_log import SecurityLog
from flask import request
from datetime import datetime, timedelta
import json

class SecurityLogger:
    """
    Registra eventos de seguridad en la BD
    
    Funcionalidades:
    - Logging centralizado de eventos de seguridad
    - Soporte para JSON con detalles adicionales
    - Limpieza automática de logs antiguos
    - Consultas por tipo de evento, usuario, fecha
    """
    
    @staticmethod
    def log_event(
        event_type: str,
        user_id: int = None,
        email: str = None,
        ip_address: str = None,
        user_agent: str = None,
        details: dict = None
    ):
        """
        Registra un evento de seguridad
        
        Args:
            event_type: Tipo de evento (login_success, login_failed, etc.)
            user_id: ID del usuario (opcional)
            email: Email del usuario (opcional)
            ip_address: IP del cliente (se obtiene auto si no se pasa)
            user_agent: User-Agent del cliente (se obtiene auto si no se pasa)
            details: Diccionario con información adicional (se guarda como JSON)
        """
        try:
            # Obtener IP y User-Agent si no se proporcionaron
            if ip_address is None:
                ip_address = request.remote_addr if request else 'unknown'
            
            if user_agent is None:
                user_agent = request.headers.get('User-Agent', 'unknown') if request else 'unknown'
            
            # Convertir details a JSON
            details_json = json.dumps(details) if details else None
            
            # Crear log
            log = SecurityLog(
                event_type=event_type,
                user_id=user_id,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details_json
            )
            
            db.session.add(log)
            db.session.commit()
            
            # Emoji según tipo de evento
            emoji = {
                'login_success': '✅',
                'login_failed': '❌',
                'logout': '👋',
                'password_changed': '🔑',
                'account_locked': '🔒',
                'account_unlocked': '🔓',
                'token_revoked': '🚫',
                'suspicious_activity': '⚠️'
            }.get(event_type, '📝')
            
            print(f"{emoji} Security Log: {event_type} | {email or 'N/A'} | {ip_address}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error logging security event: {str(e)}")
    
    
    @staticmethod
    def log_login_success(user_id: int, email: str, ip_address: str = None, user_agent: str = None):
        """
        Atajo para registrar login exitoso
        """
        SecurityLogger.log_event(
            event_type='login_success',
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={'action': 'Usuario inició sesión correctamente'}
        )
    
    
    @staticmethod
    def log_login_failed(email: str, reason: str, ip_address: str = None, user_agent: str = None):
        """
        Atajo para registrar login fallido
        """
        SecurityLogger.log_event(
            event_type='login_failed',
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={'reason': reason, 'action': 'Intento de login fallido'}
        )
    
    
    @staticmethod
    def log_logout(user_id: int, email: str, ip_address: str = None):
        """
        Atajo para registrar logout
        """
        SecurityLogger.log_event(
            event_type='logout',
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            details={'action': 'Usuario cerró sesión'}
        )
    
    
    @staticmethod
    def log_account_locked(user_id: int, email: str, attempts: int, locked_until: datetime):
        """
        Atajo para registrar bloqueo de cuenta
        """
        SecurityLogger.log_event(
            event_type='account_locked',
            user_id=user_id,
            email=email,
            details={
                'action': 'Cuenta bloqueada por intentos fallidos',
                'failed_attempts': attempts,
                'locked_until': locked_until.isoformat()
            }
        )
    
    
    @staticmethod
    def log_account_unlocked(user_id: int, email: str, method: str):
        """
        Atajo para registrar desbloqueo de cuenta
        """
        SecurityLogger.log_event(
            event_type='account_unlocked',
            user_id=user_id,
            email=email,
            details={
                'action': 'Cuenta desbloqueada',
                'method': method  # 'code' o 'auto'
            }
        )
    
    
    @staticmethod
    def log_password_changed(user_id: int, email: str):
        """
        Atajo para registrar cambio de contraseña
        """
        SecurityLogger.log_event(
            event_type='password_changed',
            user_id=user_id,
            email=email,
            details={'action': 'Usuario cambió su contraseña'}
        )
    
    
    @staticmethod
    def log_token_revoked(user_id: int, email: str, token_type: str):
        """
        Atajo para registrar revocación de token
        """
        SecurityLogger.log_event(
            event_type='token_revoked',
            user_id=user_id,
            email=email,
            details={
                'action': 'Token revocado',
                'token_type': token_type
            }
        )
    
    
    @staticmethod
    def log_suspicious_activity(email: str = None, activity: str = None, ip_address: str = None):
        """
        Atajo para registrar actividad sospechosa
        """
        SecurityLogger.log_event(
            event_type='suspicious_activity',
            email=email,
            ip_address=ip_address,
            details={
                'action': 'Actividad sospechosa detectada',
                'description': activity
            }
        )
    
    
    @staticmethod
    def get_user_logs(user_id: int, limit: int = 50) -> list:
        """
        Obtiene los logs de seguridad de un usuario
        
        Args:
            user_id: ID del usuario
            limit: Cantidad máxima de registros (default: 50)
        
        Returns:
            list: Lista de logs
        """
        try:
            logs = SecurityLog.query.filter(
                SecurityLog.user_id == user_id
            ).order_by(
                SecurityLog.created_at.desc()
            ).limit(limit).all()
            
            return [{
                'id': log.id,
                'event_type': log.event_type,
                'email': log.email,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat(),
                'details': json.loads(log.details) if log.details else None
            } for log in logs]
            
        except Exception as e:
            print(f"❌ Error obteniendo logs: {str(e)}")
            return []
    
    
    @staticmethod
    def get_recent_failed_logins(hours: int = 24, limit: int = 100) -> list:
        """
        Obtiene intentos de login fallidos recientes
        
        Args:
            hours: Horas hacia atrás (default: 24)
            limit: Cantidad máxima de registros
        
        Returns:
            list: Lista de intentos fallidos
        """
        try:
            time_window = datetime.utcnow() - timedelta(hours=hours)
            
            logs = SecurityLog.query.filter(
                SecurityLog.event_type == 'login_failed',
                SecurityLog.created_at >= time_window
            ).order_by(
                SecurityLog.created_at.desc()
            ).limit(limit).all()
            
            return [{
                'id': log.id,
                'email': log.email,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat(),
                'details': json.loads(log.details) if log.details else None
            } for log in logs]
            
        except Exception as e:
            print(f"❌ Error obteniendo failed logins: {str(e)}")
            return []
    
    
    @staticmethod
    def clean_old_logs(days: int = None):
        """
        Limpia logs antiguos según configuración
        
        Args:
            days: Días de retención (usa config si no se especifica)
        """
        try:
            from flask import current_app
            
            if days is None:
                days = current_app.config.get('SECURITY_LOG_RETENTION_DAYS', 90)
            
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            deleted = SecurityLog.query.filter(
                SecurityLog.created_at < cutoff_date
            ).delete()
            
            db.session.commit()
            
            if deleted > 0:
                print(f"🗑️ Security logs: {deleted} registros antiguos eliminados (> {days} días)")
            
            return deleted
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error limpiando logs: {str(e)}")
            return 0
    
    
    @staticmethod
    def get_stats(days: int = 7) -> dict:
        """
        Obtiene estadísticas de eventos de seguridad
        
        Args:
            days: Días hacia atrás para estadísticas
        
        Returns:
            dict: Estadísticas por tipo de evento
        """
        try:
            time_window = datetime.utcnow() - timedelta(days=days)
            
            logs = SecurityLog.query.filter(
                SecurityLog.created_at >= time_window
            ).all()
            
            stats = {}
            for log in logs:
                if log.event_type not in stats:
                    stats[log.event_type] = 0
                stats[log.event_type] += 1
            
            return {
                'period_days': days,
                'total_events': len(logs),
                'events_by_type': stats
            }
            
        except Exception as e:
            print(f"❌ Error obteniendo stats: {str(e)}")
            return {'error': str(e)}