import re
import html
from functools import wraps
from flask import request, jsonify

class InputSanitizer:
    """
    Sanitiza entradas para prevenir XSS, SQL Injection y otros ataques
    
    OWASP A03: Injection
    """
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = None) -> str:
        """
        Limpia un string de caracteres peligrosos
        
        Args:
            text: Texto a sanitizar
            max_length: Longitud máxima permitida
        
        Returns:
            str: Texto sanitizado
        """
        if not text or not isinstance(text, str):
            return text
        
        # 1. Escapar HTML para prevenir XSS
        text = html.escape(text)
        
        # 2. Remover caracteres de control
        text = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', text)
        
        # 3. Limpiar espacios múltiples
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 4. Truncar si excede longitud máxima
        if max_length and len(text) > max_length:
            text = text[:max_length]
        
        return text
    
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """
        Limpia y valida un email
        
        Args:
            email: Email a sanitizar
        
        Returns:
            str: Email limpio en minúsculas
        """
        if not email:
            return email
        
        # Convertir a minúsculas y limpiar espacios
        email = email.lower().strip()
        
        # Remover caracteres peligrosos
        email = re.sub(r'[<>"\'\\/]', '', email)
        
        return email
    
    
    @staticmethod
    def sanitize_dict(data: dict, rules: dict = None) -> dict:
        """
        Sanitiza un diccionario completo
        
        Args:
            data: Diccionario con datos a sanitizar
            rules: Reglas específicas por campo
                   Ejemplo: {'nombre': 100, 'email': 'email', 'edad': 'int'}
        
        Returns:
            dict: Diccionario sanitizado
        """
        if not data or not isinstance(data, dict):
            return data
        
        sanitized = {}
        
        for key, value in data.items():
            # Si hay reglas específicas
            if rules and key in rules:
                rule = rules[key]
                
                # Regla: email
                if rule == 'email':
                    sanitized[key] = InputSanitizer.sanitize_email(value)
                
                # Regla: int (longitud máxima)
                elif isinstance(rule, int):
                    sanitized[key] = InputSanitizer.sanitize_string(value, max_length=rule)
                
                # Regla: tipo de dato
                elif rule == 'int':
                    try:
                        sanitized[key] = int(value)
                    except:
                        sanitized[key] = None
                
                elif rule == 'float':
                    try:
                        sanitized[key] = float(value)
                    except:
                        sanitized[key] = None
                
                elif rule == 'bool':
                    sanitized[key] = bool(value)
                
                else:
                    sanitized[key] = InputSanitizer.sanitize_string(value)
            
            # Sin reglas específicas, sanitizar strings
            elif isinstance(value, str):
                sanitized[key] = InputSanitizer.sanitize_string(value)
            
            else:
                sanitized[key] = value
        
        return sanitized


def sanitize_input(rules: dict = None):
    """
    Decorador para sanitizar automáticamente el request body
    
    Uso:
        @sanitize_input({'nombre': 100, 'email': 'email', 'edad': 'int'})
        def crear_usuario():
            data = request.get_json()
            # data ya viene sanitizado
    
    Args:
        rules: Diccionario con reglas de sanitización por campo
    
    Returns:
        function: Decorador
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.is_json:
                try:
                    # Obtener datos originales
                    original_data = request.get_json()
                    
                    # Sanitizar datos
                    sanitized_data = InputSanitizer.sanitize_dict(original_data, rules)
                    
                    # Reemplazar request.get_json() con datos sanitizados
                    request._cached_data = sanitized_data
                    
                except Exception as e:
                    return jsonify({'error': f'Error sanitizando datos: {str(e)}'}), 400
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator