import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuración
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail = Mail(app)

print("📧 Configuración de email:")
print(f"   Server: {app.config['MAIL_SERVER']}")
print(f"   Port: {app.config['MAIL_PORT']}")
print(f"   Username: {app.config['MAIL_USERNAME']}")
print(f"   Password: {'*' * len(app.config['MAIL_PASSWORD']) if app.config['MAIL_PASSWORD'] else 'NO CONFIGURADA'}")
print(f"   Sender: {app.config['MAIL_DEFAULT_SENDER']}")

with app.app_context():
    try:
        print("\n🚀 Intentando enviar email de prueba...")
        
        msg = Message(
            subject='✅ Test - Campeonato Libre',
            recipients=['gestioncampeonato03@gmail.com'],
            body='Este es un email de prueba',
            html='<h1>✅ Email funcionando!</h1><p>Si ves esto, el email está configurado correctamente.</p>'
        )
        
        mail.send(msg)
        print("✅ EMAIL ENVIADO EXITOSAMENTE!")
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()