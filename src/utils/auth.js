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

const decodificarPayloadToken = (token) => {
    try {
        const payloadBase64Url = String(token || '').split('.')[1];
        if (!payloadBase64Url) return null;

        const payloadBase64 = payloadBase64Url
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(payloadBase64Url.length / 4) * 4, '=');
        let contenido;

        if (typeof globalThis.atob === 'function') {
            contenido = globalThis.atob(payloadBase64);
        } else {
            const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let acumulado = 0;
            let bits = 0;
            contenido = '';

            for (const caracter of payloadBase64.replace(/=+$/, '')) {
                const valor = alfabeto.indexOf(caracter);
                if (valor < 0) return null;
                acumulado = (acumulado << 6) | valor;
                bits += 6;
                if (bits >= 8) {
                    bits -= 8;
                    contenido += String.fromCharCode((acumulado >> bits) & 0xff);
                }
            }
        }

        return JSON.parse(contenido);
    } catch (error) {
        return null;
    }
};

export const obtenerExpiracionToken = (usuario) => {
    const payload = decodificarPayloadToken(getAuthToken(usuario));
    const expiracionSegundos = Number(payload?.exp);
    return Number.isFinite(expiracionSegundos) ? expiracionSegundos * 1000 : null;
};

export const esTokenSesionVigente = (usuario, ahora = Date.now()) => {
    const expiracion = obtenerExpiracionToken(usuario);
    return expiracion !== null && expiracion > ahora;
};

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
