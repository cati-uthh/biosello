import * as SecureStore from 'expo-secure-store';

export { API_BASE_URL } from '../config/api';

export const normalizarUsuarioSesion = (data = {}) => {
    if (!data || typeof data !== 'object') return null;

    const usuarioBase = data?.usuario || data?.user || data?.data || data;
    if (!usuarioBase || typeof usuarioBase !== 'object') return null;

    const token = data?.token
        || data?.accessToken
        || data?.access_token
        || usuarioBase?.token
        || usuarioBase?.accessToken
        || usuarioBase?.access_token
        || null;

    const id = usuarioBase.id_usuario || usuarioBase.id || usuarioBase.user_id || data?.id_usuario || data?.id || null;
    const email = usuarioBase.email || usuarioBase.correo || data?.email || data?.correo || null;
    const nombre = usuarioBase.nombre || usuarioBase.name || data?.nombre || data?.name || null;

    if (!id && !email && !nombre) return null;

    return {
        ...data,
        ...usuarioBase,
        ...(id ? { id, id_usuario: id } : {}),
        ...(email ? { email } : {}),
        ...(nombre ? { nombre } : {}),
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

const CLAVE_BIOMETRIA_DATOS = 'biosello_biometria_cuenta_datos';
const DURACION_BIOMETRIA_MS = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

// Función para guardar credenciales biométricas vinculadas a la cuenta con marca de tiempo
export const guardarBiometriaCuenta = async (identificador, contrasena) => {
    try {
        const payload = JSON.stringify({
            identificador: String(identificador || '').trim().toLowerCase(),
            contrasena: String(contrasena || ''),
            activadoEn: Date.now()
        });
        await SecureStore.setItemAsync(CLAVE_BIOMETRIA_DATOS, payload);
        return true;
    } catch (error) {
        return false;
    }
};

// Función para obtener la credencial biométrica guardada comprobando el límite de 30 días
export const obtenerBiometriaCuenta = async () => {
    try {
        const raw = await SecureStore.getItemAsync(CLAVE_BIOMETRIA_DATOS);
        if (!raw) return null;

        const datos = JSON.parse(raw);
        if (!datos?.identificador || !datos?.contrasena || !datos?.activadoEn) {
            await eliminarBiometriaCuenta();
            return null;
        }

        const tiempoTranscurrido = Date.now() - Number(datos.activadoEn);
        if (tiempoTranscurrido > DURACION_BIOMETRIA_MS) {
            await eliminarBiometriaCuenta();
            return null;
        }

        return datos;
    } catch (error) {
        return null;
    }
};

// Función para eliminar completamente las credenciales biométricas guardadas
export const eliminarBiometriaCuenta = async () => {
    try {
        await Promise.all([
            SecureStore.deleteItemAsync(CLAVE_BIOMETRIA_DATOS),
            SecureStore.deleteItemAsync('biosello_usuario_identificador'),
            SecureStore.deleteItemAsync('biosello_usuario_pass'),
            SecureStore.deleteItemAsync('biosello_biometria_activada')
        ]);
        return true;
    } catch (error) {
        return false;
    }
};
