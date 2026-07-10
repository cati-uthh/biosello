import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from './src/theme/theme';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

/**
 * Diccionario estático de tips por tipo de corte.
 * En futuras versiones, esto debería migrar a una tabla 'catalogo_cortes' en la BD.
 */
const TIPS_POR_CORTE = {
    'rib eye': 'Sella a fuego alto por 2 min de cada lado y deja reposar antes de cortar.',
    'sirloin': ' Ideal para asar al carbón. Marina con sal en grano y pimienta negra.',
    't-bone': ' Asa a fuego medio para que ambos lados (lomo y filete) queden perfectos.',
    'arrachera': 'Fuego alto y vuelta rápida. Córtala en contra de las fibras para mayor suavidad.',
    'picaña': ' Asa con la capa de grasa hacia arriba primero para mantener la jugosidad.',
    'default': ' Mantener en refrigeración a 4°C. Consumir antes de la fecha indicada.'
};

/**
 * Función auxiliar para buscar el tip adecuado ignorando mayúsculas.
 */
const obtenerTipPorCorte = (tipoCorte) => {
    if (!tipoCorte) return TIPS_POR_CORTE['default'];
    const corteNormalizado = String(tipoCorte).toLowerCase();
    
    // Busca si alguna clave del diccionario está incluida en el nombre del corte
    const claveEncontrada = Object.keys(TIPS_POR_CORTE).find(clave => corteNormalizado.includes(clave));
    
    return claveEncontrada ? TIPS_POR_CORTE[claveEncontrada] : TIPS_POR_CORTE['default'];
};

export default function GenerarQR({ onVolver }) {
    const [lotes, setLotes] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(true);
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);

    // Cargar la lista de lotes al montar el componente
    useEffect(() => {
        obtenerLotesDesdeBD();
    }, []);

    /**
     * Consume el endpoint GET /api/lotes para traer el inventario actual.
     */
    const obtenerLotesDesdeBD = async () => {
        setCargandoLista(true);
        try {
            const response = await fetch(`${API_BASE_URL}/lotes`);
            const result = await response.json();

            if (result.success) {
                // Filtramos solo los lotes activos para imprimir etiquetas
                const lotesActivos = result.data.filter(lote => lote.estado === 'activo');
                setLotes(lotesActivos);
            } else {
                Alert.alert("Error", "No se pudieron obtener los lotes.");
            }
        } catch (error) {
            Alert.alert("Error de red", "No se pudo conectar con el servidor.");
            console.error(error);
        } finally {
            setCargandoLista(false);
        }
    };

    const seleccionarLote = (lote) => {
        setLoteSeleccionado(lote);
    };

    return (
        <ScrollView style={styles.contenedorQR} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                <Text style={styles.textoRegresarLink}>← Volver al Panel Principal</Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccionQR}>Generar Etiqueta de Salida</Text>
            <Text style={styles.subtituloSeccionQR}>Selecciona un lote activo para generar su código de barras térmico.</Text>

            {/* ZONA DE SELECCIÓN DE LOTE */}
            {!loteSeleccionado ? (
                <View style={styles.seccionLista}>
                    {cargandoLista ? (
                        <ActivityIndicator size="large" color={COLORS.rojoIntenso} style={{ marginTop: 30 }} />
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
                                    <Ionicons name="cube" size={24} color={COLORS.blancoPuro} />
                                </View>
                                <View style={styles.infoLoteLista}>
                                    <Text style={styles.tituloLoteItem}>{lote.codigo_lote}</Text>
                                    <Text style={styles.subtituloLoteItem}>{lote.tipo_corte} - {lote.peso_kg} kg</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            ) : (
                /* ZONA DE VISTA PREVIA DE LA ETIQUETA (ESTILO TICKET) */
                <View style={styles.contenedorEtiqueta}>
                    {(() => {
                        const codigoTrazabilidad = String(loteSeleccionado.id_lote).padStart(10, '0');
                        const urlQR = `https://biosell.app/trazabilidad?id_lote=${codigoTrazabilidad}`;

                        return (
                            <>
                                <TouchableOpacity 
                                    style={styles.botonCambiarLote}
                                    onPress={() => setLoteSeleccionado(null)}
                                >
                                    <Ionicons name="refresh" size={16} color={COLORS.blancoPuro} />
                                    <Text style={styles.textoCambiarLote}>Seleccionar otro lote</Text>
                                </TouchableOpacity>

                                {/* ETIQUETA HORIZONTAL */}
                                <View style={styles.tarjetaTicketHorizontal}>
                                    
                                    {/* COLUMNA IZQUIERDA: Información del Lote */}
                                    <View style={styles.ticketIzquierda}>
                                        <View style={styles.cabeceraTicket}>
                                            <Text style={styles.textoLogoTicket}>BIOSELLO</Text>
                                        </View>
                                        
                                        <Text style={styles.corteTicket}>{loteSeleccionado.tipo_corte.toUpperCase()}</Text>
                                        <Text style={styles.pesoTicket}>Peso Neto: {loteSeleccionado.peso_kg} kg</Text>
                                        
                                        <View style={styles.divisorTicket} />
                                        
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>LOTE INT:</Text>
                                            <Text style={styles.valorTicket}>{loteSeleccionado.codigo_lote}</Text>
                                        </View>
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>PROD:</Text>
                                            <Text style={styles.valorTicket}>{loteSeleccionado.fecha_ingreso}</Text>
                                        </View>
                                        <View style={styles.filaInfoTicket}>
                                            <Text style={styles.labelTicket}>VENC:</Text>
                                            <Text style={styles.valorTicket}>{loteSeleccionado.fecha_vencimiento}</Text>
                                        </View>
                                        <Text style={styles.tituloTip}>
                                                {'Tips del productor:'}
                                            </Text>
                                        {/* Tip Dinámico */}
                                        <View style={styles.cajaTip}>
                                            <Text style={styles.textoTip}>
                                                {loteSeleccionado.tip_recomendacion || ' Mantener en refrigeración a 4°C.'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* COLUMNA DERECHA: QR y Código Manual */}
                                    <View style={styles.ticketDerecha}>
                                        <View style={styles.marcoQR}>
                                            <QRCode
                                                value={urlQR}
                                                size={110} // Tamaño ajustado para formato horizontal
                                                color="#000000" 
                                                backgroundColor={COLORS.blancoPuro}
                                            />
                                        </View>
                                        {/* Código manual justo debajo del QR */}
                                        <Text style={styles.valorCodigoManual}>{codigoTrazabilidad}</Text>
                                    </View>

                                </View>

                                <TouchableOpacity
                                    style={styles.botonImprimir}
                                    onPress={() => Alert.alert("Impresora", "Conectando con tiqueteadora Bluetooth...")}
                                >
                                    <Ionicons name="print" size={18} color={COLORS.blancoPuro} style={{marginRight: 8}}/>
                                    <Text style={styles.textoBotonImprimir}>Imprimir Etiqueta</Text>
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
    contenedorQR: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 14 },
    tituloSeccionQR: { fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, color: '#f97316' }, // Anaranjado
    subtituloSeccionQR: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
    
    // Estilos de la lista de selección
    seccionLista: { marginTop: 10 },
    textoVacio: { textAlign: 'center', color: '#64748b', marginTop: 20, fontStyle: 'italic' },
    tarjetaLoteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, marginBottom: 12 },
    iconoLoteLista: { backgroundColor: '#f97316', width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, // Anaranjado
    infoLoteLista: { flex: 1 },
    tituloLoteItem: { fontSize: 15, fontWeight: FONTS.bold, color: '#0f172a' },
    subtituloLoteItem: { fontSize: 13, color: '#475569', marginTop: 2 },

    // Estilos del Ticket/Etiqueta
    contenedorEtiqueta: { alignItems: 'center', marginTop: 10, width: '100%' },
    botonCambiarLote: { flexDirection: 'row', backgroundColor: '#64748b', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
    textoCambiarLote: { color: COLORS.blancoPuro, fontSize: 12, fontWeight: FONTS.bold, marginLeft: 5 },
    
    tarjetaTicketHorizontal: { 
        flexDirection: 'row', // MAGIA: Esto pone las cosas lado a lado
        width: '100%', 
        backgroundColor: COLORS.blancoPuro, 
        borderWidth: 2, 
        borderColor: COLORS.rojoIntenso, 
        borderRadius: 8, 
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    // Columna Izquierda (Info)
    ticketIzquierda: { 
        flex: 1.8, // Toma el 65% del ancho aprox
        padding: 12, 
        borderRightWidth: 2, 
        borderRightColor: '#e2e8f0', 
        borderStyle: 'dashed', // Línea punteada simulando el desprendible
        backgroundColor: COLORS.blancoPuro 
    },

    cabeceraTicket: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 6, alignItems: 'center', borderRadius: 4, marginBottom: 10 },
    textoLogoTicket: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    
    corteTicket: { fontSize: 18, fontWeight: '900', color: '#f97316', textAlign: 'center' }, 
    pesoTicket: { fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 2, fontWeight: '600' },
    
    divisorTicket: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
    
    filaInfoTicket: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
    labelTicket: { fontSize: 10, color: '#64748b', fontWeight: FONTS.bold },
    valorTicket: { fontSize: 11, color: '#0f172a', fontWeight: '800' },

    cajaTip: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', padding: 8, borderRadius: 4, marginTop: 8 },
    textoTip: { fontSize: 10, color: '#9a3412', fontStyle: 'italic', lineHeight: 14, textAlign: 'center' },
    tituloTip: { fontSize: 12, fontWeight: FONTS.bold, color: '#ea580c', marginBottom: 4 },
    
    pieTicket: { backgroundColor: '#f8fafc', paddingVertical: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    textoInstruccionQR: { fontSize: 11, color: '#64748b', marginTop: 12, fontWeight: '600' },
    marcoQR: { padding: 8, backgroundColor: COLORS.blancoPuro, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 10 },
    
    valorCodigoManual: { fontSize: 18, color: COLORS.textoOscuro, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

    botonImprimir: { flexDirection: 'row', backgroundColor: '#f97316', width: '100%', paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 25, elevation: 2 },
    textoBotonImprimir: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: 16 }
});
