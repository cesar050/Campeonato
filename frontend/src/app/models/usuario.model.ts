export interface Usuario{
    id_usuario: number;
    nombre: string;
    email: string;
    rol: 'admin'| 'lider' | 'espectador';
    activo: boolean;
    fecha_registro: string;
}

export interface LoginRequest{
    email: string;
    contrasena: string;
}

export interface LoginResponse{
    mensaje: string;
    access_token: string;
    usuario: Usuario;
}

export interface RegisterRequest{
    nombre : string;
    email : string;
    contrasena : string;
    rol : 'admin'|'lider'|'espectador'
}
