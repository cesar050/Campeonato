from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.campeonato import Campeonato
from app.models.usuario import Usuario
from datetime import datetime

# Crear el blueprint
campeonato_bp = Blueprint('campeonatos', __name__)

@campeonato_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_campeonato(): 
    try: 
        data = request.get_json()
        if not data.get('nombre'):
            return jsonify({'error':'El nombre es obligatorio'}),400
        if not data.get('fecha_inicio'):
            return jsonify({'error':'la fecha de inicio es obligatoria'}), 400
        campeonato_existente = Campeonato.query.filter_by(nombre=data['nombre']).first()
        if campeonato_existente:
            return jsonify({'error': 'Ya existe un campeonato con este nombre'}), 400
        current_user = get_jwt_identity()

        nuevo_campeonato = Campeonato(
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
            fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None, 
            creado_por=current_user['id_usuario'],
            estado='planificacion'
        )
        db.session.add(nuevo_campeonato)
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato creado exitosamente',
            'campeonato': nuevo_campeonato.to_dict()
        }),201

    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido. Usa YYYY-MM-DD'}),400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@campeonato_bp.route('', methods=['GET'])
def obtener_campeonatos():
    try:
        estado = request.args.get('estado')
        creado_por = request.args.get('creado_por')
        
        query = Campeonato.query
        if estado:
            query = query.filter_by(estado=estado)
        if creado_por:
            query = query.filter_by(creado_por=int(creado_por))
        campeonatos = query.order_by(Campeonato.fecha_creacion.desc()).all()
        return jsonify({
            'campeonatos': [c.to_dict() for c in campeonatos]
        }), 200
    except Exception as e:
        return jsonify({'error':str(e)}), 500

@campeonato_bp.route('/<int:id_campeonato>', methods=['GET'])
def obtener_campeonato_por_id(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}),404
        return jsonify({
            'campeonato': campeonato.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@campeonato_bp.route('/<int:id_campeonato>', methods=['PUT'])
@jwt_required()
@role_required(['admin'])
def actualizar_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        data = request.get_json()
        if 'nombre' in data:
            existe = Campeonato.query.filter_by(nombre=data['nombre']).first()
            if existe and existe.id_campeonato != id_campeonato:
                return jsonify({'error':'Ya existe un campeonato con este nombre'}), 400
            campeonato.nombre = data['nombre']   
        if 'descripcion' in data:
            campeonato.descripcion = data['descripcion']
        if 'fecha_inicio' in data:
            campeonato.fecha_inicio = datetime.fromisoformat(data['fecha_inicio']).date()
        if 'fecha_fin' in data:
            campeonato.fecha_fin = datetime.fromisoformat(data['fecha_fin']).date() if data['fecha_fin'] else None
        
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato actualizado',
            'campeonato': campeonato.to_dict()
        }), 200
    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido, Usa YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}),500

@campeonato_bp.route('/<int:id_campeonato>/estado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def cambiar_estado_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        data = request.get_json()
        if 'estado' not in data:
            return jsonify({'error': 'El campo estado es requerido'}), 400
        estados_validos = ['planificacion', 'en_curso','finalizado']
        if data['estado'] not in estados_validos:
            return jsonify({
                'error': f'Estado no valido. Debe ser uno de:{",".join(estados_validos)}'

            }), 400
        campeonato.estado = data['estado']
        db.session.commit()

        return jsonify({
            'mensaje': f'Campeonato cambió a estado: {data["estado"]}',
            'campeonato': campeonato.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}),500

@campeonato_bp.route('/<int:id_campeonato>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        if campeonato.partidos.count() > 0:
            return jsonify({
                'error': 'No se puede eliminar un campeonato que tiene partidos programados'
            }), 400
        db.session.delete(campeonato)
        db.session.commit()
        return jsonify({
            'mensaje':'Campeonato eliminado exitosamente'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': str(e)
        }), 500

@campeonato_bp.route('/<int:id_campeonato>/partidos', methods=['GET'])
def obtener_partidos_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({
                'error': 'Campeonato no encontrado'
            }), 404
        partidos = campeonato.partidos.all()
        return jsonify({
            'campeonato': campeonato.nombre,
            'total_partidos': len(partidos),
            'partidos': [p.to_dict() for p in partidos]
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500