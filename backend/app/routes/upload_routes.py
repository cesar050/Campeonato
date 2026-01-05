from flask import request
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import os
import uuid

upload_ns = Namespace('upload', description='Subida de archivos')

UPLOAD_FOLDER = 'uploads/logos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_ns.route('/logo')
class UploadLogo(Resource):
    @jwt_required()
    def post(self):
        """Subir logo de equipo"""
        try:
            if 'logo' not in request.files:
                upload_ns.abort(400, error='No se envió archivo')
            
            file = request.files['logo']
            
            if file.filename == '':
                upload_ns.abort(400, error='No se seleccionó archivo')
            
            if not allowed_file(file.filename):
                upload_ns.abort(400, error='Formato no permitido. Use PNG, JPG, JPEG o GIF')
            
            # Generar nombre único
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            # Guardar archivo
            file.save(filepath)
            
            # Retornar URL
            logo_url = f"http://localhost:5000/uploads/logos/{filename}"
            
            return {
                'mensaje': 'Logo subido exitosamente',
                'logo_url': logo_url
            }, 200
            
        except Exception as e:
            upload_ns.abort(500, error=str(e))