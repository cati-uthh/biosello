export const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

export const normalizarUsuarioSesion = (data = {}) => {
    const usuarioBase = data?.usuario || data?.user || data?.data || data;
    if (!usuarioBase || typeof usuarioBase !== 'object') return null;

    const token = data?.token
        || data?.accessToken
        || data?.access_token
        || usuarioBase?.token
        || usuarioBase?.accessToken
        || usuarioBase?.access_token
        || null;

    const id = usuarioBase.id_usuario || usuarioBase.id || usuarioBase.user_id || null;
    const email = usuarioBase.email || usuarioBase.correo || null;
    const nombre = usuarioBase.nombre || usuarioBase.name || null;

    if (!id && !email && !nombre) return null;

    return {
        ...usuarioBase,
        ...(id ? { id, id_usuario: id } : {}),
        ...(token ? { token } : {})
    };
};

export const getAuthToken = (usuario) => (
    usuario?.token
    || usuario?.accessToken
    || usuario?.access_token
    || usuario?.jwt
    || null
);

export const getAuthHeaders = (usuario) => {
    const token = getAuthToken(usuario);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizarPerfilAcceso = (perfil) => {
    const valor = String(perfil || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    if (valor === 'admin' || valor === 'administrador') return 'admin';
    if (valor === 'empleado' || valor === 'employee') return 'empleado';
    return valor;
};

export const esPerfilAdministrador = (usuario) => normalizarPerfilAcceso(usuario?.perfil) === 'admin';
