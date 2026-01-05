from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from datetime import datetime, timedelta
from app.models.usuario import Usuario
from app.models.partido import Partido
from app.models.equipo import Equipo
from app.extensions import db

alineaciones_proxy_bp = Blueprint('alineaciones_proxy', __name__)

# URL del microservicio
MICROSERVICIO_URL = "http://localhost:5001"

# ============================================
# ORGANIZADOR - OBTENER ALINEACIONES
# ============================================
@alineaciones_proxy_bp.route('/organizador/partidos/<int:id_partido>/alineaciones', methods=['GET'])
@jwt_required()
def obtener_alineaciones_partido(id_partido):
    """Obtiene las alineaciones de ambos equipos para un partido"""
    try:
        identity = get_jwt_identity()
        
        # 🔥 ARREGLO: identity puede ser dict o int
        if isinstance(identity, dict):
            id_usuario = identity.get('id_usuario')
        else:
            id_usuario = identity
            
        usuario = Usuario.query.get(id_usuario)
        
        if not usuario or usuario.rol not in ['admin', 'superadmin']:
            return jsonify({'error': 'No autorizado'}), 403
        
        # Verificar que el partido existe
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Obtener alineaciones del equipo local
        response_local = requests.get(
            f"{MICROSERVICIO_URL}/alineaciones",
            params={
                'id_partido': id_partido,
                'id_equipo': partido.id_equipo_local
            },
            timeout=10
        )
        
        # Obtener alineaciones del equipo visitante
        response_visitante = requests.get(
            f"{MICROSERVICIO_URL}/alineaciones",
            params={
                'id_partido': id_partido,
                'id_equipo': partido.id_equipo_visitante
            },
            timeout=10
        )
        
        alineacion_local = []
        alineacion_visitante = []
        
        if response_local.status_code == 200:
            alineacion_local = response_local.json().get('alineaciones', [])
        
        if response_visitante.status_code == 200:
            alineacion_visitante = response_visitante.json().get('alineaciones', [])
        
        # Obtener equipos con logos
        equipo_local = Equipo.query.get(partido.id_equipo_local)
        equipo_visitante = Equipo.query.get(partido.id_equipo_visitante)
        
        return jsonify({
            'partido': {
                'id_partido': partido.id_partido,
                'equipo_local': equipo_local.nombre if equipo_local else 'Equipo Local',
                'equipo_visitante': equipo_visitante.nombre if equipo_visitante else 'Equipo Visitante',
                'logo_local': equipo_local.logo_url if equipo_local else None,
                'logo_visitante': equipo_visitante.logo_url if equipo_visitante else None,
                'tipo_deporte': partido.campeonato.tipo_deporte if partido.campeonato else 'futbol',
                'estado': partido.estado
            },
            'alineacion_local': alineacion_local,
            'alineacion_visitante': alineacion_visitante,
            'tiene_alineacion_local': len(alineacion_local) > 0,
            'tiene_alineacion_visitante': len(alineacion_visitante) > 0
        }), 200
        
    except requests.RequestException as e:
        return jsonify({'error': f'Error al comunicarse con microservicio: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ORGANIZADOR - VALIDAR ALINEACIONES
# ============================================
@alineaciones_proxy_bp.route('/organizador/partidos/<int:id_partido>/validar-alineaciones', methods=['GET'])
@jwt_required()
def validar_alineaciones_partido(id_partido):
    """Valida que ambos equipos hayan subido alineación"""
    try:
        identity = get_jwt_identity()
        
        # 🔥 ARREGLO: identity puede ser dict o int
        if isinstance(identity, dict):
            id_usuario = identity.get('id_usuario')
        else:
            id_usuario = identity
            
        usuario = Usuario.query.get(id_usuario)
        
        if not usuario or usuario.rol not in ['admin', 'superadmin']:
            return jsonify({'error': 'No autorizado'}), 403
        
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Obtener alineaciones del microservicio
        response_local = requests.get(
            f"{MICROSERVICIO_URL}/alineaciones",
            params={
                'id_partido': id_partido,
                'id_equipo': partido.id_equipo_local
            },
            timeout=10
        )
        
        response_visitante = requests.get(
            f"{MICROSERVICIO_URL}/alineaciones",
            params={
                'id_partido': id_partido,
                'id_equipo': partido.id_equipo_visitante
            },
            timeout=10
        )
        
        tiene_local = False
        tiene_visitante = False
        
        if response_local.status_code == 200:
            alineaciones_local = response_local.json().get('alineaciones', [])
            titulares_local = [a for a in alineaciones_local if a.get('titular')]
            tiene_local = len(titulares_local) >= 6  # Mínimo 6 titulares
        
        if response_visitante.status_code == 200:
            alineaciones_visitante = response_visitante.json().get('alineaciones', [])
            titulares_visitante = [a for a in alineaciones_visitante if a.get('titular')]
            tiene_visitante = len(titulares_visitante) >= 6
        
        puede_iniciar = tiene_local and tiene_visitante
        
        penalizaciones = []
        
        equipo_local = Equipo.query.get(partido.id_equipo_local)
        equipo_visitante = Equipo.query.get(partido.id_equipo_visitante)
        
        return jsonify({
            'puede_iniciar': puede_iniciar,
            'tiene_alineacion_local': tiene_local,
            'tiene_alineacion_visitante': tiene_visitante,
            'equipo_local': equipo_local.nombre if equipo_local else 'Equipo Local',
            'equipo_visitante': equipo_visitante.nombre if equipo_visitante else 'Equipo Visitante',
            'penalizaciones': penalizaciones,
            'mensaje': 'Ambos equipos tienen alineación' if puede_iniciar else 'Faltan alineaciones'
        }), 200
        
    except requests.RequestException as e:
        return jsonify({'error': f'Error al comunicarse con microservicio: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# LÍDER - DEFINIR ALINEACIÓN (PROXY)
# ============================================
@alineaciones_proxy_bp.route('/lider/alineaciones/definir', methods=['POST'])
@jwt_required()
def definir_alineacion():
    """Proxy para definir alineación en el microservicio"""
    try:
        identity = get_jwt_identity()
        
        # 🔥 ARREGLO: identity puede ser dict o int
        if isinstance(identity, dict):
            id_usuario = identity.get('id_usuario')
        else:
            id_usuario = identity
            
        usuario = Usuario.query.get(id_usuario)
        
        if not usuario or usuario.rol != 'lider':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        
        # Validar que el partido existe
        partido = Partido.query.get(data.get('id_partido'))
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Validar que el equipo participa en el partido
        id_equipo = data.get('id_equipo')
        if id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        
        # Validar que el usuario es líder del equipo
        equipo = Equipo.query.get(id_equipo)
        if not equipo or equipo.id_lider != usuario.id_usuario:
            return jsonify({'error': 'No eres líder de este equipo'}), 403
        
        # Penalización deshabilitada para pruebas
        minutos_penalizacion = 0
        
        # Enviar al microservicio
        response = requests.post(
            f"{MICROSERVICIO_URL}/alineaciones/definir-alineacion",
            json=data,
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            respuesta = response.json()
            return jsonify(respuesta), response.status_code
        else:
            return jsonify(response.json()), response.status_code
            
    except requests.RequestException as e:
        return jsonify({'error': f'Error al comunicarse con microservicio: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# LÍDER - OBTENER ALINEACIONES (PROXY)
# ============================================
@alineaciones_proxy_bp.route('/lider/alineaciones', methods=['GET'])
@jwt_required()
def obtener_alineaciones():
    """Proxy para obtener alineaciones del microservicio"""
    try:
        identity = get_jwt_identity()
        
        # 🔥 ARREGLO: identity puede ser dict o int
        if isinstance(identity, dict):
            id_usuario = identity.get('id_usuario')
        else:
            id_usuario = identity
            
        usuario = Usuario.query.get(id_usuario)
        
        if not usuario or usuario.rol != 'lider':
            return jsonify({'error': 'No autorizado'}), 403
        
        id_partido = request.args.get('id_partido')
        id_equipo = request.args.get('id_equipo')
        
        if not id_partido or not id_equipo:
            return jsonify({'error': 'Faltan parámetros'}), 400
        
        # Validar que el usuario es líder del equipo
        equipo = Equipo.query.get(int(id_equipo))
        if not equipo or equipo.id_lider != usuario.id_usuario:
            return jsonify({'error': 'No eres líder de este equipo'}), 403
        
        # Obtener del microservicio
        try:
            response = requests.get(
                f"{MICROSERVICIO_URL}/alineaciones",
                params={'id_partido': id_partido, 'id_equipo': id_equipo},
                timeout=5
            )
            
            if response.status_code == 200:
                return jsonify(response.json()), 200
            elif response.status_code == 404:
                return jsonify({'alineaciones': []}), 200
            else:
                return jsonify({'alineaciones': []}), 200
                
        except requests.exceptions.ConnectionError:
            return jsonify({'alineaciones': []}), 200
        except requests.exceptions.Timeout:
            return jsonify({'alineaciones': []}), 200
        except Exception as e:
            print(f"⚠️ Error microservicio: {str(e)}")
            return jsonify({'alineaciones': []}), 200
            
    except Exception as e:
        print(f"❌ Error en obtener_alineaciones: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'alineaciones': []}), 500


# ============================================
# LÍDER - HACER CAMBIO DURANTE EL PARTIDO (PROXY)
# ============================================
@alineaciones_proxy_bp.route('/lider/alineaciones/cambio', methods=['POST'])
@jwt_required()
def hacer_cambio():
    """Proxy para hacer cambio de jugador durante el partido"""
    try:
        identity = get_jwt_identity()
        
        # 🔥 ARREGLO: identity puede ser dict o int
        if isinstance(identity, dict):
            id_usuario = identity.get('id_usuario')
        else:
            id_usuario = identity
            
        usuario = Usuario.query.get(id_usuario)
        
        if not usuario or usuario.rol != 'lider':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        
        # Validar que el partido existe
        partido = Partido.query.get(data.get('id_partido'))
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Validar que el partido esté en juego
        if partido.estado != 'en_juego':
            return jsonify({'error': 'Solo se pueden hacer cambios en partidos en juego'}), 400
        
        # Validar que el equipo participa en el partido
        id_equipo = data.get('id_equipo')
        if id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        
        # Validar que el usuario es líder del equipo
        equipo = Equipo.query.get(id_equipo)
        if not equipo or equipo.id_lider != usuario.id_usuario:
            return jsonify({'error': 'No eres líder de este equipo'}), 403
        
        # Enviar al microservicio
        response = requests.post(
            f"{MICROSERVICIO_URL}/alineaciones/cambio",
            json=data,
            headers={'Authorization': request.headers.get('Authorization')},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return jsonify(response.json()), response.status_code
        else:
            return jsonify(response.json()), response.status_code
            
    except requests.RequestException as e:
        return jsonify({'error': f'Error al comunicarse con microservicio: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500