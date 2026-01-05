from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.usuario import Usuario
from app.models.campeonato import Campeonato
from app.models.partido import Partido
from app.models.equipo import Equipo
from io import BytesIO
import csv
from datetime import datetime

reportes_bp = Blueprint('reportes', __name__)

# ============================================
# EXPORTAR TABLA DE POSICIONES (CSV)
# ============================================
@reportes_bp.route('/reportes/tabla-posiciones/<int:id_campeonato>/csv', methods=['GET'])
@jwt_required()
def exportar_tabla_csv(id_campeonato):
    """Exporta la tabla de posiciones en formato CSV"""
    try:
        identity = get_jwt_identity()
        usuario = Usuario.query.get(identity['id_usuario'])
        
        if not usuario:
            return jsonify({'error': 'No autorizado'}), 403
        
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        
        # Obtener todos los partidos finalizados
        partidos = Partido.query.filter_by(
            id_campeonato=id_campeonato,
            estado='finalizado'
        ).all()
        
        # Calcular estadísticas por equipo
        estadisticas = {}
        
        for partido in partidos:
            # Equipo Local
            if partido.id_equipo_local not in estadisticas:
                equipo_local = Equipo.query.get(partido.id_equipo_local)
                estadisticas[partido.id_equipo_local] = {
                    'nombre': equipo_local.nombre if equipo_local else 'Desconocido',
                    'pj': 0, 'pg': 0, 'pe': 0, 'pp': 0,
                    'gf': 0, 'gc': 0, 'dif': 0, 'pts': 0
                }
            
            # Equipo Visitante
            if partido.id_equipo_visitante not in estadisticas:
                equipo_visitante = Equipo.query.get(partido.id_equipo_visitante)
                estadisticas[partido.id_equipo_visitante] = {
                    'nombre': equipo_visitante.nombre if equipo_visitante else 'Desconocido',
                    'pj': 0, 'pg': 0, 'pe': 0, 'pp': 0,
                    'gf': 0, 'gc': 0, 'dif': 0, 'pts': 0
                }
            
            # Actualizar estadísticas
            estadisticas[partido.id_equipo_local]['pj'] += 1
            estadisticas[partido.id_equipo_local]['gf'] += partido.goles_local
            estadisticas[partido.id_equipo_local]['gc'] += partido.goles_visitante
            
            estadisticas[partido.id_equipo_visitante]['pj'] += 1
            estadisticas[partido.id_equipo_visitante]['gf'] += partido.goles_visitante
            estadisticas[partido.id_equipo_visitante]['gc'] += partido.goles_local
            
            # Determinar resultado
            if partido.goles_local > partido.goles_visitante:
                estadisticas[partido.id_equipo_local]['pg'] += 1
                estadisticas[partido.id_equipo_local]['pts'] += 3
                estadisticas[partido.id_equipo_visitante]['pp'] += 1
            elif partido.goles_local < partido.goles_visitante:
                estadisticas[partido.id_equipo_visitante]['pg'] += 1
                estadisticas[partido.id_equipo_visitante]['pts'] += 3
                estadisticas[partido.id_equipo_local]['pp'] += 1
            else:
                estadisticas[partido.id_equipo_local]['pe'] += 1
                estadisticas[partido.id_equipo_local]['pts'] += 1
                estadisticas[partido.id_equipo_visitante]['pe'] += 1
                estadisticas[partido.id_equipo_visitante]['pts'] += 1
        
        # Calcular diferencia de goles
        for equipo_id in estadisticas:
            estadisticas[equipo_id]['dif'] = estadisticas[equipo_id]['gf'] - estadisticas[equipo_id]['gc']
        
        # Ordenar por puntos
        tabla = sorted(
            estadisticas.values(),
            key=lambda x: (x['pts'], x['dif'], x['gf']),
            reverse=True
        )
        
        # Crear CSV
        output = BytesIO()
        output.write('\ufeff'.encode('utf-8'))  # BOM para Excel
        
        writer = csv.writer(output)
        writer.writerow(['Posición', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DIF', 'PTS'])
        
        for pos, equipo in enumerate(tabla, 1):
            writer.writerow([
                pos,
                equipo['nombre'],
                equipo['pj'],
                equipo['pg'],
                equipo['pe'],
                equipo['pp'],
                equipo['gf'],
                equipo['gc'],
                equipo['dif'],
                equipo['pts']
            ])
        
        output.seek(0)
        
        fecha_actual = datetime.now().strftime('%Y%m%d')
        nombre_archivo = f'tabla_posiciones_{campeonato.nombre}_{fecha_actual}.csv'
        
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=nombre_archivo
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORTAR FIXTURE COMPLETO (CSV)
# ============================================
@reportes_bp.route('/reportes/fixture/<int:id_campeonato>/csv', methods=['GET'])
@jwt_required()
def exportar_fixture_csv(id_campeonato):
    """Exporta el fixture completo en formato CSV"""
    try:
        identity = get_jwt_identity()
        usuario = Usuario.query.get(identity['id_usuario'])
        
        if not usuario:
            return jsonify({'error': 'No autorizado'}), 403
        
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        
        partidos = Partido.query.filter_by(id_campeonato=id_campeonato).order_by(
            Partido.jornada.asc(),
            Partido.fecha_partido.asc()
        ).all()
        
        # Crear CSV
        output = BytesIO()
        output.write('\ufeff'.encode('utf-8'))
        
        writer = csv.writer(output)
        writer.writerow(['Jornada', 'Fecha', 'Hora', 'Equipo Local', 'Equipo Visitante', 'Resultado', 'Lugar', 'Estado'])
        
        for partido in partidos:
            equipo_local = Equipo.query.get(partido.id_equipo_local)
            equipo_visitante = Equipo.query.get(partido.id_equipo_visitante)
            
            fecha = partido.fecha_partido.strftime('%Y-%m-%d') if partido.fecha_partido else 'Por definir'
            hora = partido.fecha_partido.strftime('%H:%M') if partido.fecha_partido else 'Por definir'
            
            resultado = f"{partido.goles_local} - {partido.goles_visitante}" if partido.estado == 'finalizado' else '-'
            
            writer.writerow([
                partido.jornada,
                fecha,
                hora,
                equipo_local.nombre if equipo_local else 'Desconocido',
                equipo_visitante.nombre if equipo_visitante else 'Desconocido',
                resultado,
                partido.lugar or 'Por definir',
                partido.estado
            ])
        
        output.seek(0)
        
        fecha_actual = datetime.now().strftime('%Y%m%d')
        nombre_archivo = f'fixture_{campeonato.nombre}_{fecha_actual}.csv'
        
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=nombre_archivo
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500