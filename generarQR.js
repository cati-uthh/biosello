import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { API_BASE_URL, crearValorQR, getSessionIds } from './src/utils/qr';
import { getAuthHeaders } from './src/utils/auth';

const normalizarLotes = (result) => {
    if (Array.isArray(result)) return result;
    const data = result?.data || result?.lotes || result?.lote || [];
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    return [];
};

const nombreEspecie = (especie) => {
    if (especie === 'PORCINO') return 'Cerdo';
    if (especie === 'BOVINO') return 'Res';
    return especie || 'Sin especie';
};

export default function GenerarQR({ onVolver }) {
    const { usuario } = useContext(AuthContext);
    const idsSesion = useMemo(() => getSessionIds(usuario), [usuario]);
    const [lotes, setLotes] = useState([]);
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const cargarLotes = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (idsSesion.idNegocio) params.append('id_negocio', String(idsSesion.idNegocio));
            if (idsSesion.idEmpleado) params.append('id_empleado', String(idsSesion.idEmpleado));

            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/lotes${query ? `?${query}` : ''}`, {
                headers: getAuthHeaders(usuario)
            });
            const text = await response.text();
            let result = {};

            try {
                result = text ? JSON.parse(text) : {};
            } catch (parseError) {
                result = {};
            }

            if (!response.ok || result.success === false) {
                throw new Error(result.error || 'No se pudieron cargar los lotes.');
            }

            const data = normalizarLotes(result);
            setLotes(data);
            setLoteSeleccionado((actual) => {
                if (!data.length) return null;
                if (!actual) return data[0];
                return data.find((lote) => lote.id_lote === actual.id_lote) || data[0];
            });
        } catch (fetchError) {
            setLotes([]);
            setLoteSeleccionado(null);
            setError(fetchError.message || 'No se pudo conectar con el servidor.');
        } finally {
            setCargando(false);
        }
    }, [idsSesion.idEmpleado, idsSesion.idNegocio, usuario]);

    useEffect(() => {
        cargarLotes();
    }, [cargarLotes]);

    const qrValor = loteSeleccionado ? crearValorQR(loteSeleccionado, usuario) : '';

    const imprimirEtiqueta = () => {
        if (!loteSeleccionado) return;
        Alert.alert(
            'Etiqueta lista',
            `El QR del lote ${loteSeleccionado.codigo_lote || loteSeleccionado.id_lote} ya esta listo para imprimir.`
        );
    };

    return (
        <ScrollView style={styles.contenedorQR} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
            </TouchableOpacity>

            <View style={styles.encabezadoFila}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.tituloSeccionQR}>Codigo QR de trazabilidad</Text>
                    <Text style={styles.subtituloSeccionQR}>
                        Selecciona un lote registrado y genera una etiqueta QR vinculada al inventario real.
                    </Text>
                </View>
                <TouchableOpacity style={styles.botonIcono} onPress={cargarLotes} disabled={cargando}>
                    <Ionicons name="refresh" size={20} color="#002855" />
                </TouchableOpacity>
            </View>

            {cargando ? (
                <View style={styles.estadoCard}>
                    <ActivityIndicator color={COLORS.azulMarino} />
                    <Text style={styles.estadoTexto}>Cargando lotes...</Text>
                </View>
            ) : error ? (
                <View style={styles.estadoCard}>
                    <Ionicons name="cloud-offline-outline" size={28} color={COLORS.rojoIntenso} />
                    <Text style={styles.estadoTitulo}>No se pudo cargar el inventario</Text>
                    <Text style={styles.estadoTexto}>{error}</Text>
                    <TouchableOpacity style={styles.botonSecundario} onPress={cargarLotes}>
                        <Text style={styles.textoBotonSecundario}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : lotes.length === 0 ? (
                <View style={styles.estadoCard}>
                    <Ionicons name="cube-outline" size={30} color="#94a3b8" />
                    <Text style={styles.estadoTitulo}>Sin lotes para etiquetar</Text>
                    <Text style={styles.estadoTexto}>Registra un lote de carne antes de crear su codigo QR.</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.seccionLabel}>Lotes disponibles</Text>
                    <View style={styles.listaLotes}>
                        {lotes.map((lote) => {
                            const activo = loteSeleccionado?.id_lote === lote.id_lote;
                            return (
                                <TouchableOpacity
                                    key={String(lote.id_lote || lote.codigo_lote)}
                                    style={[styles.loteFila, activo && styles.loteFilaActiva]}
                                    onPress={() => setLoteSeleccionado(lote)}
                                >
                                    <View style={styles.loteIcono}>
                                        <Ionicons name={activo ? 'checkmark' : 'cube-outline'} size={18} color={activo ? COLORS.blancoPuro : COLORS.azulMarino} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.loteCodigo}>{lote.codigo_lote || `Lote #${lote.id_lote}`}</Text>
                                        <Text style={styles.loteDetalle}>
                                            {nombreEspecie(lote.especie)} · {lote.tipo_corte || 'Sin corte'} · {lote.estado || 'sin estado'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {loteSeleccionado && (
                        <View style={styles.tarjetaEtiqueta}>
                            <Text style={styles.encabezadoEtiqueta}>Etiqueta BioSello</Text>

                            <View style={styles.bloqueQR}>
                                <QRCode
                                    value={qrValor}
                                    size={180}
                                    color="#002855"
                                    backgroundColor={COLORS.blancoPuro}
                                />
                            </View>

                            <Text style={styles.codigoRespaldo}>{loteSeleccionado.codigo_lote || `Lote #${loteSeleccionado.id_lote}`}</Text>

                            <View style={styles.tablaInfo}>
                                <Text style={styles.infoLinea}><Text style={styles.bold}>Especie:</Text> {nombreEspecie(loteSeleccionado.especie)}</Text>
                                <Text style={styles.infoLinea}><Text style={styles.bold}>Corte:</Text> {loteSeleccionado.tipo_corte || 'N/D'}</Text>
                                <Text style={styles.infoLinea}><Text style={styles.bold}>Peso:</Text> {loteSeleccionado.peso_kg || 'N/D'} kg</Text>
                                <Text style={styles.infoLinea}><Text style={styles.bold}>Produccion:</Text> {loteSeleccionado.fecha_ingreso || 'N/D'}</Text>
                                <Text style={styles.infoLinea}><Text style={styles.bold}>Consumo pref.:</Text> {loteSeleccionado.fecha_vencimiento || 'N/D'}</Text>
                            </View>

                            <TouchableOpacity style={styles.botonImprimir} onPress={imprimirEtiqueta}>
                                <Ionicons name="print" size={18} color={COLORS.blancoPuro} />
                                <Text style={styles.textoBotonImprimir}>Imprimir ticket adhesivo</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedorQR: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    contenido: { paddingBottom: 40 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 14 },
    encabezadoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    tituloSeccionQR: { fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, color: COLORS.azulMarino, marginTop: 10 },
    subtituloSeccionQR: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20, lineHeight: 19 },
    botonIcono: { width: 40, height: 40, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blancoPuro, marginTop: 8 },
    estadoCard: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: SIZES.radioTarjeta, padding: 18, alignItems: 'center', marginTop: 8 },
    estadoTitulo: { color: '#334155', fontSize: 15, fontWeight: FONTS.bold, marginTop: 10, textAlign: 'center' },
    estadoTexto: { color: '#64748b', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
    botonSecundario: { borderWidth: 1, borderColor: COLORS.azulMarino, borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14 },
    textoBotonSecundario: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 13 },
    seccionLabel: { color: '#334155', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10 },
    listaLotes: { gap: 10, marginBottom: 18 },
    loteFila: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blancoPuro },
    loteFilaActiva: { borderColor: COLORS.azulMarino, backgroundColor: '#eff6ff' },
    loteIcono: { width: 34, height: 34, borderRadius: SIZES.radioBoton, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    loteCodigo: { color: '#0f172a', fontSize: 14, fontWeight: FONTS.bold },
    loteDetalle: { color: '#64748b', fontSize: 12, marginTop: 3 },
    tarjetaEtiqueta: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 20, marginTop: 4, alignItems: 'center', elevation: 2 },
    encabezadoEtiqueta: { fontSize: SIZES.textoBase, fontWeight: FONTS.bold, color: '#334155', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    bloqueQR: { padding: 12, backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, borderWidth: 1, borderColor: '#cbd5e1' },
    codigoRespaldo: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.azulMarino, marginTop: 15, letterSpacing: 0.5 },
    tablaInfo: { width: '100%', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioBoton, padding: 12, marginTop: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    infoLinea: { fontSize: 13, color: '#475569', marginVertical: 3 },
    bold: { fontWeight: FONTS.bold, color: '#1e293b' },
    botonImprimir: { backgroundColor: COLORS.azulMarino, width: '100%', minHeight: 48, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', marginTop: 20, flexDirection: 'row', gap: 8 },
    textoBotonImprimir: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: 14 }
});
