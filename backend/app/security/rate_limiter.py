from app.extensions import db
from app.models.rate_limit import RateLimit
from flask import request, current_app
from datetime import datetime, timedelta

class RateLimiter:
    """
    Control de tasa de peticiones (Rate Limiting)
    
    Funcionalidades:
    - Limitar peticiones por IP (usuarios no autenticados)
    - Limitar peticiones por usuario (usuarios autenticados)
    - Bloquear temporalmente si se excede el límite
    - Limpiar registros antiguos automáticamente
    """
    
    @staticmethod
    def check_rate_limit(identifier: str, endpoint: str) -> dict:
        """
        Verifica si un usuario/IP puede hacer una petición
        
        Args:
            identifier: IP o user_id (ejemplo: "192.168.1.1" o "user_123")
            endpoint: Ruta del endpoint (ejemplo: "/api/auth/login")
        
        Returns:
            dict: {
                'allowed': bool,
                'remaining': int,
                'reset_at': datetime (si está bloqueado)
            }
        """
        try:
            # Verificar si rate limiting está habilitado
            if not current_app.config.get('RATE_LIMIT_ENABLED', True):
                return {'allowed': True, 'remaining': 999}
            
            # Configuración
            max_requests = current_app.config.get('RATE_LIMIT_REQUESTS', 100)
            window_minutes = current_app.config.get('RATE_LIMIT_WINDOW_MINUTES', 15)
            ban_minutes = current_app.config.get('RATE_LIMIT_BAN_DURATION_MINUTES', 30)
            
            now = datetime.utcnow()
            window_start = now - timedelta(minutes=window_minutes)
            
            # Buscar registro existente en la ventana actual
            rate_limit = RateLimit.query.filter(
                RateLimit.identifier == identifier,
                RateLimit.endpoint == endpoint,
                RateLimit.window_end > now
            ).first()
            
            # Si está bloqueado
            if rate_limit and rate_limit.blocked_until and rate_limit.blocked_until > now:
                return {
                    'allowed': False,
                    'remaining': 0,
                    'reset_at': rate_limit.blocked_until,
                    'message': f'Demasiadas peticiones. Bloqueado hasta {rate_limit.blocked_until.strftime("%H:%M:%S")}'
                }
            
            # Si no existe registro, crear uno nuevo
            if not rate_limit:
                window_end = now + timedelta(minutes=window_minutes)
                rate_limit = RateLimit(
                    identifier=identifier,
                    endpoint=endpoint,
                    requests_count=1,
                    window_start=now,
                    window_end=window_end
                )
                db.session.add(rate_limit)
                db.session.commit()
                
                print(f"📊 Rate limit iniciado: {identifier} en {endpoint} (1/{max_requests})")
                
                return {
                    'allowed': True,
                    'remaining': max_requests - 1
                }
            
            # Si existe, incrementar contador
            rate_limit.requests_count += 1
            
            # Verificar si excedió el límite
            if rate_limit.requests_count > max_requests:
                # Bloquear temporalmente
                rate_limit.blocked_until = now + timedelta(minutes=ban_minutes)
                db.session.commit()
                
                print(f"🚫 Rate limit excedido: {identifier} en {endpoint} bloqueado por {ban_minutes} minutos")
                
                return {
                    'allowed': False,
                    'remaining': 0,
                    'reset_at': rate_limit.blocked_until,
                    'message': f'Límite excedido. Bloqueado por {ban_minutes} minutos'
                }
            
            # Petición permitida
            db.session.commit()
            
            remaining = max_requests - rate_limit.requests_count
            print(f"✅ Rate limit OK: {identifier} en {endpoint} ({rate_limit.requests_count}/{max_requests})")
            
            return {
                'allowed': True,
                'remaining': remaining
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error verificando rate limit: {str(e)}")
            # En caso de error, permitir la petición (fail-open)
            return {'allowed': True, 'remaining': 999, 'error': str(e)}
    
    
    @staticmethod
    def get_identifier() -> str:
        """
        Obtiene el identificador para rate limiting
        
        Returns:
            str: IP del cliente o 'user_X' si está autenticado
        """
        from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
        
        try:
            # Intentar obtener usuario autenticado
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            
            if user_id:
                return f"user_{user_id}"
            
            # Si no está autenticado, usar IP
            return request.remote_addr if request else 'unknown'
            
        except Exception:
            # Fallback a IP
            return request.remote_addr if request else 'unknown'
    
    
    @staticmethod
    def clean_old_records(days: int = 7):
        """
        Limpia registros antiguos de rate limiting
        
        Args:
            days: Días de antigüedad para eliminar (default: 7)
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            deleted = RateLimit.query.filter(
                RateLimit.window_end < cutoff_date
            ).delete()
            
            db.session.commit()
            
            if deleted > 0:
                print(f"🗑️ Rate limiting: {deleted} registros antiguos eliminados")
            
            return deleted
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error limpiando rate limits: {str(e)}")
            return 0
    
    
    @staticmethod
    def reset_user_limit(identifier: str, endpoint: str = None):
        """
        Resetea el límite de un usuario/IP específico
        
        Args:
            identifier: IP o user_id
            endpoint: Si se especifica, solo resetea ese endpoint
        """
        try:
            query = RateLimit.query.filter(RateLimit.identifier == identifier)
            
            if endpoint:
                query = query.filter(RateLimit.endpoint == endpoint)
            
            deleted = query.delete()
            db.session.commit()
            
            print(f"🔄 Rate limit reseteado: {identifier}" + (f" en {endpoint}" if endpoint else ""))
            
            return deleted
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error reseteando rate limit: {str(e)}")
            return 0
    
    
    @staticmethod
    def get_user_stats(identifier: str) -> dict:
        """
        Obtiene estadísticas de rate limiting de un usuario/IP
        
        Args:
            identifier: IP o user_id
        
        Returns:
            dict: Estadísticas de uso
        """
        try:
            now = datetime.utcnow()
            
            records = RateLimit.query.filter(
                RateLimit.identifier == identifier,
                RateLimit.window_end > now
            ).all()
            
            total_requests = sum(r.requests_count for r in records)
            blocked = any(r.blocked_until and r.blocked_until > now for r in records)
            
            endpoints = {}
            for record in records:
                endpoints[record.endpoint] = {
                    'requests': record.requests_count,
                    'window_end': record.window_end.isoformat(),
                    'blocked': record.blocked_until.isoformat() if record.blocked_until else None
                }
            
            return {
                'identifier': identifier,
                'total_requests': total_requests,
                'blocked': blocked,
                'endpoints': endpoints
            }
            
        except Exception as e:
            print(f"❌ Error obteniendo stats: {str(e)}")
            return {'error': str(e)}