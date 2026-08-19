import { API_BASE_URL, getAuthHeaders } from './auth';

export { API_BASE_URL };

export const getSessionIds = (usuario) => ({
    idNegocio: usuario?.id_negocio || usuario?.negocio?.id_negocio || null,
    idEmpleado: usuario?.id_usuario || usuario?.id || null
});

const limpiar = (value) => String(value ?? '').trim();

const normalizarBooleano = (value) => {
    if (typeof value === 'boolean') return value;

    const texto = limpiar(value).toLowerCase();
    return ['true', '1', 'si', 'sí', 'yes', 'on'].includes(texto);
};

const getLoteId = (lote) => limpiar(lote?.id_lote || lote?.lote_id || lote?.id);
const getCodigoLote = (lote) => limpiar(lote?.codigo_lote || lote?.codigo || lote?.lote);

export const crearValorQR = (lote, usuario, idNegocioSeleccionado = null, opciones = {}) => {
    const { idNegocio: idNegocioSesion } = getSessionIds(usuario);
    const idCorte = limpiar(opciones.id_corte ?? opciones.idCorte ?? lote?.id_corte);
    const valor = {
        tipo: 'biosello_lote',
        version: 1,
        id_lote: getLoteId(lote),
        id_corte: idCorte || null,
        incluir_tip_cuidado: normalizarBooleano(
            opciones.incluir_tip_cuidado ?? opciones.incluirTipCuidado
        ),
        incluir_recomendacion: normalizarBooleano(
            opciones.incluir_recomendacion ?? opciones.incluirRecomendacion
        )
    };
    const codigoLote = getCodigoLote(lote);
    const idNegocio = idNegocioSeleccionado || idNegocioSesion;

    if (codigoLote) valor.codigo_lote = codigoLote;
    if (idNegocio) valor.id_negocio = String(idNegocio);

    return JSON.stringify(valor);
};

const identificadorDesdeObjeto = (objeto, raw) => {
    if (!objeto || typeof objeto !== 'object') return null;

    const idLote = limpiar(objeto.id_lote || objeto.lote_id || objeto.idLote || objeto.id);
    const idNegocio = limpiar(objeto.id_negocio || objeto.idNegocio || objeto.negocio);
    const idCorte = limpiar(objeto.id_corte || objeto.idCorte || objeto.corte);
    const incluirTipCuidado = normalizarBooleano(
        objeto.incluir_tip_cuidado ?? objeto.incluirTipCuidado
    );
    const incluirRecomendacion = normalizarBooleano(
        objeto.incluir_recomendacion ?? objeto.incluirRecomendacion
    );
    const codigoLote = limpiar(
        objeto.codigo_lote || objeto.codigoLote || objeto.codigo || objeto.lote || objeto.code
    );

    if (!idLote && !codigoLote) return null;
    return {
        idLote,
        idNegocio,
        codigoLote,
        idCorte,
        incluirTipCuidado,
        incluirRecomendacion,
        raw
    };
};

const identificadorPlano = (codigoLote, raw) => ({
    idLote: '',
    idNegocio: '',
    codigoLote: limpiar(codigoLote),
    idCorte: '',
    incluirTipCuidado: false,
    incluirRecomendacion: false,
    raw
});

export const extraerIdentificadorQR = (contenido) => {
    const raw = limpiar(contenido);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        const identificador = identificadorDesdeObjeto(parsed, raw);
        if (identificador) return identificador;
    } catch (error) {
        // El QR tambien puede venir como URL, query string o codigo plano.
    }

    try {
        if (/^https?:\/\//i.test(raw)) {
            const url = new URL(raw);
            const identificador = identificadorDesdeObjeto(
                Object.fromEntries(url.searchParams.entries()),
                raw
            );
            if (identificador) return identificador;

            const pathCode = limpiar(url.pathname.split('/').filter(Boolean).pop());
            if (pathCode) return identificadorPlano(pathCode, raw);
        }
    } catch (error) {
        // Si no es una URL valida, seguimos con otros formatos.
    }

    if (raw.includes('=')) {
        const query = raw.startsWith('?') ? raw.slice(1) : raw;
        const identificador = identificadorDesdeObjeto(
            Object.fromEntries(new URLSearchParams(query).entries()),
            raw
        );
        if (identificador) return identificador;
    }

    return identificadorPlano(raw, raw);
};

const normalizarRespuestaLotes = (result) => {
    if (Array.isArray(result)) return result;
    const data = result?.data || result?.lotes || result?.lote || result;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    return [];
};

const coincideLote = (lote, identificador) => {
    const idBuscado = limpiar(identificador?.idLote);
    const codigoBuscado = limpiar(identificador?.codigoLote).toLowerCase();
    const rawBuscado = limpiar(identificador?.raw).toLowerCase();

    const ids = [lote?.id_lote, lote?.lote_id, lote?.id].map(limpiar);
    const codigos = [lote?.codigo_lote, lote?.codigo, lote?.lote].map((value) => limpiar(value).toLowerCase());

    return (
        (idBuscado && ids.includes(idBuscado))
        || (codigoBuscado && codigos.includes(codigoBuscado))
        || (rawBuscado && codigos.includes(rawBuscado))
    );
};

const buildQuery = (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && limpiar(value)) query.append(key, String(value));
    });
    return query.toString();
};

const fetchLotes = async (params, usuario) => {
    const query = buildQuery(params);
    const response = await fetch(`${API_BASE_URL}/lotes${query ? `?${query}` : ''}`, {
        headers: getAuthHeaders(usuario)
    });
    const text = await response.text();
    let result = {};

    try {
        result = text ? JSON.parse(text) : {};
    } catch (error) {
        result = {};
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'No se pudieron consultar los lotes.');
    }

    return normalizarRespuestaLotes(result);
};

export const buscarLotePorIdentificador = async (identificador, usuario) => {
    if (!identificador) throw new Error('El codigo QR no contiene un lote valido.');

    const { idNegocio, idEmpleado } = getSessionIds(usuario);
    const baseSesion = {};
    if (identificador.idNegocio) baseSesion.id_negocio = identificador.idNegocio;
    else if (idNegocio) baseSesion.id_negocio = idNegocio;
    if (idEmpleado) baseSesion.id_empleado = idEmpleado;

    const candidatos = [];
    if (identificador.idLote) candidatos.push({ ...baseSesion, id_lote: identificador.idLote });
    if (identificador.codigoLote) {
        candidatos.push({ ...baseSesion, codigo_lote: identificador.codigoLote });
        candidatos.push({ ...baseSesion, lote: identificador.codigoLote });
    }

    if (Object.keys(baseSesion).length > 0) candidatos.push(baseSesion);
    if (candidatos.length === 0 && identificador.codigoLote) candidatos.push({ codigo_lote: identificador.codigoLote });

    const vistos = new Set();
    let pudoConsultar = false;
    let ultimoError = null;

    for (const params of candidatos) {
        const key = JSON.stringify(params);
        if (vistos.has(key)) continue;
        vistos.add(key);

        try {
            const lotes = await fetchLotes(params, usuario);
            pudoConsultar = true;
            const encontrado = lotes.find((lote) => coincideLote(lote, identificador));
            if (encontrado) return encontrado;
            if (lotes.length === 1 && !identificador.codigoLote) return lotes[0];
        } catch (error) {
            ultimoError = error;
        }
    }

    if (!pudoConsultar && ultimoError) throw ultimoError;
    throw new Error('No encontramos un lote que coincida con ese codigo QR.');
};
