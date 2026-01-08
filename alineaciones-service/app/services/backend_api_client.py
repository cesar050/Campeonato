import requests
from flask import current_app

class BackendAPIClient:
    """Cliente para comunicarse con la API principal"""
    
    def __init__(self):
        self.base_url = current_app.config['BACKEND_API_URL']
        print(f"🔍 BackendAPIClient URL: {self.base_url}")  # Debug
    
    def get_partido(self, id_partido):
        """Consulta un partido al backend principal"""
        try:
            url = f"{self.base_url}/partidos/{id_partido}"  # ← PLURAL
            print(f"🔍 GET {url}")
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                return response.json().get('partido')
            print(f"⚠️ Status: {response.status_code}")
            return None
        except Exception as e:
            print(f"❌ Error consultando partido: {e}")
            return None
    
    def get_equipo(self, id_equipo):
        """Consulta un equipo al backend principal"""
        try:
            response = requests.get(f"{self.base_url}/equipos/{id_equipo}", timeout=5)
            if response.status_code == 200:
                return response.json().get('equipo')
            return None
        except Exception as e:
            print(f"❌ Error consultando equipo: {e}")
            return None
    
    def get_jugador(self, id_jugador):
        """Consulta un jugador al backend principal"""
        try:
            response = requests.get(f"{self.base_url}/jugadores/{id_jugador}", timeout=5)
            if response.status_code == 200:
                return response.json().get('jugador')
            return None
        except Exception as e:
            print(f"❌ Error consultando jugador: {e}")
            return None
    
    def validar_jugador_en_equipo(self, id_jugador, id_equipo):
        """Valida que el jugador pertenezca al equipo"""
        jugador = self.get_jugador(id_jugador)
        if jugador and jugador.get('id_equipo') == id_equipo:
            return True
        return False
    
    def validar_equipo_en_partido(self, id_equipo, id_partido):
        """Valida que el equipo participe en el partido"""
        partido = self.get_partido(id_partido)
        if partido:
            return id_equipo in [partido.get('id_equipo_local'), partido.get('id_equipo_visitante')]
        return False
