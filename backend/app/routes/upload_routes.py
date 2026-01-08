from flask import request
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from app.extensions import db
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


@upload_ns.route('/logo-campeonato/<int:id_campeonato>')
class UploadLogoCampeonato(Resource):
    @jwt_required()
    def post(self, id_campeonato):
        """Subir logo de campeonato"""
        try:
            from app.models.campeonato import Campeonato
            
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                upload_ns.abort(404, error='Campeonato no encontrado')
            
            if 'logo' not in request.files:
                upload_ns.abort(400, error='No se envió archivo')
            
            file = request.files['logo']
            
            if file.filename == '':
                upload_ns.abort(400, error='No se seleccionó archivo')
            
            if not allowed_file(file.filename):
                upload_ns.abort(400, error='Formato no permitido. Use PNG, JPG, JPEG o GIF')
            
            # Validar tamaño (máximo 5MB)
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > 5 * 1024 * 1024:
                upload_ns.abort(400, error='El archivo es muy grande. Máximo 5MB')
            
            # Generar nombre único
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"campeonato_{id_campeonato}_{uuid.uuid4().hex}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            # Guardar archivo
            file.save(filepath)
            
            # Actualizar logo_url en el campeonato
            logo_url = f"http://localhost:5000/uploads/logos/{filename}"
            campeonato.logo_url = logo_url
            db.session.commit()
            
            return {
                'mensaje': 'Logo subido exitosamente',
                'logo_url': logo_url
            }, 200
            
        except Exception as e:
            db.session.rollback()
            upload_ns.abort(500, error=str(e))