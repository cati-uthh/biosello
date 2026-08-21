import React, { useContext, useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/auth';
import { crearValorQR } from '../../utils/qr';

// PALETA OFICIAL BIOSELLO (SIN AMARILLO)
const PALETA = {
    azulMarino: '#041E3A',
    azulCeruleo: '#00518B',
    rojoIntenso: '#D32F2F',
    blancoPuro: '#FFFFFF',
    grisFondo: '#F8FAFC',
    grisBorde: '#CBD5E1',
    textoOscuro: '#0F172A',
    textoGris: '#475569'
};

const formatearParaUI = (fecha) => {
    if (!fecha) return '';
    if (fecha.includes('/')) return fecha; 
    const partes = fecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fecha;
};

export default function GenerarQR({ onVolver, idNegocio, nombreNegocio }) {
    const { usuario } = useContext(AuthContext);
    const idNegocioActivo = idNegocio || usuario?.id_negocio || usuario?.negocio?.id_negocio || null;
    const [lotes, setLotes] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(true);
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);
    const [pesoPaquete, setPesoPaquete] = useState(''); 
    const [imprimiendo, setImprimiendo] = useState(false);

    // ESTADOS PARA CATÁLOGO Y SELECCIÓN INDEPENDIENTE
    const [catalogos, setCatalogos] = useState([]);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
    
    // Objeto del corte seleccionado
    const [corteSeleccionadoObj, setCorteSeleccionadoObj] = useState(null);

    // Estados independientes para activar/desactivar cada tip
    const [incluirTipCuidado, setIncluirTipCuidado] = useState(false);
    const [incluirRecomendacion, setIncluirRecomendacion] = useState(false);

    useEffect(() => {
        obtenerLotesDesdeBD();
    }, [idNegocioActivo]);

    const obtenerLotesDesdeBD = async () => {
        setCargandoLista(true);
        try {
            const params = new URLSearchParams();
            const idEmpleado = usuario?.id_usuario || usuario?.id;
            if (idNegocioActivo) params.append('id_negocio', String(idNegocioActivo));
            if (idEmpleado) params.append('id_empleado', String(idEmpleado));

            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/lotes${query ? `?${query}` : ''}`, {
                headers: getAuthHeaders(usuario)
            });
            const result = await response.json();

            if (result.success) {
                const lotesActivos = result.data.filter(lote => lote.estado === 'activo');
                setLotes(lotesActivos);
            } else {
                Alert.alert("Error", "No se pudieron obtener los lotes.");
            }
        } catch (error) {
            Alert.alert("Error de red", "No se pudo conectar con el servidor.");
        } finally {
            setCargandoLista(false);
        }
    };

    const cargarCatalogoPorEspecie = async (especie) => {
        setCargandoCatalogo(true);
        try {
            const response = await fetch(`${API_BASE_URL}/catalogo-cortes?especie=${encodeURIComponent(especie)}`, {
                headers: getAuthHeaders(usuario)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setCatalogos(result.data || []);
            } else {
                setCatalogos([]);
            }
        } catch (error) {
            setCatalogos([]);
        } finally {
            setCargandoCatalogo(false);
        }
    };

    const seleccionarLote = (lote) => {
        setLoteSeleccionado(lote);
        setCorteSeleccionadoObj(null);
        setIncluirTipCuidado(false);
        setIncluirRecomendacion(false);
        cargarCatalogoPorEspecie(lote.especie || 'BOVINO');
    };

    const seleccionarCorte = (corte) => {
        setCorteSeleccionadoObj(corte);
        // Por defecto activamos los dos tips del corte seleccionado
        setIncluirTipCuidado(Boolean(corte.tip_cuidado));
        setIncluirRecomendacion(Boolean(corte.recomendacion));
    };

    // Unimos los tips activos seleccionados para enviarlos a la BD / RA
    const obtenerTipFinalConsolidado = () => {
        if (!corteSeleccionadoObj) return null;
        const partes = [];
        if (incluirTipCuidado && corteSeleccionadoObj.tip_cuidado) {
            partes.push(`Tip: ${corteSeleccionadoObj.tip_cuidado}`);
        }
        if (incluirRecomendacion && corteSeleccionadoObj.recomendacion) {
            partes.push(`Recomendación: ${corteSeleccionadoObj.recomendacion}`);
        }
        return partes.length > 0 ? partes.join(' | ') : null;
    };

    const imprimirYDescontar = async () => {
        const kilos = Number(pesoPaquete);

        if (!pesoPaquete || isNaN(kilos) || kilos <= 0) {
            Alert.alert("Error", "Por favor ingresa un peso válido mayor a 0.");
            return;
        }

        if (kilos > loteSeleccionado.peso_actual) {
            Alert.alert("Stock Insuficiente", `Solo quedan ${loteSeleccionado.peso_actual} kg disponibles en este lote.`);
            return;
        }

        setImprimiendo(true);

        try {
            const tipFinal = obtenerTipFinalConsolidado();

            const response = await fetch(`${API_BASE_URL}/registrar-salida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify({
                    id_lote: loteSeleccionado.id_lote,
                    id_negocio: idNegocioActivo,
                    peso_salida: kilos,
                    id_corte: corteSeleccionadoObj?.id_corte || loteSeleccionado.id_corte || null,
                    tipo_corte: corteSeleccionadoObj?.nombre_corte || loteSeleccionado.tipo_corte || null,
                    tip_recomendacion: tipFinal
                })
            });

            const result = await response.json();

            if (result.success) {
                Alert.alert("¡Éxito!", `Etiqueta impresa con éxito.\nSe descontaron ${kilos} kg del inventario.`);
                setLoteSeleccionado(null);
                setPesoPaquete('');
                setCorteSeleccionadoObj(null);
                setIncluirTipCuidado(false);
                setIncluirRecomendacion(false);
                obtenerLotesDesdeBD(); 
            } else {
                Alert.alert("Error", result.error || "No se pudo registrar la salida.");
            }
        } catch (error) {
            Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
        } finally {
            setImprimiendo(false);
        }
    };

    return (
        <ScrollView style={styles.contenedorQR} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
                style={styles.botonRegresarLink}
                onPress={onVolver}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Volver al Panel Principal"
            >
                <Ionicons name="arrow-back" size={20} color={PALETA.azulCeruleo} />
                <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccionQR}>Generar Etiqueta de Salida</Text>
            <Text style={styles.subtituloSeccionQR}>
                Selecciona un lote activo, elige el corte y activa los tips a incluir en la trazabilidad{nombreNegocio ? ` · ${nombreNegocio}` : ''}.
            </Text>

            {!loteSeleccionado ? (
                <View style={styles.seccionLista}>
                    {cargandoLista ? (
                        <ActivityIndicator size="large" color={PALETA.rojoIntenso} style={{ marginTop: 30 }} />
                    ) : lotes.length === 0 ? (
                        <Text style={styles.textoVacio}>No hay lotes activos disponibles.</Text>
                    ) : (
                        lotes.map((lote) => (
                            <TouchableOpacity 
                                key={lote.id_lote} 
                                style={styles.tarjetaLoteItem}
                                onPress={() => seleccionarLote(lote)}
                            >
                                <View style={styles.iconoLoteLista}>
                                    <Ionicons name="cube" size={24} color={PALETA.blancoPuro} />
                                </View>
                                <View style={styles.infoLoteLista}>
                                    <Text style={styles.tituloLoteItem}>{lote.codigo_lote}</Text>
                                    <Text style={styles.subtituloLoteItem}>{lote.tipo_corte} ({lote.especie_nombre || lote.especie}) - Disponible: {lote.peso_actual} kg</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={PALETA.azulCeruleo} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            ) : (
                <View style={styles.contenedorEtiqueta}>
                    {(() => {
                        const idCorteActual = corteSeleccionadoObj?.id_corte || loteSeleccionado.id_corte || null;
                        const codigoBase = loteSeleccionado.codigo_lote || String(loteSeleccionado.id_lote).padStart(10, '0');
                        const codigoTrazabilidad = idCorteActual 
                            ? `${codigoBase}-C${String(idCorteActual).padStart(2, '0')}`
                            : codigoBase;

                        const valorQR = crearValorQR(
                            loteSeleccionado,
                            usuario,
                            idNegocioActivo,
                            {
                                id_corte: idCorteActual,
                                incluir_tip_cuidado: incluirTipCuidado,
                                incluir_recomendacion: incluirRecomendacion
                            }
                        );

                        return (
                            <>
                                <TouchableOpacity 
                                    style={styles.botonCambiarLote}
                                    onPress={() => setLoteSeleccionado(null)}
                                >
                                    <Ionicons name="refresh" size={16} color={PALETA.blancoPuro} />
                                    <Text style={styles.textoCambiarLote}>Seleccionar otro lote</Text>
                                </TouchableOpacity>

                                {/* PASO 1: SELECCIÓN DEL CORTE */}
                                <View style={styles.seccionCatalogo}>
                                    <Text style={styles.labelSeccion}>1. Selecciona el corte específico:</Text>
                                    {cargandoCatalogo ? (
                                        <ActivityIndicator color={PALETA.azulCeruleo} style={{ marginVertical: 15 }} />
                                    ) : catalogos.length === 0 ? (
                                        <Text style={styles.textoVacioCatalogo}>Usando corte general asignado al lote.</Text>
                                    ) : (
                                        <View style={styles.listaCortesContenedor}>
                                            {catalogos.map((item) => {
                                                const esSeleccionado = corteSeleccionadoObj?.id_corte === item.id_corte;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.id_corte}
                                                        style={[styles.itemListaCorte, esSeleccionado && styles.itemListaCorteActivo]}
                                                        onPress={() => seleccionarCorte(item)}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.textoNombreCorte, esSeleccionado && styles.textoNombreCorteActivo]}>
                                                                {item.nombre_corte}
                                                            </Text>
                                                            <Text style={[styles.textoCategoriaCorte, esSeleccionado && { color: '#E2E8F0' }]}>
                                                                {item.categoria}
                                                            </Text>
                                                        </View>
                                                        <Ionicons 
                                                            name={esSeleccionado ? "radio-button-on" : "radio-button-off"} 
                                                            size={22} 
                                                            color={esSeleccionado ? PALETA.blancoPuro : PALETA.azulCeruleo} 
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* PASO 2: SELECCIONAR / SUMAR / RESTAR TIPS O NINGUNO */}
                                    {corteSeleccionadoObj && (
                                        <View style={styles.contenedorOpcionesTips}>
                                            <Text style={styles.labelSeccion}>2. Elige los tips a incluir :</Text>

                                            {/* CHECKBOX TIP DE CUIDADO */}
                                            {Boolean(corteSeleccionadoObj.tip_cuidado) && (
                                                <TouchableOpacity 
                                                    style={[styles.checkboxTipItem, incluirTipCuidado && styles.checkboxTipItemActivo]}
                                                    onPress={() => setIncluirTipCuidado(!incluirTipCuidado)}
                                                >
                                                    <Ionicons 
                                                        name={incluirTipCuidado ? "checkbox" : "square-outline"} 
                                                        size={22} 
                                                        color={incluirTipCuidado ? PALETA.blancoPuro : PALETA.azulCeruleo} 
                                                    />
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text style={[styles.subtituloTipCheckbox, incluirTipCuidado && { color: PALETA.blancoPuro }]}>
                                                            Tip de Cuidado:
                                                        </Text>
                                                        <Text style={[styles.textoTipCheckbox, incluirTipCuidado && { color: '#E2E8F0' }]}>
                                                            {corteSeleccionadoObj.tip_cuidado}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )}

                                            {/* CHECKBOX RECOMENDACIÓN DE COCINA */}
                                            {Boolean(corteSeleccionadoObj.recomendacion) && (
                                                <TouchableOpacity 
                                                    style={[styles.checkboxTipItem, incluirRecomendacion && styles.checkboxTipItemActivo]}
                                                    onPress={() => setIncluirRecomendacion(!incluirRecomendacion)}
                                                >
                                                    <Ionicons 
                                                        name={incluirRecomendacion ? "checkbox" : "square-outline"} 
                                                        size={22} 
                                                        color={incluirRecomendacion ? PALETA.blancoPuro : PALETA.azulCeruleo} 
                                                    />
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text style={[styles.subtituloTipCheckbox, incluirRecomendacion && { color: PALETA.blancoPuro }]}>
                                                            Recomendación:
                                                        </Text>
                                                        <Text style={[styles.textoTipCheckbox, incluirRecomendacion && { color: '#E2E8F0' }]}>
                                                            {corteSeleccionadoObj.recomendacion}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )}

                                            {!incluirTipCuidado && !incluirRecomendacion && (
                                                <Text style={styles.avisoSinTip}>
                                                    * Se generará la trazabilidad sin tips adjuntos.
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* ETIQUETA HORIZONTAL */}
                                <View style={styles.tarjetaTicketHorizontal}>
                                    <View style={styles.ticketIzquierda}>
                                        <View style={styles.cabeceraTicket}>
                                            <Text style={styles.textoLogoTicket}>BIOSELLO</Text>
                                        </View>
                                        
                                        <Text style={styles.corteTicket}>
                                            {(corteSeleccionadoObj?.nombre_corte || loteSeleccionado.tipo_corte).toUpperCase()}
                                        </Text>
                                        <Text style={styles.pesoTicket}>Peso Neto: {pesoPaquete ? `${pesoPaquete} kg` : '___ kg'}</Text>
                                        
                                        <View style={styles.divisorTicket} />
                                        
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>LOTE:</Text>
                                            <Text style={styles.valorTicket}>{loteSeleccionado.codigo_lote}</Text>
                                        </View>
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>Fecha producción:</Text>
                                            <Text style={styles.valorTicket}>{formatearParaUI(loteSeleccionado.fecha_ingreso)}</Text>
                                        </View>
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>Consumo preferente:</Text>
                                            <Text style={styles.valorTicket}>{formatearParaUI(loteSeleccionado.fecha_vencimiento)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.ticketDerecha}>
                                        <View style={styles.marcoQR}>
                                            <QRCode
                                                value={valorQR}
                                                size={95} 
                                                color="#000000" 
                                                backgroundColor={PALETA.blancoPuro}
                                            />
                                        </View>
                                        <Text style={styles.valorCodigoManual}>{codigoTrazabilidad}</Text>
                                    </View>
                                </View>

                                {/* ENTRADA DE KILOS */}
                                <View style={styles.seccionDescuento}>
                                    <Text style={styles.labelDescuento}>3. ¿De cuántos kilos es este paquete?</Text>
                                    <TextInput
                                        style={styles.inputDescuento}
                                        keyboardType="decimal-pad"
                                        placeholder="Ej. 1.5"
                                        placeholderTextColor="#94A3B8"
                                        value={pesoPaquete}
                                        onChangeText={setPesoPaquete}
                                        maxLength={6}
                                    />
                                    <Text style={styles.textoStock}>
                                        Disponible en inventario: <Text style={{fontWeight: 'bold', color: PALETA.azulMarino}}>{loteSeleccionado.peso_actual} kg</Text>
                                    </Text>
                                </View>

                                {/* BOTÓN DE IMPRESIÓN (CTA ROJO INTENSO) */}
                                <TouchableOpacity
                                    style={[styles.botonImprimir, imprimiendo && { backgroundColor: '#94A3B8' }]}
                                    onPress={imprimirYDescontar}
                                    disabled={imprimiendo}
                                >
                                    {imprimiendo ? (
                                        <ActivityIndicator color={PALETA.blancoPuro} />
                                    ) : (
                                        <>
                                            <Ionicons name="print" size={20} color={PALETA.blancoPuro} style={{marginRight: 8}}/>
                                            <Text style={styles.textoBotonImprimir}>Imprimir Etiqueta</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        );
                    })()}
                </View>
            )}
            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedorQR: { flex: 1, backgroundColor: PALETA.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    botonRegresarLink: { minHeight: 44, marginVertical: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    textoRegresarLink: { color: PALETA.azulCeruleo, fontWeight: '700', fontSize: 14, marginLeft: 6 },
    tituloSeccionQR: { fontSize: 22, fontWeight: '700', color: PALETA.azulMarino }, 
    subtituloSeccionQR: { fontSize: 13, color: PALETA.textoGris, marginTop: 4, marginBottom: 15 },
    
    seccionLista: { marginTop: 10 },
    textoVacio: { textAlign: 'center', color: PALETA.textoGris, marginTop: 20, fontStyle: 'italic' },
    tarjetaLoteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETA.grisFondo, borderWidth: 1, borderColor: PALETA.grisBorde, borderRadius: 12, padding: 15, marginBottom: 12 },
    iconoLoteLista: { backgroundColor: PALETA.azulMarino, width: 42, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoLoteLista: { flex: 1 },
    tituloLoteItem: { fontSize: 15, fontWeight: '700', color: PALETA.textoOscuro },
    subtituloLoteItem: { fontSize: 13, color: PALETA.textoGris, marginTop: 2 },

    contenedorEtiqueta: { alignItems: 'center', marginTop: 5, width: '100%' },
    botonCambiarLote: { flexDirection: 'row', backgroundColor: PALETA.azulCeruleo, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: 15, alignItems: 'center' },
    textoCambiarLote: { color: PALETA.blancoPuro, fontSize: 12, fontWeight: '700', marginLeft: 5 },
    
    seccionCatalogo: { width: '100%', marginBottom: 15 },
    labelSeccion: { fontSize: 13, fontWeight: '700', color: PALETA.textoOscuro, marginBottom: 8, marginTop: 5 },
    
    listaCortesContenedor: { width: '100%', marginBottom: 10 },
    itemListaCorte: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justify: 'space-between', 
        backgroundColor: PALETA.grisFondo, 
        borderWidth: 1, 
        borderColor: PALETA.grisBorde, 
        paddingHorizontal: 14, 
        paddingVertical: 12, 
        borderRadius: 10, 
        marginBottom: 8 
    },
    itemListaCorteActivo: { 
        backgroundColor: PALETA.azulMarino, 
        borderColor: PALETA.azulMarino 
    },
    textoNombreCorte: { fontSize: 14, fontWeight: '700', color: PALETA.textoOscuro },
    textoNombreCorteActivo: { color: PALETA.blancoPuro },
    textoCategoriaCorte: { fontSize: 11, color: PALETA.textoGris, marginTop: 2 },
    textoVacioCatalogo: { fontSize: 12, color: PALETA.textoGris, fontStyle: 'italic', marginBottom: 8 },

    // CHECKBOXES INDEPENDIENTES PARA TIPS
    contenedorOpcionesTips: { marginTop: 10, width: '100%' },
    checkboxTipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETA.grisFondo,
        borderWidth: 1,
        borderColor: PALETA.grisBorde,
        padding: 12,
        borderRadius: 10,
        marginBottom: 8
    },
    checkboxTipItemActivo: {
        backgroundColor: PALETA.azulCeruleo,
        borderColor: PALETA.azulCeruleo
    },
    subtituloTipCheckbox: { fontSize: 12, fontWeight: '700', color: PALETA.azulMarino },
    textoTipCheckbox: { fontSize: 12, color: PALETA.textoGris, marginTop: 2, lineHeight: 16 },
    avisoSinTip: { fontSize: 11, color: PALETA.textoGris, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },

    tarjetaTicketHorizontal: { 
        flexDirection: 'row', 
        width: '100%', 
        backgroundColor: PALETA.blancoPuro, 
        borderWidth: 2, 
        borderColor: PALETA.azulMarino, 
        borderRadius: 10, 
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginTop: 5
    },
    ticketIzquierda: { 
        flex: 1.8, 
        padding: 12, 
        borderRightWidth: 2, 
        borderRightColor: PALETA.grisBorde, 
        borderStyle: 'dashed', 
        backgroundColor: PALETA.blancoPuro 
    },

    cabeceraTicket: { backgroundColor: PALETA.azulMarino, paddingVertical: 6, alignItems: 'center', borderRadius: 4, marginBottom: 10 },
    textoLogoTicket: { color: PALETA.blancoPuro, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    corteTicket: { fontSize: 15, fontWeight: '900', color: PALETA.azulMarino, textAlign: 'center' }, 
    pesoTicket: { fontSize: 12, color: PALETA.textoGris, textAlign: 'center', marginTop: 2, fontWeight: '600' },
    divisorTicket: { height: 1, backgroundColor: PALETA.grisBorde, marginVertical: 8 },
    filaInfoTicket: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
    labelTicket: { fontSize: 10, color: PALETA.textoGris, fontWeight: '700' },
    valorTicket: { fontSize: 11, color: PALETA.textoOscuro, fontWeight: '800' },
    
    ticketDerecha: { 
        flex: 1.2, 
        padding: 10, 
        alignItems: 'center', 
        justify: 'center', 
        backgroundColor: PALETA.grisFondo 
    },
    marcoQR: { padding: 6, backgroundColor: PALETA.blancoPuro, borderRadius: 8, borderWidth: 1, borderColor: PALETA.grisBorde, marginBottom: 6 },
    valorCodigoManual: { fontSize: 15, color: PALETA.textoOscuro, fontWeight: '900', letterSpacing: 1, marginTop: 2, textAlign: 'center' },

    seccionDescuento: { marginTop: 15, width: '100%', backgroundColor: PALETA.grisFondo, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: PALETA.grisBorde },
    labelDescuento: { color: PALETA.textoOscuro, fontSize: 13, fontWeight: '700', marginBottom: 8 },
    inputDescuento: { backgroundColor: PALETA.blancoPuro, borderWidth: 1, borderColor: PALETA.azulCeruleo, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: PALETA.textoOscuro, textAlign: 'center', fontWeight: '700' },
    textoStock: { color: PALETA.textoGris, fontSize: 12, marginTop: 8, textAlign: 'right' },
    
    botonImprimir: { flexDirection: 'row', backgroundColor: PALETA.rojoIntenso, width: '100%', paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 20, elevation: 3 },
    textoBotonImprimir: { color: PALETA.blancoPuro, fontWeight: '700', fontSize: 16 }
});
