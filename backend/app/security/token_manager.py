from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity
from datetime import datetime, timedelta
from app.extensions import db
from app.models.token_blacklist import TokenBlacklist
from app.models.refresh_token import RefreshToken
from app.models.security_log import SecurityLog

class TokenManager:
    """
    Gestor centralizado de tokens JWT
    
    ¿Qué hace este manager?
    - Crea access tokens (corta duración: 15 min)
    - Crea refresh tokens (larga duración: 30 días)
    - Verifica si un token está en blacklist
    - Revoca tokens (logout, cambio password)
    - Renueva access tokens usando refresh tokens
    
    Flujo completo:
    1. Login → genera access + refresh token
    2. Cada petición usa access token
    3. Access token expira (15 min) → usa refresh token para obtener nuevo access
    4. Refresh token expira (30 días) → usuario debe hacer login de nuevo
    """
    
    # Configuración de tiempos de expiración
    ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    @staticmethod
    def create_tokens(user_id, email, nombre, rol, ip_address=None, user_agent=None):
        """
        Crea un par de tokens (access + refresh) para el usuario
        
        Args:
            user_id: ID del usuario
            email: Email del usuario
            nombre: Nombre del usuario
            rol: Rol (admin, lider, espectador)
            ip_address: IP desde donde se creó
            user_agent: Navegador/dispositivo
        
        Returns:
            dict: {
                'access_token': 'eyJ0eXAiOiJKV1...',
                'refresh_token': 'a1b2c3d4e5f6...',
                'expires_in': 900  # segundos (15 min)
            }
        
        ¿Qué contiene el access token?
        - identity: user_id (para identificar al usuario)
        - claims adicionales: email, nombre, rol
        - exp: cuándo expira
        - iat: cuándo se creó
        - jti: ID único del token
        """
        
        # 1. Crear access token
        access_token = create_access_token(
            identity=str(user_id),
            additional_claims={
                'email': email,
                'nombre': nombre,
                'rol': rol,
                'type': 'access'
            },
            expires_delta=TokenManager.ACCESS_TOKEN_EXPIRES
        )
        
        # 2. Crear refresh token en la BD
        refresh_token_obj = RefreshToken.create_refresh_token(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            days=TokenManager.REFRESH_TOKEN_EXPIRES.days
        )
        
        db.session.add(refresh_token_obj)
        db.session.commit()
        
        # 3. Log del evento
        SecurityLog.log_event(
            event_type='login_success',
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                'refresh_token_id': refresh_token_obj.id,
                'expires_in_days': TokenManager.REFRESH_TOKEN_EXPIRES.days
            }
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token_obj.token,
            'expires_in': int(TokenManager.ACCESS_TOKEN_EXPIRES.total_seconds()),
            'refresh_expires_in': int(TokenManager.REFRESH_TOKEN_EXPIRES.total_seconds())
        }
    
    @staticmethod
    def is_token_revoked(jti):
        """
        Verifica si un token está en la blacklist
        
        Args:
            jti: JWT ID del token
        
        Returns:
            bool: True si está revocado, False si es válido
        
        ¿Cuándo se llama esto?
        - Automáticamente en cada petición por el decorador @jwt_required()
        - Flask-JWT-Extended verifica la blacklist antes de permitir acceso
        """
        token = TokenBlacklist.query.filter_by(jti=jti).first()
        return token is not None
    
    @staticmethod
    def revoke_token(jti, token_type, user_id, reason='logout'):
        """
        Revoca un token (lo agrega a la blacklist)
        
        Args:
            jti: JWT ID del token
            token_type: 'access' o 'refresh'
            user_id: ID del usuario dueño
            reason: Razón de revocación
        
        ¿Cuándo usar esto?
        - Logout: revocar access y refresh token
        - Cambio de contraseña: revocar TODOS los tokens del usuario
        - Actividad sospechosa: revocar tokens
        
        Ejemplo:
            # Usuario hace logout
            jti = get_jwt()['jti']
            TokenManager.revoke_token(jti, 'access', user_id, 'logout')
        """
        
        # Verificar si ya está revocado
        existing = TokenBlacklist.query.filter_by(jti=jti).first()
        if existing:
            return existing
        
        # Calcular cuándo expira el token
        # (necesitamos guardarlo para limpiar tokens viejos después)
        if token_type == 'access':
            expires_at = datetime.utcnow() + TokenManager.ACCESS_TOKEN_EXPIRES
        else:
            expires_at = datetime.utcnow() + TokenManager.REFRESH_TOKEN_EXPIRES
        
        # Crear registro en blacklist
        blacklisted_token = TokenBlacklist(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=expires_at,
            reason=reason
        )
        
        db.session.add(blacklisted_token)
        db.session.commit()
        
        # Log del evento
        SecurityLog.log_event(
            event_type='token_revoked',
            user_id=user_id,
            details={
                'token_type': token_type,
                'reason': reason,
                'jti': jti
            }
        )
        
        return blacklisted_token
    
    @staticmethod
    def revoke_all_user_tokens(user_id, reason='password_change'):
        """
        Revoca TODOS los tokens de un usuario
        
        Args:
            user_id: ID del usuario
            reason: Razón de revocación
        
        ¿Cuándo usar esto?
        - Usuario cambia su contraseña
        - Detectamos actividad sospechosa
        - Usuario reporta que le robaron la cuenta
        - Admin quiere cerrar todas las sesiones de un usuario
        
        Esto cierra TODAS las sesiones en TODOS los dispositivos
        """
        
        # 1. Revocar todos los refresh tokens activos
        refresh_tokens = RefreshToken.query.filter_by(
            user_id=user_id,
            is_revoked=False
        ).all()
        
        for rt in refresh_tokens:
            rt.is_revoked = True
        
        # 2. Log del evento
        SecurityLog.log_event(
            event_type='token_revoked',
            user_id=user_id,
            details={
                'reason': reason,
                'tokens_revoked': len(refresh_tokens),
                'action': 'revoke_all'
            }
        )
        
        db.session.commit()
        
        return len(refresh_tokens)
    
    @staticmethod
    def refresh_access_token(refresh_token_str, ip_address=None, user_agent=None):
        """
        Crea un nuevo access token usando un refresh token
        
        Args:
            refresh_token_str: String del refresh token
            ip_address: IP desde donde se solicita
            user_agent: Navegador/dispositivo
        
        Returns:
            dict o None: {
                'access_token': 'nuevo_token...',
                'expires_in': 900
            }
        
        ¿Cómo funciona?
        1. Cliente detecta que access token expiró (401)
        2. Cliente envía refresh token a endpoint /auth/refresh
        3. Backend verifica refresh token
        4. Si es válido, genera nuevo access token
        5. Cliente usa nuevo access token
        
        Flujo de seguridad:
        - Verifica que el refresh token exista en BD
        - Verifica que no esté revocado
        - Verifica que no haya expirado
        - (Opcional) Verifica que la IP/User-Agent coincidan
        """
        
        # 1. Buscar refresh token en BD
        refresh_token = RefreshToken.query.filter_by(
            token=refresh_token_str
        ).first()
        
        if not refresh_token:
            return None
        
        # 2. Verificar que sea válido
        if not refresh_token.is_valid():
            return None
        
        # 3. (Opcional) Verificar IP/User-Agent para detectar robo
        # Si el refresh token se creó en IP A y ahora se usa en IP B = sospechoso
        if refresh_token.ip_address and ip_address:
            if refresh_token.ip_address != ip_address:
                SecurityLog.log_event(
                    event_type='suspicious_activity',
                    user_id=refresh_token.user_id,
                    ip_address=ip_address,
                    details={
                        'reason': 'refresh_token_ip_mismatch',
                        'original_ip': refresh_token.ip_address,
                        'current_ip': ip_address
                    }
                )
                # Opción: revocar el token automáticamente
                # refresh_token.is_revoked = True
                # db.session.commit()
                # return None
        
        # 4. Obtener datos del usuario
        from app.models.usuario import Usuario
        usuario = Usuario.query.get(refresh_token.user_id)
        
        if not usuario or not usuario.activo:
            return None
        
        # 5. Crear nuevo access token
        access_token = create_access_token(
            identity=str(usuario.id_usuario),
            additional_claims={
                'email': usuario.email,
                'nombre': usuario.nombre,
                'rol': usuario.rol,
                'type': 'access'
            },
            expires_delta=TokenManager.ACCESS_TOKEN_EXPIRES
        )
        
        # 6. Log del evento
        SecurityLog.log_event(
            event_type='login_success',
            user_id=usuario.id_usuario,
            email=usuario.email,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                'action': 'token_refreshed',
                'refresh_token_id': refresh_token.id
            }
        )
        
        return {
            'access_token': access_token,
            'expires_in': int(TokenManager.ACCESS_TOKEN_EXPIRES.total_seconds())
        }
    
    @staticmethod
    def cleanup_expired_tokens():
        """
        Limpia tokens expirados de la blacklist
        
        ¿Por qué es importante?
        - La blacklist crece indefinidamente
        - Tokens expirados ya no sirven, no necesitamos verificarlos
        - Mejora el rendimiento de las consultas
        
        ¿Cuándo ejecutar esto?
        - Tarea programada (cron): cada día/semana
        - O antes de cada verificación (con cache)
        
        Ejemplo cron:
            # Ejecutar todos los días a las 3 AM
            0 3 * * * cd /ruta/backend && python -c "from app.security.token_manager import TokenManager; TokenManager.cleanup_expired_tokens()"
        """
        
        # Eliminar tokens de blacklist que ya expiraron
        deleted = TokenBlacklist.query.filter(
            TokenBlacklist.expires_at < datetime.utcnow()
        ).delete()
        
        # Eliminar refresh tokens expirados y revocados
        deleted_refresh = RefreshToken.query.filter(
            RefreshToken.expires_at < datetime.utcnow(),
            RefreshToken.is_revoked == True
        ).delete()
        
        db.session.commit()
        
        return {
            'blacklist_cleaned': deleted,
            'refresh_tokens_cleaned': deleted_refresh
        }
