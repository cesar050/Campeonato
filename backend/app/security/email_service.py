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
    - Enviar credenciales a organizadores
    - Enviar código para restablecer contraseña
    """
    
    @staticmethod
    def send_verification_email(email: str, nombre: str, verification_link: str) -> bool:
        """Envía email de verificación al registrarse"""
        try:
            subject = '✅ Verifica tu cuenta - Campeonato Libre'
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
                    .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; padding: 40px 30px; text-align: center; }}
                    .header h1 {{ margin: 0; font-size: 28px; }}
                    .content {{ padding: 40px 30px; }}
                    .btn {{ display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                    .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 ¡Bienvenido a Campeonato Libre!</h1>
                    </div>
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el boton:</p>
                        <div style="text-align: center;">
                            <a href="{verification_link}" class="btn">✅ Verificar mi cuenta</a>
                        </div>
                        <p style="color: #6c757d; font-size: 14px;">Este enlace es valido por 24 horas.</p>
                    </div>
                    <div class="footer">
                        <p><strong>⚽ Campeonato Libre</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"Hola {nombre}, verifica tu cuenta: {verification_link}"
            
            msg = Message(subject=subject, recipients=[email], body=text_body, html=html_body)
            mail.send(msg)
            print(f"✅ Email de verificación enviado a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de verificación: {str(e)}")
            return False
    
    
    @staticmethod
    def send_unlock_code(email: str, nombre: str, unlock_code: str, locked_until: str, attempts: int) -> bool:
        """Envía email con código de desbloqueo"""
        try:
            subject = '🔒 Código de Desbloqueo - Campeonato Libre'
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
                    .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #f44336 0%, #c62828 100%); color: white; padding: 30px; text-align: center; }}
                    .content {{ padding: 40px 30px; }}
                    .code-box {{ background-color: #f8f9fa; border: 2px dashed #4caf50; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }}
                    .code {{ font-size: 36px; font-weight: bold; color: #4caf50; letter-spacing: 8px; font-family: monospace; }}
                    .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Cuenta Bloqueada</h1>
                    </div>
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        <p>Tu cuenta ha sido bloqueada por <strong>{attempts} intentos fallidos</strong>.</p>
                        <div class="code-box">
                            <div style="color: #6c757d;">TU CÓDIGO DE DESBLOQUEO</div>
                            <div class="code">{unlock_code}</div>
                            <div style="color: #6c757d; font-size: 12px;">⏱️ Expira en 15 minutos</div>
                        </div>
                        <p>Bloqueada hasta: <strong>{locked_until}</strong></p>
                    </div>
                    <div class="footer">
                        <p><strong>⚽ Campeonato Libre</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"Hola {nombre}, tu código de desbloqueo es: {unlock_code}"
            
            msg = Message(subject=subject, recipients=[email], body=text_body, html=html_body)
            mail.send(msg)
            print(f"✅ Código de desbloqueo enviado a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de desbloqueo: {str(e)}")
            return False
    
    
    @staticmethod
    def send_organizador_credentials(email: str, nombre: str, contrasena: str, nombre_campeonato: str) -> bool:
        """Envia email con credenciales al nuevo organizador"""
        try:
            subject = '🎉 Bienvenido a Campeonato Libre - Tus credenciales'
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
                    .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; padding: 40px 30px; text-align: center; }}
                    .header h1 {{ margin: 0; font-size: 28px; }}
                    .content {{ padding: 40px 30px; }}
                    .credentials-box {{ background-color: #f5f5f5; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px; }}
                    .credential {{ margin: 10px 0; }}
                    .credential-label {{ font-weight: bold; color: #666; }}
                    .credential-value {{ font-family: monospace; font-size: 16px; color: #333; background: #fff; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px; }}
                    .warning-box {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                    .btn {{ display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                    .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Bienvenido a Campeonato Libre</h1>
                    </div>
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        <p>Has sido registrado como <strong>Organizador</strong> para gestionar <strong>{nombre_campeonato}</strong>.</p>
                        <div class="credentials-box">
                            <h3>🔐 Tus credenciales de acceso:</h3>
                            <div class="credential">
                                <span class="credential-label">Email:</span><br>
                                <span class="credential-value">{email}</span>
                            </div>
                            <div class="credential">
                                <span class="credential-label">Contraseña temporal:</span><br>
                                <span class="credential-value">{contrasena}</span>
                            </div>
                        </div>
                        <div class="warning-box">
                            <strong>⚠️ Importante:</strong> Por seguridad, cambia tu contraseña despues de iniciar sesion usando la opcion "¿Olvidaste tu contraseña?" en el login.
                        </div>
                        <div style="text-align: center;">
                            <a href="http://localhost:4200/auth/login" class="btn">Iniciar Sesion</a>
                        </div>
                        <h3>¿Que puedes hacer como Organizador?</h3>
                        <ul>
                            <li>Crear y gestionar tu campeonato</li>
                            <li>Aprobar equipos que soliciten participar</li>
                            <li>Programar partidos y jornadas</li>
                            <li>Registrar resultados y estadisticas</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p><strong>⚽ Campeonato Libre</strong></p>
                        <p>Este es un email automatico, por favor no respondas a este mensaje.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Hola {nombre},
            
            Has sido registrado como Organizador en Campeonato Libre.
            
            Tus credenciales:
            - Email: {email}
            - Contraseña temporal: {contrasena}
            
            Por seguridad, cambia tu contraseña despues de iniciar sesion.
            
            Ingresa en: http://localhost:4200/auth/login
            
            ---
            Campeonato Libre
            """
            
            msg = Message(subject=subject, recipients=[email], body=text_body, html=html_body)
            mail.send(msg)
            print(f"✅ Credenciales enviadas a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando credenciales: {str(e)}")
            return False
    
    
    @staticmethod
    def send_password_reset(email: str, nombre: str, reset_code: str) -> bool:
        """Envia email con codigo para restablecer contraseña"""
        try:
            subject = '🔐 Restablecer Contraseña - Campeonato Libre'
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
                    .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%); color: white; padding: 40px 30px; text-align: center; }}
                    .content {{ padding: 40px 30px; }}
                    .code-box {{ background-color: #f8f9fa; border: 2px dashed #2196f3; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }}
                    .code {{ font-size: 36px; font-weight: bold; color: #2196f3; letter-spacing: 8px; font-family: monospace; }}
                    .warning-box {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                    .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Restablecer Contraseña</h1>
                    </div>
                    <div class="content">
                        <h2>Hola {nombre},</h2>
                        <p>Recibimos una solicitud para restablecer tu contraseña. Usa este codigo:</p>
                        <div class="code-box">
                            <div style="color: #6c757d;">TU CÓDIGO DE VERIFICACIÓN</div>
                            <div class="code">{reset_code}</div>
                            <div style="color: #6c757d; font-size: 12px;">⏱️ Expira en 15 minutos</div>
                        </div>
                        <div class="warning-box">
                            <strong>⚠️ ¿No solicitaste esto?</strong><br>
                            Si no solicitaste restablecer tu contraseña, ignora este correo. Tu cuenta esta segura.
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>⚽ Campeonato Libre</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"Hola {nombre}, tu codigo para restablecer contraseña es: {reset_code}"
            
            msg = Message(subject=subject, recipients=[email], body=text_body, html=html_body)
            mail.send(msg)
            print(f"✅ Codigo de restablecimiento enviado a {email}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando email de restablecimiento: {str(e)}")
            return False