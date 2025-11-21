from flask_mail import Message
from app.extensions import mail
from flask import current_app
import os

class EmailService:
    """
    Servicio para envío de emails
    
    Funcionalidades:
    - Enviar email de verificación (registro)
    - Enviar código de desbloqueo (seguridad)
    """
    
    @staticmethod
    def send_verification_email(email: str, nombre: str, verification_link: str) -> bool:
        """
        Envía email de verificación al registrarse
        
        Args:
            email: Email del usuario (Gmail)
            nombre: Nombre del usuario
            verification_link: Link con token de verificación
        
        Returns:
            bool: True si se envió exitosamente
        """
        try:
            subject = '✅ Verifica tu cuenta - Sistema de Campeonatos'
            
            # HTML del email
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 40px 30px;
                        text-align: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-size: 28px;
                    }}
                    .header p {{
                        margin: 10px 0 0 0;
                        opacity: 0.9;
                    }}
                    .content {{
                        padding: 40px 30px;
                    }}
                    .welcome-box {{
                        background-color: #f0f7ff;
                        border-left: 4px solid #2196F3;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .btn {{
                        display: inline-block;
                        padding: 15px 40px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        margin: 20px 0;
                    }}
                    .btn:hover {{
                        transform: scale(1.05);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    }}
                    .info-box {{
                        background-color: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .footer {{
                        background-color: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 14px;
                    }}
                    .link-box {{
                        background-color: #f8f9fa;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                        word-break: break-all;
                        font-size: 12px;
                        color: #6c757d;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 ¡Bienvenido a Campeonatos!</h1>
                        <p>Solo falta un paso para activar tu cuenta</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        
                        <div class="welcome-box">
                            <strong>✨ ¡Gracias por registrarte!</strong><br>
                            Tu cuenta ha sido creada exitosamente en el Sistema de Gestión de Campeonatos Barriales.
                        </div>
                        
                        <p>Para comenzar a usar tu cuenta, necesitamos verificar que este email te pertenece.</p>
                        
                        <h3>🔐 Verifica tu cuenta</h3>
                        <p>Haz clic en el botón de abajo para activar tu cuenta:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verification_link}" class="btn">
                                ✅ Verificar mi cuenta
                            </a>
                        </div>
                        
                        <div class="info-box">
                            <strong>⏱️ Importante:</strong> Este enlace es válido por 24 horas.
                        </div>
                        
                        <h3>¿Qué sigue después?</h3>
                        <ul style="line-height: 1.8;">
                            <li>Haz clic en el botón de verificación</li>
                            <li>Tu cuenta será activada automáticamente</li>
                            <li>Podrás iniciar sesión con tu email: <strong>{email}</strong></li>
                            <li>¡Ya podrás gestionar tus equipos y campeonatos!</li>
                        </ul>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            <p style="color: #6c757d; font-size: 14px;">
                                <strong>¿El botón no funciona?</strong><br>
                                Copia y pega este enlace en tu navegador:
                            </p>
                            <div class="link-box">
                                {verification_link}
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
                            <p style="margin: 0; color: #6c757d; font-size: 13px;">
                                💡 <strong>¿No te registraste?</strong><br>
                                Si no creaste una cuenta en nuestro sistema, ignora este correo de forma segura.
                            </p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>⚽ Sistema de Gestión de Campeonatos Barriales</strong></p>
                        <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                        <p style="font-size: 12px; color: #adb5bd; margin-top: 10px;">
                            Si necesitas ayuda, contacta con el administrador.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versión texto plano (fallback)
            text_body = f"""
            ¡Bienvenido {nombre}!
            
            Gracias por registrarte en el Sistema de Gestión de Campeonatos Barriales.
            
            Para activar tu cuenta, verifica tu email haciendo clic en el siguiente enlace:
            {verification_link}
            
            Este enlace es válido por 24 horas.
            
            Tu email: {email}
            
            Si no te registraste, ignora este correo.
            
            ---
            Sistema de Gestión de Campeonatos Barriales
            """
            
            # Crear mensaje
            msg = Message(
                subject=subject,
                recipients=[email],
                body=text_body,
                html=html_body
            )
            
            # Enviar
            mail.send(msg)
            print(f"✅ Email de verificación enviado a {email}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de verificación: {str(e)}")
            return False
    
    
    @staticmethod
    def send_unlock_code(email: str, nombre: str, unlock_code: str, locked_until: str, attempts: int) -> bool:
        """
        Envía email con código de desbloqueo
        
        Args:
            email: Email del usuario (Gmail)
            nombre: Nombre del usuario
            unlock_code: Código de 6 dígitos
            locked_until: Hasta cuándo está bloqueado (formato HH:MM:SS)
            attempts: Cantidad de intentos fallidos
        
        Returns:
            bool: True si se envió exitosamente
        """
        try:
            subject = '🔒 Código de Desbloqueo - Sistema de Campeonatos'
            
            # HTML del email
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }}
                    .header {{
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-size: 24px;
                    }}
                    .content {{
                        padding: 40px 30px;
                    }}
                    .alert-box {{
                        background-color: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .code-box {{
                        background-color: #f8f9fa;
                        border: 2px dashed #667eea;
                        padding: 20px;
                        text-align: center;
                        margin: 30px 0;
                        border-radius: 8px;
                    }}
                    .code {{
                        font-size: 36px;
                        font-weight: bold;
                        color: #667eea;
                        letter-spacing: 8px;
                        font-family: 'Courier New', monospace;
                    }}
                    .info-box {{
                        background-color: #e7f3ff;
                        border-left: 4px solid #2196F3;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                    .footer {{
                        background-color: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 14px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Cuenta Temporalmente Bloqueada</h1>
                    </div>
                    
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        
                        <div class="alert-box">
                            <strong>⚠️ Alerta de Seguridad</strong><br>
                            Tu cuenta ha sido bloqueada temporalmente debido a <strong>{attempts} intentos fallidos</strong> de inicio de sesión.
                        </div>
                        
                        <p>Por tu seguridad, hemos bloqueado el acceso a tu cuenta hasta las <strong>{locked_until}</strong>.</p>
                        
                        <h3>🔓 Desbloqueo Inmediato</h3>
                        <p>Si fuiste tú quien intentó iniciar sesión, puedes desbloquear tu cuenta inmediatamente usando este código:</p>
                        
                        <div class="code-box">
                            <div style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
                                TU CÓDIGO DE DESBLOQUEO
                            </div>
                            <div class="code">{unlock_code}</div>
                            <div style="color: #6c757d; font-size: 12px; margin-top: 10px;">
                                ⏱️ Este código expira en 15 minutos
                            </div>
                        </div>
                        
                        <div class="info-box">
                            <strong>ℹ️ ¿Cómo usar el código?</strong><br>
                            1. Ve al endpoint: <code>POST /api/auth/unlock</code><br>
                            2. Envía tu email: <strong>{email}</strong><br>
                            3. Envía el código: <strong>{unlock_code}</strong><br>
                            4. ✅ Ya podrás iniciar sesión normalmente
                        </div>
                        
                        <h3>🛡️ ¿No fuiste tú?</h3>
                        <p>Si <strong>NO</strong> intentaste iniciar sesión, alguien puede estar tratando de acceder a tu cuenta. Te recomendamos:</p>
                        <ul>
                            <li>🔐 Cambiar tu contraseña inmediatamente</li>
                            <li>👀 Revisar la actividad reciente de tu cuenta</li>
                            <li>📞 Contactar con soporte si sospechas un acceso no autorizado</li>
                        </ul>
                        
                        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0;">
                                ⏰ Tu cuenta se desbloqueará automáticamente en 10 minutos<br>
                                o puedes usar el código de arriba para desbloquearla ahora.
                            </p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>⚽ Sistema de Gestión de Campeonatos Barriales</strong></p>
                        <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                        <p style="font-size: 12px; color: #adb5bd;">
                            Si no solicitaste este email, puedes ignorarlo de forma segura.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versión texto plano (fallback)
            text_body = f"""
            Hola {nombre},
            
            Tu cuenta ha sido bloqueada temporalmente debido a {attempts} intentos fallidos de inicio de sesión.
            
            CÓDIGO DE DESBLOQUEO: {unlock_code}
            
            Bloqueada hasta: {locked_until}
            
            Si fuiste tú, usa el código de arriba para desbloquear tu cuenta inmediatamente.
            Si no fuiste tú, cambia tu contraseña lo antes posible.
            
            ---
            Sistema de Gestión de Campeonatos Barriales
            """
            
            # Crear mensaje
            msg = Message(
                subject=subject,
                recipients=[email],
                body=text_body,
                html=html_body
            )
            
            # Enviar
            mail.send(msg)
            print(f"✅ Código de desbloqueo enviado a {email}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de desbloqueo: {str(e)}")
            return False
    
    
    @staticmethod
    def send_welcome_email(email: str, nombre: str) -> bool:
        """
        Envía email de bienvenida (OBSOLETO - Usar send_verification_email)
        Se mantiene por compatibilidad pero ya no se usa
        """
        try:
            subject = '🎉 Bienvenido al Sistema de Campeonatos'
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #667eea;">¡Bienvenido {nombre}! 🎉</h1>
                    <p>Tu cuenta ha sido creada exitosamente en el Sistema de Gestión de Campeonatos Barriales.</p>
                    <p>Ya puedes iniciar sesión con tu email: <strong>{email}</strong></p>
                    <hr>
                    <p style="color: #6c757d; font-size: 14px;">Sistema de Campeonatos Barriales</p>
                </div>
            </body>
            </html>
            """
            
            msg = Message(subject=subject, recipients=[email], html=html_body)
            mail.send(msg)
            print(f"✅ Email de bienvenida enviado a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de bienvenida: {str(e)}")
            return False