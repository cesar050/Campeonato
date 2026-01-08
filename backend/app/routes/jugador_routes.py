from flask import request, jsonify
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from datetime import datetime

jugador_ns = Namespace('jugadores', description='Gestión de jugadores de fútbol')

# ============================================
# MODELOS SWAGGER
# ============================================

jugador_input_model = jugador_ns.model('JugadorInput', {
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'nombre': fields.String(required=True, description='Nombre del jugador', example='Lionel'),
    'apellido': fields.String(required=True, description='Apellido del jugador', example='Messi'),
    'documento': fields.String(required=True, description='Documento de identidad', example='12345678'),
    'dorsal': fields.Integer(required=True, description='Número de dorsal', example=10),
    'posicion': fields.String(description='Posición del jugador', enum=['portero', 'defensa', 'mediocampista', 'delantero'], example='delantero'),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento (YYYY-MM-DD)', example='1987-06-24')
})

jugador_update_model = jugador_ns.model('JugadorUpdate', {
    'nombre': fields.String(description='Nombre del jugador'),
    'apellido': fields.String(description='Apellido del jugador'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'posicion': fields.String(description='Posición del jugador', enum=['portero', 'defensa', 'mediocampista', 'delantero']),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento (YYYY-MM-DD)'),
    'activo': fields.Boolean(description='Estado activo del jugador')
})

jugador_estado_model = jugador_ns.model('JugadorEstado', {
    'activo': fields.Boolean(required=True, description='Estado activo del jugador')
})

jugador_output_model = jugador_ns.model('JugadorOutput', {
    'id_jugador': fields.Integer(description='ID del jugador'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'nombre': fields.String(description='Nombre del jugador'),
    'apellido': fields.String(description='Apellido del jugador'),
    'documento': fields.String(description='Documento de identidad'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'posicion': fields.String(description='Posición del jugador'),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento'),
    'documento_pdf': fields.String(description='URL del documento PDF'),
    'documento_url': fields.String(description='URL del documento (alias)'),
    'foto_url': fields.String(description='URL de la foto del jugador'),
    'activo': fields.Boolean(description='Estado activo'),
    'fecha_registro': fields.DateTime(description='Fecha de registro')
})

pagination_model = jugador_ns.model('Pagination', {
    'page': fields.Integer(description='Página actual'),
    'per_page': fields.Integer(description='Elementos por página'),
    'total_pages': fields.Integer(description='Total de páginas'),
    'total_items': fields.Integer(description='Total de elementos'),
    'has_next': fields.Boolean(description='Tiene siguiente página'),
    'has_prev': fields.Boolean(description='Tiene página anterior')
})

jugadores_response_model = jugador_ns.model('JugadoresResponse', {
    'jugadores': fields.List(fields.Nested(jugador_output_model)),
    'pagination': fields.Nested(pagination_model)
})

message_response = jugador_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

# ============================================
# ENDPOINTS
# ============================================

@jugador_ns.route('')
class JugadorList(Resource):
    @jugador_ns.doc(description='Crear nuevo jugador', security='Bearer')
    @jugador_ns.expect(jugador_input_model, validate=True)
    @jugador_ns.marshal_with(jugador_output_model, code=201, envelope='jugador')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        """Crear nuevo jugador"""
        try:
            data = jugador_ns.payload

            # Buscar equipo
            equipo = Equipo.query.get(data['id_equipo'])
            if not equipo:
                jugador_ns.abort(404, error='Equipo no encontrado')

            # Verificar que el usuario sea el líder del equipo o admin
            current_user_id = get_jwt_identity()
            usuario = Usuario.query.get(int(current_user_id))
            
            if equipo.id_lider != int(current_user_id) and usuario.rol not in ['admin', 'superadmin']:
                jugador_ns.abort(403, error='No tienes permiso para agregar jugadores a este equipo')

            # Verificar documento único
            if Jugador.query.filter_by(documento=data['documento']).first():
                jugador_ns.abort(400, error='Ya existe un jugador con este documento')

            # Verificar dorsal único en el equipo
            dorsal_ocupado = Jugador.query.filter_by(
                id_equipo=equipo.id_equipo,
                dorsal=data['dorsal'],
                activo=True
            ).first()
            if dorsal_ocupado:
                jugador_ns.abort(400, error=f'El dorsal {data["dorsal"]} ya está ocupado en este equipo')

            # Verificar límite de jugadores
            total_jugadores = Jugador.query.filter_by(
                id_equipo=equipo.id_equipo,
                activo=True
            ).count()
            
            if total_jugadores >= equipo.max_jugadores:
                jugador_ns.abort(400, error=f'Se alcanzó el máximo de {equipo.max_jugadores} jugadores para este equipo')

            # Crear jugador
            nuevo_jugador = Jugador(
                id_equipo=equipo.id_equipo,
                nombre=data['nombre'],
                apellido=data['apellido'],
                documento=data['documento'],
                dorsal=int(data['dorsal']),
                posicion=data.get('posicion', 'delantero'),
                fecha_nacimiento=datetime.fromisoformat(data['fecha_nacimiento']).date() if data.get('fecha_nacimiento') else None
            )

            db.session.add(nuevo_jugador)
            db.session.commit()

            print(f"✅ Jugador creado: {nuevo_jugador.nombre} {nuevo_jugador.apellido} (ID: {nuevo_jugador.id_jugador})")

            return nuevo_jugador.to_dict(), 201

        except ValueError:
            db.session.rollback()
            jugador_ns.abort(400, error='Formato de fecha inválido. Use YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al crear jugador: {str(e)}")
            jugador_ns.abort(500, error=str(e))

    @jugador_ns.doc(
        description='Listar jugadores con paginación, filtros y búsqueda',
        params={
            'page': 'Número de página (default: 1)',
            'per_page': 'Registros por página (default: 10, max: 100)',
            'id_equipo': 'Filtrar por ID del equipo',
            'posicion': 'Filtrar por posición (portero, defensa, mediocampista, delantero)',
            'activo': 'Filtrar por estado activo (true/false)',
            'buscar': 'Buscar por nombre, apellido o documento',
            'ordenar_por': 'Ordenar por (nombre, apellido, dorsal)',
            'orden': 'Orden (asc, desc)'
        }
    )
    @jugador_ns.marshal_with(jugadores_response_model, code=200)
    def get(self):
        """Listar jugadores con paginación"""
        try:
            # Parámetros de paginación
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            per_page = min(per_page, 100)  # Máximo 100 por página
            
            # Filtros
            id_equipo = request.args.get('id_equipo', type=int)
            posicion = request.args.get('posicion')
            activo = request.args.get('activo')
            buscar = request.args.get('buscar')
            
            # Ordenación
            ordenar_por = request.args.get('ordenar_por', 'dorsal')
            orden = request.args.get('orden', 'asc')

            print(f"🔍 [GET /jugadores] Parámetros recibidos:")
            print(f"   - id_equipo: {id_equipo}")
            print(f"   - activo: {activo}")
            print(f"   - per_page: {per_page}")
            print(f"   - page: {page}")

            # Query base
            query = Jugador.query

            # Aplicar filtros
            if id_equipo:
                query = query.filter_by(id_equipo=id_equipo)
                print(f"   ✅ Filtrado por equipo {id_equipo}")
            
            if posicion:
                query = query.filter_by(posicion=posicion)
                print(f"   ✅ Filtrado por posición {posicion}")
            
            # CORRECCIÓN CRÍTICA: Filtro por activo
            if activo is not None and activo != '':
                if activo.lower() in ['true', '1', 'yes']:
                    query = query.filter_by(activo=True)
                    print(f"   ✅ Filtrado por activo=True")
                elif activo.lower() in ['false', '0', 'no']:
                    query = query.filter_by(activo=False)
                    print(f"   ✅ Filtrado por activo=False")
            
            if buscar:
                query = query.filter(
                    db.or_(
                        Jugador.nombre.ilike(f'%{buscar}%'),
                        Jugador.apellido.ilike(f'%{buscar}%'),
                        Jugador.documento.ilike(f'%{buscar}%')
                    )
                )
                print(f"   ✅ Búsqueda: {buscar}")

            # Aplicar ordenación
            if ordenar_por == 'nombre':
                query = query.order_by(Jugador.nombre.desc() if orden == 'desc' else Jugador.nombre.asc())
            elif ordenar_por == 'apellido':
                query = query.order_by(Jugador.apellido.desc() if orden == 'desc' else Jugador.apellido.asc())
            else:  # dorsal por defecto
                query = query.order_by(Jugador.dorsal.desc() if orden == 'desc' else Jugador.dorsal.asc())

            # Contar total ANTES de paginar
            total_sin_paginar = query.count()
            print(f"   📊 Total de jugadores encontrados (antes de paginar): {total_sin_paginar}")

            # Paginar
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )

            # Convertir a diccionarios
            jugadores_dict = [j.to_dict() for j in pagination.items]
            
            print(f"   ✅ Devolviendo {len(jugadores_dict)} jugadores de un total de {pagination.total}")
            
            # Log detallado de cada jugador
            for j in jugadores_dict[:3]:  # Mostrar solo los primeros 3
                print(f"      - {j['nombre']} {j['apellido']} (ID: {j['id_jugador']}, Dorsal: {j['dorsal']}, Activo: {j['activo']})")

            return {
                'jugadores': jugadores_dict,
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total_pages': pagination.pages,
                    'total_items': pagination.total,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }, 200

        except Exception as e:
            print(f"❌ Error en GET /jugadores: {str(e)}")
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/<int:id_jugador>')
@jugador_ns.param('id_jugador', 'ID del jugador')
class JugadorDetail(Resource):
    @jugador_ns.doc(description='Obtener detalles de un jugador específico')
    @jugador_ns.marshal_with(jugador_output_model, code=200, envelope='jugador')
    def get(self, id_jugador):
        """Obtener jugador por ID"""
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')
            return jugador.to_dict(), 200
        except Exception as e:
            jugador_ns.abort(500, error=str(e))

    @jugador_ns.doc(description='Actualizar jugador (líder o admin)', security='Bearer')
    @jugador_ns.expect(jugador_update_model, validate=True)
    @jugador_ns.marshal_with(jugador_output_model, code=200, envelope='jugador')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def put(self, id_jugador):
        """Actualizar jugador"""
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            # Verificar permisos
            current_user_id = get_jwt_identity()
            usuario = Usuario.query.get(int(current_user_id))
            
            if jugador.equipo.id_lider != int(current_user_id) and usuario.rol not in ['admin', 'superadmin']:
                jugador_ns.abort(403, error='No tienes permiso para editar este jugador')

            data = jugador_ns.payload

            if 'nombre' in data:
                jugador.nombre = data['nombre']
            if 'apellido' in data:
                jugador.apellido = data['apellido']
            if 'dorsal' in data:
                # Verificar que el dorsal no esté ocupado
                dorsal_ocupado = Jugador.query.filter_by(
                    id_equipo=jugador.id_equipo,
                    dorsal=data['dorsal'],
                    activo=True
                ).first()
                if dorsal_ocupado and dorsal_ocupado.id_jugador != id_jugador:
                    jugador_ns.abort(400, error=f'El dorsal {data["dorsal"]} ya está ocupado en este equipo')
                jugador.dorsal = int(data['dorsal'])
            if 'posicion' in data:
                posiciones_validas = ['portero', 'defensa', 'mediocampista', 'delantero']
                if data['posicion'] not in posiciones_validas:
                    jugador_ns.abort(400, error=f'Posición no válida. Debe ser: {", ".join(posiciones_validas)}')
                jugador.posicion = data['posicion']
            if 'fecha_nacimiento' in data:
                jugador.fecha_nacimiento = datetime.fromisoformat(data['fecha_nacimiento']).date()
            if 'activo' in data:
                jugador.activo = data['activo']

            db.session.commit()
            
            print(f"✅ Jugador actualizado: {jugador.nombre} {jugador.apellido}")
            
            return jugador.to_dict(), 200

        except ValueError:
            db.session.rollback()
            jugador_ns.abort(400, error='Formato de fecha inválido. Use YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al actualizar jugador: {str(e)}")
            jugador_ns.abort(500, error=str(e))

    @jugador_ns.doc(description='Eliminar jugador (solo si no tiene estadísticas)', security='Bearer')
    @jugador_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin', 'lider'])
    def delete(self, id_jugador):
        """Eliminar jugador"""
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            # Verificar permisos
            current_user_id = get_jwt_identity()
            usuario = Usuario.query.get(int(current_user_id))
            
            if jugador.equipo.id_lider != int(current_user_id) and usuario.rol not in ['admin', 'superadmin']:
                jugador_ns.abort(403, error='No tienes permiso para eliminar este jugador')

            # Verificar que no tenga estadísticas
            if jugador.goles.count() > 0 or jugador.tarjetas.count() > 0:
                jugador_ns.abort(400, error='No se puede eliminar un jugador con estadísticas registradas. Desactívelo en su lugar.')

            nombre_completo = f"{jugador.nombre} {jugador.apellido}"
            db.session.delete(jugador)
            db.session.commit()

            print(f"✅ Jugador eliminado: {nombre_completo}")

            return {'mensaje': 'Jugador eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al eliminar jugador: {str(e)}")
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/<int:id_jugador>/upload-documento')
@jugador_ns.param('id_jugador', 'ID del jugador')
class UploadDocumento(Resource):
    @jugador_ns.doc(
        description='Subir documento PDF del jugador (líder o admin)',
        security='Bearer',
        responses={
            200: 'Documento subido exitosamente',
            400: 'Archivo inválido',
            401: 'No autorizado',
            404: 'Jugador no encontrado'
        }
    )
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self, id_jugador):
        """Sube el documento PDF de identificación del jugador"""
        try:
            from werkzeug.utils import secure_filename
            import os

            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            # Verificar permisos
            current_user_id = get_jwt_identity()
            usuario = Usuario.query.get(int(current_user_id))
            
            if jugador.equipo.id_lider != int(current_user_id) and usuario.rol not in ['admin', 'superadmin']:
                jugador_ns.abort(403, error='No tienes permiso para subir documentos de este jugador')

            # Verificar que se envió un archivo
            if 'documento' not in request.files:
                jugador_ns.abort(400, error='No se envió ningún archivo')

            file = request.files['documento']

            if file.filename == '':
                jugador_ns.abort(400, error='No se seleccionó ningún archivo')

            # Validar extensión
            if not file.filename.lower().endswith('.pdf'):
                jugador_ns.abort(400, error='Solo se permiten archivos PDF')

            # Validar tamaño (máximo 5MB)
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            if file_size > 5 * 1024 * 1024:
                jugador_ns.abort(400, error='El archivo no debe superar 5MB')

            # Crear nombre seguro
            filename = secure_filename(f"jugador_{id_jugador}_{jugador.documento}.pdf")
            
            # Directorio de uploads
            upload_folder = os.path.join(os.getcwd(), 'uploads', 'documentos_jugadores')
            os.makedirs(upload_folder, exist_ok=True)

            # Guardar archivo
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)

            # URL COMPLETA con dominio
            jugador.documento_pdf = f'http://localhost:5000/uploads/documentos_jugadores/{filename}'
            db.session.commit()

            print(f"✅ Documento subido: {filename}")

            return {
                'mensaje': 'Documento subido exitosamente',
                'documento_url': jugador.documento_pdf
            }, 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al subir documento: {str(e)}")
            jugador_ns.abort(500, error=f'Error al subir documento: {str(e)}')


@jugador_ns.route('/<int:id_jugador>/upload-foto')
@jugador_ns.param('id_jugador', 'ID del jugador')
class UploadFoto(Resource):
    @jugador_ns.doc(
        description='Subir foto del jugador (líder o admin)',
        security='Bearer',
        responses={
            200: 'Foto subida exitosamente',
            400: 'Archivo inválido',
            401: 'No autorizado',
            404: 'Jugador no encontrado'
        }
    )
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self, id_jugador):
        """Sube la foto del jugador"""
        try:
            from werkzeug.utils import secure_filename
            import os

            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            # Verificar permisos
            current_user_id = get_jwt_identity()
            usuario = Usuario.query.get(int(current_user_id))
            
            if jugador.equipo.id_lider != int(current_user_id) and usuario.rol not in ['admin', 'superadmin']:
                jugador_ns.abort(403, error='No tienes permiso para subir fotos de este jugador')

            # Verificar que se envió un archivo
            if 'foto' not in request.files:
                jugador_ns.abort(400, error='No se envió ningún archivo')

            file = request.files['foto']

            if file.filename == '':
                jugador_ns.abort(400, error='No se seleccionó ningún archivo')

            # Validar extensión
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif']
            if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                jugador_ns.abort(400, error='Solo se permiten imágenes (JPG, PNG, GIF)')

            # Validar tamaño (máximo 2MB)
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            if file_size > 2 * 1024 * 1024:
                jugador_ns.abort(400, error='La imagen no debe superar 2MB')

            # Crear nombre seguro
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = secure_filename(f"jugador_{id_jugador}_{jugador.documento}.{ext}")
            
            # Directorio de uploads
            upload_folder = os.path.join(os.getcwd(), 'uploads', 'fotos_jugadores')
            os.makedirs(upload_folder, exist_ok=True)

            # Guardar archivo
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)

            # URL COMPLETA con dominio
            jugador.foto_url = f'http://localhost:5000/uploads/fotos_jugadores/{filename}'
            db.session.commit()

            print(f"✅ Foto subida: {filename}")

            return {
                'mensaje': 'Foto subida exitosamente',
                'foto_url': jugador.foto_url
            }, 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al subir foto: {str(e)}")
            jugador_ns.abort(500, error=f'Error al subir foto: {str(e)}')


@jugador_ns.route('/equipo/<int:id_equipo>')
@jugador_ns.param('id_equipo', 'ID del equipo')
class JugadoresPorEquipo(Resource):
    @jugador_ns.doc(
        description='Obtener todos los jugadores de un equipo específico',
        responses={
            200: 'Lista de jugadores',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_list_with(jugador_output_model, code=200, envelope='jugadores')
    def get(self, id_equipo):
        """Obtener jugadores por equipo"""
        try:
            # Verificar que el equipo existe
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                jugador_ns.abort(404, error='Equipo no encontrado')

            # Obtener jugadores activos
            jugadores = Jugador.query.filter_by(
                id_equipo=id_equipo,
                activo=True
            ).order_by(Jugador.dorsal.asc()).all()

            # Convertir a diccionario
            resultado = [jugador.to_dict() for jugador in jugadores]

            print(f"✅ [GET /equipo/{id_equipo}] Se encontraron {len(resultado)} jugadores activos")
            return resultado, 200

        except Exception as e:
            print(f"❌ Error al obtener jugadores: {str(e)}")
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/equipo/<int:id_equipo>/documentos')
@jugador_ns.param('id_equipo', 'ID del equipo')
class JugadoresConDocumentos(Resource):
    @jugador_ns.doc(
        description='Obtener jugadores con sus documentos PDF',
        responses={
            200: 'Lista de jugadores con documentos',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_list_with(jugador_output_model, code=200, envelope='jugadores')
    def get(self, id_equipo):
        """Obtener jugadores con documentos para validación"""
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                jugador_ns.abort(404, error='Equipo no encontrado')

            # Obtener TODOS los jugadores con documento
            jugadores = Jugador.query.filter_by(
                id_equipo=id_equipo
            ).filter(
                Jugador.documento_pdf.isnot(None)
            ).order_by(Jugador.dorsal.asc()).all()

            resultado = [jugador.to_dict() for jugador in jugadores]
            
            print(f"✅ [GET /equipo/{id_equipo}/documentos] Se encontraron {len(resultado)} jugadores con documentos")
            return resultado, 200

        except Exception as e:
            print(f"❌ Error al obtener jugadores con documentos: {str(e)}")
            jugador_ns.abort(500, error=str(e))