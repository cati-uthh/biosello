import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { API_BASE_URL, getAuthHeaders, getAuthToken } from './auth';

export const TAMANIO_MAXIMO_IMAGEN_ANIMAL = 3 * 1024 * 1024;

const EXTENSIONES_PERMITIDAS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MIME_GENERICOS = new Set(['application/octet-stream', 'binary/octet-stream']);

const obtenerExtension = (nombre = '') => {
    const partes = String(nombre).trim().toLowerCase().split('.');
    return partes.length > 1 ? partes.pop() : '';
};

const obtenerTamanio = async (asset) => {
    const tamanioReportado = Number(asset?.size || asset?.file?.size);
    if (Number.isFinite(tamanioReportado) && tamanioReportado > 0) return tamanioReportado;

    if (asset?.uri) {
        const informacion = await FileSystem.getInfoAsync(asset.uri);
        const tamanioLocal = Number(informacion?.size);
        if (informacion.exists && Number.isFinite(tamanioLocal) && tamanioLocal > 0) return tamanioLocal;
    }

    throw new Error('No fue posible comprobar el tamaño de la imagen. Selecciona otro archivo.');
};

const validarTipo = (asset) => {
    const extension = obtenerExtension(asset?.name);
    const mimeType = String(asset?.mimeType || asset?.file?.type || '').trim().toLowerCase();
    const extensionInformada = Boolean(extension);
    const mimeInformado = Boolean(mimeType);

    if (extensionInformada && !EXTENSIONES_PERMITIDAS.has(extension)) {
        throw new Error('Formato no permitido. Usa una imagen JPG, JPEG, PNG o WEBP.');
    }
    if (mimeInformado && !MIME_PERMITIDOS.has(mimeType) && !MIME_GENERICOS.has(mimeType)) {
        throw new Error('El archivo seleccionado no corresponde a una imagen JPG, JPEG, PNG o WEBP.');
    }
    if (!extensionInformada && (!mimeInformado || MIME_GENERICOS.has(mimeType))) {
        throw new Error('No fue posible identificar el formato de la imagen.');
    }

    return MIME_PERMITIDOS.has(mimeType) ? mimeType : (extension === 'png'
        ? 'image/png'
        : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg');
};

export const formatearTamanioArchivo = (bytes) => {
    const numero = Number(bytes);
    if (!Number.isFinite(numero) || numero <= 0) return 'Tamaño desconocido';
    if (numero < 1024) return `${numero} B`;
    if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(1)} KB`;
    return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
};

export const seleccionarImagenAnimal = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        multiple: false,
        copyToCacheDirectory: true,
        base64: false
    });

    if (resultado.canceled) return null;

    const asset = resultado.assets?.[0];
    if (!asset?.uri) {
        throw new Error('No se pudo leer la imagen seleccionada.');
    }

    const mimeType = validarTipo(asset);
    const tamanioBytes = await obtenerTamanio(asset);
    if (tamanioBytes > TAMANIO_MAXIMO_IMAGEN_ANIMAL) {
        throw new Error('La imagen supera el límite de 3 MB. Selecciona una fotografía más ligera.');
    }

    return {
        uri: asset.uri,
        nombre: asset.name || `animal-${Date.now()}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`,
        mimeType,
        tamanioBytes,
        file: asset.file || null
    };
};

const leerBase64Web = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const resultado = String(reader.result || '');
        const base64 = resultado.includes(',') ? resultado.split(',').pop() : resultado;
        if (!base64) reject(new Error('No fue posible leer la fotografia seleccionada.'));
        else resolve(base64);
    };
    reader.onerror = () => reject(new Error('No fue posible leer la fotografia seleccionada.'));
    reader.readAsDataURL(file);
});

const leerImagenBase64 = async (imagen) => {
    if (Platform.OS === 'web' && imagen?.file && typeof FileReader !== 'undefined') {
        return leerBase64Web(imagen.file);
    }
    return FileSystem.readAsStringAsync(imagen.uri, {
        encoding: FileSystem.EncodingType.Base64
    });
};

export const subirImagenAnimal = async (imagen, usuario) => {
    if (!imagen) return null;

    const idUsuario = Number(usuario?.id_usuario || usuario?.id);
    const token = getAuthToken(usuario);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !token) {
        throw new Error('Tu sesion no es valida para subir fotografias. Inicia sesion nuevamente.');
    }

    const tamanio = Number(imagen.tamanioBytes);
    if (!Number.isFinite(tamanio) || tamanio <= 0 || tamanio > TAMANIO_MAXIMO_IMAGEN_ANIMAL) {
        throw new Error('La fotografia no tiene un tamaño valido o supera el limite de 3 MB.');
    }

    const archivoBase64 = await leerImagenBase64(imagen);
    const response = await fetch(`${API_BASE_URL}/imagenes-animal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
        body: JSON.stringify({
            nombre: imagen.nombre,
            mimeType: imagen.mimeType,
            tamanioBytes: tamanio,
            archivoBase64
        })
    });
    const contenido = await response.text();
    let resultado = {};
    try {
        resultado = contenido ? JSON.parse(contenido) : {};
    } catch (error) {
        resultado = {};
    }

    if (!response.ok || resultado.success === false) {
        throw new Error(resultado.error || 'No se pudo subir la fotografia a Vercel Blob.');
    }

    if (!resultado.data?.url || !resultado.data?.pathname) {
        throw new Error('Vercel Blob no devolvio una referencia valida para la fotografia.');
    }

    return resultado.data;
};

export const eliminarImagenAnimalTemporal = async (imagenBlob, usuario) => {
    if (!imagenBlob?.url || !imagenBlob?.pathname) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/imagenes-animal`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
            body: JSON.stringify({
                url: imagenBlob.url,
                pathname: imagenBlob.pathname
            })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
};

const obtenerValorAnidado = (datos, ruta) => ruta.reduce(
    (actual, segmento) => (actual && typeof actual === 'object' ? actual[segmento] : null),
    datos
);

export const obtenerUriImagenAnimal = (datos) => {
    const rutasCompatibles = [
        ['detalles_trazabilidad', 'imagen_animal_url'],
        ['animal', 'imagen_animal_url'],
        ['imagen_animal_url'],
        ['data', 'detalles_trazabilidad', 'imagen_animal_url'],
        ['data', 'animal', 'imagen_animal_url'],
        ['data', 'imagen_animal_url']
    ];

    for (const ruta of rutasCompatibles) {
        const valor = String(obtenerValorAnidado(datos, ruta) || '').trim();
        if (/^https?:\/\//i.test(valor)) return valor;
    }

    return null;
};

export const liberarUriImagenTemporal = (uri) => {
    const valor = String(uri || '');
    if (!valor.startsWith('blob:')) return;

    try {
        if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(valor);
        }
    } catch (error) {
        // Las URI nativas file:// o content:// no necesitan liberarse manualmente.
    }
};
