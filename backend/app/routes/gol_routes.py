
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.gol import Gol
from app.models.partido import Partido
from app.models.jugador import Jugador
from datetime import datetime


gol_bp = Blueprint('goles', __name__)


@gol_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_gol():

    try:
        data = request.get_json()

        if not data.get('id_partido'):
            return jsonify({'error': 'El partido es requerido'}), 400
        
        if not data.get('id_jugador'):
            return jsonify({'error': 'El jugador es requerido'}), 400
        
        if not data.get('minuto'):
            return jsonify({'error': 'El minuto es requerido'}), 400
        
 
        partido = Partido.query.get(data['id_partido'])
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
 
        jugador = Jugador.query.get(data['id_jugador'])
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        

        if jugador.id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El jugador no pertenece a ninguno de los equipos del partido'}), 400

        minuto = int(data['minuto'])
        if minuto < 1 or minuto > 120:
            return jsonify({'error': 'El minuto debe estar entre 1 y 120'}), 400

        tipos_validos = ['normal', 'penal', 'autogol', 'tiro_libre']
        tipo = data.get('tipo', 'normal')
        if tipo not in tipos_validos:
            return jsonify({
                'error': f'Tipo no válido. Debe ser uno de: {", ".join(tipos_validos)}'
            }), 400
        

        nuevo_gol = Gol(
            id_partido=data['id_partido'],
            id_jugador=data['id_jugador'],
            minuto=minuto,
            tipo=tipo
        )
        
        db.session.add(nuevo_gol)
        
        if tipo != 'autogol':
            if jugador.id_equipo == partido.id_equipo_local:
                partido.goles_local += 1
            else:
                partido.goles_visitante += 1
        else:

            if jugador.id_equipo == partido.id_equipo_local:
                partido.goles_visitante += 1
            else:
                partido.goles_local += 1
        
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Gol registrado exitosamente',
            'gol': nuevo_gol.to_dict()
        }), 201
        
    except ValueError:
        return jsonify({'error': 'El minuto debe ser un número válido'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@gol_bp.route('', methods=['GET'])
def obtener_goles():

    try:

        id_partido = request.args.get('id_partido')
        id_jugador = request.args.get('id_jugador')
        tipo = request.args.get('tipo')
        

        query = Gol.query
        
        if id_partido:
            query = query.filter_by(id_partido=int(id_partido))
        
        if id_jugador:
            query = query.filter_by(id_jugador=int(id_jugador))
        
        if tipo:
            query = query.filter_by(tipo=tipo)
        

        goles = query.order_by(Gol.minuto.asc()).all()
        
        return jsonify({
            'goles': [g.to_dict() for g in goles]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@gol_bp.route('/<int:id_gol>', methods=['GET'])
def obtener_gol_por_id(id_gol):

    try:
        gol = Gol.query.get(id_gol)
        
        if not gol:
            return jsonify({'error': 'Gol no encontrado'}), 404
        
        return jsonify({
            'gol': gol.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@gol_bp.route('/<int:id_gol>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_gol(id_gol):

    try:
        gol = Gol.query.get(id_gol)
        
        if not gol:
            return jsonify({'error': 'Gol no encontrado'}), 404

        partido = Partido.query.get(gol.id_partido)
        jugador = Jugador.query.get(gol.id_jugador)

        if gol.tipo != 'autogol':
            if jugador.id_equipo == partido.id_equipo_local:
                partido.goles_local = max(0, partido.goles_local - 1)
            else:
                partido.goles_visitante = max(0, partido.goles_visitante - 1)
        else:
            if jugador.id_equipo == partido.id_equipo_local:
                partido.goles_visitante = max(0, partido.goles_visitante - 1)
            else:
                partido.goles_local = max(0, partido.goles_local - 1)
        
        db.session.delete(gol)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Gol eliminado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@gol_bp.route('/goleadores', methods=['GET'])
def obtener_goleadores():

    try:
        id_campeonato = request.args.get('id_campeonato')
        limit = request.args.get('limit', 10)
        
        query = db.session.query(
            Jugador.id_jugador,
            Jugador.nombre,
            Jugador.apellido,
            Jugador.dorsal,
            db.func.count(Gol.id_gol).label('total_goles')
        ).join(
            Gol, Gol.id_jugador == Jugador.id_jugador
        ).filter(
            Gol.tipo != 'autogol'
        )

        if id_campeonato:
            query = query.join(
                Partido, Partido.id_partido == Gol.id_partido
            ).filter(
                Partido.id_campeonato == int(id_campeonato)
            )
    
        goleadores = query.group_by(
            Jugador.id_jugador
        ).order_by(
            db.desc('total_goles')
        ).limit(int(limit)).all()
        
        resultado = []
        for pos, goleador in enumerate(goleadores, start=1):
            resultado.append({
                'posicion': pos,
                'id_jugador': goleador.id_jugador,
                'nombre': f"{goleador.nombre} {goleador.apellido}",
                'dorsal': goleador.dorsal,
                'goles': goleador.total_goles
            })
        
        return jsonify({
            'goleadores': resultado
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500