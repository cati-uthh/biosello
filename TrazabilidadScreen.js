import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from './src/theme/theme';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

const formatearParaUI = (fecha) => {
    if (!fecha) return 'N/D';
    const textoFecha = String(fecha).trim();
    const soloFecha = textoFecha.split('T')[0];
    if (soloFecha.includes('/')) return soloFecha;
    const partes = soloFecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return soloFecha;
};

const enmascararArete = (arete) => {
    if (!arete || arete === 'N/D') return 'N/D';
    const limpio = String(arete).trim();
    if (limpio.length <= 4) return `*******${limpio}`;
    const visibles = limpio.slice(-4);
    return `*******${visibles}`;
};

const formatearEntradaLote = (texto) => {
    if (!texto) return '';
    const textoStr = String(texto).trim().toUpperCase();
    
    // Extraer únicamente los dígitos numéricos
    const soloDigitos = textoStr.replace(/\D/g, '');
    if (!soloDigitos) return '';

    if (soloDigitos.length <= 4) {
        return `LOT-${soloDigitos}`;
    }
    if (soloDigitos.length <= 6) {
        return `LOT-${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4, 6)}`;
    }
    if (soloDigitos.length <= 9) {
        return `LOT-${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4, 6)}-${soloDigitos.slice(6, 9)}`;
    }
    // Si incluye los dígitos del corte (ej. 20260800102 -> LOT-2026-08-001-C02)
    return `LOT-${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4, 6)}-${soloDigitos.slice(6, 9)}-C${soloDigitos.slice(9, 11)}`;
};

export default function TrazabilidadScreen({ route, navigation }) {
    // Si venimos del escáner, recibimos el código por aquí
    const codigoEscaneado = route?.params?.codigoQR || '';

    const [codigoManual, setCodigoManual] = useState(codigoEscaneado);
    const [loading, setLoading] = useState(false);
    const [datosLote, setDatosLote] = useState(null);
    const [errorData, setErrorData] = useState(null);

    // Si al abrir la pantalla ya traemos un código del escáner, lo buscamos de inmediato
    useEffect(() => {
        if (codigoEscaneado) {
            buscarTrazabilidad(codigoEscaneado);
        }
    }, [codigoEscaneado]);

    const handleCambioTexto = (valor) => {
        if (!valor || valor === 'LOT' || valor === 'LOT-') {
            setCodigoManual('');
            return;
        }
        setCodigoManual(formatearEntradaLote(valor));
    };

    const buscarTrazabilidad = async (codigoABuscar = codigoManual) => {
        let idLimpiado = codigoABuscar.trim();
        let idCorteExtraido = '';

        // Si el código incluye el sufijo del corte (ej. LOT-2026-08-001-C02)
        const matchCorte = idLimpiado.match(/^(.+)[-_]C(\d+)$/i);
        if (matchCorte) {
            idLimpiado = matchCorte[1].trim();
            idCorteExtraido = String(Number(matchCorte[2]));
        }
        
        if (!idLimpiado) {
            Alert.alert('Código vacío', 'Ingresa un código de trazabilidad o número de lote válido.');
            return;
        }

        setLoading(true);
        setErrorData(null);
        setDatosLote(null);

        try {
            let result = null;

            const candidatos = [];
            candidatos.push(idLimpiado);

            const soloDigitos = idLimpiado.replace(/\D/g, '');
            if (soloDigitos.length === 9) {
                candidatos.push(`LOT-${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4, 6)}-${soloDigitos.slice(6, 9)}`);
            } else if (soloDigitos.length === 11) {
                candidatos.push(`LOT-${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4, 6)}-${soloDigitos.slice(6, 9)}`);
            }
            if (idLimpiado.startsWith('LOT-')) {
                candidatos.push(idLimpiado.replace('LOT-', 'LOTE-'));
            } else if (idLimpiado.startsWith('LOTE-')) {
                candidatos.push(idLimpiado.replace('LOTE-', 'LOT-'));
            } else if (soloDigitos.length > 0 && !idLimpiado.startsWith('LOT')) {
                candidatos.push(`LOT-${idLimpiado}`);
            }

            const vistos = new Set();
            for (const cand of candidatos) {
                const term = String(cand).trim();
                if (!term || vistos.has(term.toUpperCase())) continue;
                vistos.add(term.toUpperCase());

                try {
                    // Consulta pública directa
                    const params = new URLSearchParams();
                    params.append('id_lote', term);
                    if (idCorteExtraido) {
                        params.append('id_corte', idCorteExtraido);
                        params.append('incluir_tip_cuidado', 'true');
                        params.append('incluir_recomendacion', 'true');
                    }
                    const response = await fetch(`${API_BASE_URL}/obtenerTrazabilidad?${params.toString()}`);
                    const json = await response.json();
                    if (response.ok && json && json.success) {
                        result = json;
                        break;
                    }
                } catch (e) {
                    // Continuar al siguiente candidato
                }
            }

            if (result && result.success) {
                setDatosLote(result);
            } else {
                setErrorData('El lote no existe o no fue encontrado en el sistema.');
            }
        } catch (error) {
            setErrorData('No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const FilaTabla = ({ label, valor, destacar = false }) => (
        <View style={styles.filaTabla}>
            <Text style={styles.labelTabla}>{label}</Text>
            <Text style={[styles.valorTabla, destacar && styles.valorDestacado]}>{valor || 'N/D'}</Text>
        </View>
    );

    const recomendacionCorte = datosLote?.tip_recomendacion
        || datosLote?.recomendacion
        || datosLote?.detalles_trazabilidad?.tip_recomendacion
        || datosLote?.detalles_trazabilidad?.recomendacion
        || null;
    const tipCuidadoCorte = datosLote?.tip_cuidado
        || datosLote?.detalles_trazabilidad?.tip_cuidado
        || null;

    const tipsCuidadoArray = [];
    if (recomendacionCorte && String(recomendacionCorte).includes('|')) {
        const fragmentos = String(recomendacionCorte).split('|').map((f) => f.trim()).filter(Boolean);
        for (const frag of fragmentos) {
            tipsCuidadoArray.push(frag.replace(/^(Tip:\s*|Recomendación:\s*)/i, ''));
        }
    } else {
        if (tipCuidadoCorte) tipsCuidadoArray.push(String(tipCuidadoCorte).replace(/^Tip:\s*/i, ''));
        if (recomendacionCorte) tipsCuidadoArray.push(String(recomendacionCorte).replace(/^Recomendación:\s*/i, ''));
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.blancoPuro }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                
                <View style={styles.header}>
                    <TouchableOpacity style={styles.botonRegresar} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.azulMarino} />
                    </TouchableOpacity>
                    <Text style={styles.titulo}>Trazabilidad BioSello</Text>
                </View>

                {/* BÚSQUEDA MANUAL */}
                <View style={styles.tarjetaBusqueda}>
                    <Text style={styles.textoInstruccion}>Ingresa el código de lote o rastreo:</Text>
                    <View style={styles.inputGrupo}>
                        <TextInput
                            style={styles.inputManual}
                            placeholder="Ej. 202608001 o 20260800102"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            autoCapitalize="characters"
                            value={codigoManual}
                            onChangeText={handleCambioTexto}
                            maxLength={22}
                        />
                        <TouchableOpacity style={styles.botonBuscar} onPress={() => buscarTrazabilidad()}>
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.textoBoton}>Buscar</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ESTADO: ERROR O NO ENCONTRADO */}
                {errorData && (
                    <View style={styles.tarjetaError}>
                        <Ionicons name="alert-circle" size={32} color="#dc2626" />
                        <Text style={styles.textoError}>{errorData}</Text>
                    </View>
                )}

                {/* RESULTADOS DE TRAZABILIDAD */}
                {datosLote && (
                    <View style={styles.contenedorResultados}>
                        <View style={styles.tarjetaAprobada}>
                            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
                            <Text style={styles.textoAprobado}>Autenticidad y Sanidad Certificada</Text>
                        </View>

                        <View style={styles.tarjetaDatos}>
                            <View style={styles.encabezadoTarjeta}>
                                <Ionicons name="cube" size={18} color={COLORS.azulMarino} />
                                <Text style={styles.tituloTarjetaDatos}>Datos del Producto</Text>
                            </View>
                            <View style={styles.cuerpoTarjeta}>
                                <FilaTabla label="Código Rastreo" valor={codigoManual} destacar />
                                <FilaTabla label="Lote Interno" valor={datosLote.lote_id} />
                                <FilaTabla label="Producto Comercial" valor={datosLote.producto} />
                                <FilaTabla label="Establecimiento" valor={datosLote.detalles_trazabilidad?.establecimiento} />
                                <FilaTabla label="Fecha de Producción" valor={formatearParaUI(datosLote.fecha_empaque)} />
                            </View>
                        </View>

                        {tipsCuidadoArray.length > 0 && (
                            <View style={styles.tarjetaDatos}>
                                <View style={styles.encabezadoTarjeta}>
                                    <Ionicons name="restaurant" size={18} color="#b45309" />
                                    <Text style={styles.tituloTarjetaDatos}>Recomendaciones del corte</Text>
                                </View>
                                <View style={styles.cuerpoTarjeta}>
                                    {tipsCuidadoArray.map((tip, idx) => (
                                        <Text key={idx} style={{ fontSize: 13.5, color: '#1e293b', fontStyle: 'italic', paddingVertical: 4 }}>
                                            • "{tip}"
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.tarjetaDatos}>
                            <View style={styles.encabezadoTarjeta}>
                                <Ionicons name="leaf" size={18} color="#16a34a" />
                                <Text style={styles.tituloTarjetaDatos}>Origen y Productor</Text>
                            </View>
                            <View style={styles.cuerpoTarjeta}>
                                <FilaTabla label="Productor" valor={datosLote.detalles_trazabilidad?.productor} />
                                <FilaTabla label="UPP Origen" valor={datosLote.detalles_trazabilidad?.upp_rancho} />
                                <FilaTabla label="Procedencia" valor={datosLote.detalles_trazabilidad?.procedencia} />
                            </View>
                        </View>

                        <View style={styles.tarjetaDatos}>
                            <View style={styles.encabezadoTarjeta}>
                                <Ionicons name="paw" size={18} color="#ca8a04" />
                                <Text style={styles.tituloTarjetaDatos}>Trazabilidad de Res/Cerdo</Text>
                            </View>
                            <View style={styles.cuerpoTarjeta}>
                                <FilaTabla label="Especie" valor={datosLote.detalles_trazabilidad?.especie} />
                                <FilaTabla label="Arete (SINIIGA)" valor={enmascararArete(datosLote.detalles_trazabilidad?.arete_siniga)} destacar />
                                <FilaTabla label="Guía Tránsito" valor={datosLote.detalles_trazabilidad?.guia_reemo} />
                                <FilaTabla label="Rastro Sacrificio" valor={datosLote.detalles_trazabilidad?.sacrificio_rastro} />
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 40 },
    
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    botonRegresar: { marginRight: 15, padding: 5 },
    titulo: { fontSize: 22, fontWeight: '900', color: COLORS.azulMarino },

    tarjetaBusqueda: { backgroundColor: COLORS.blancoPuro, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, marginBottom: 20 },
    textoInstruccion: { color: '#475569', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    
    inputGrupo: { flexDirection: 'row', alignItems: 'center' },
    inputManual: { flex: 1, height: 50, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, paddingHorizontal: 15, fontSize: 16, color: '#0f172a', fontWeight: 'bold', letterSpacing: 1 },
    botonBuscar: { backgroundColor: COLORS.azulMarino, height: 50, paddingHorizontal: 20, borderTopRightRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', justifyContent: 'center' },

    estadoCentrado: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    estadoTexto: { marginTop: 15, color: COLORS.azulMarino, fontSize: 15, fontWeight: '600' },
    
    tarjetaError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 10 },
    tituloError: { fontSize: 18, fontWeight: 'bold', color: '#991b1b', marginTop: 10 },
    textoError: { fontSize: 14, color: '#b91c1c', textAlign: 'center', marginTop: 5, lineHeight: 20 },

    contenedorResultados: { marginTop: 5 },
    tarjetaAprobada: { flexDirection: 'row', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#6ee7b7', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    textoAprobado: { fontSize: 16, fontWeight: '800', color: '#047857' },

    tarjetaDatos: { backgroundColor: COLORS.blancoPuro, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15, elevation: 1 },
    encabezadoTarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    tituloTarjetaDatos: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginLeft: 8 },
    cuerpoTarjeta: { padding: 15 },
    
    filaTabla: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    labelTabla: { fontSize: 13, color: '#64748b', flex: 1, paddingRight: 10 },
    valorTabla: { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 1.2, textAlign: 'right' },
    valorDestacado: { color: COLORS.azulMarino, fontWeight: '900', fontSize: 14 }
});