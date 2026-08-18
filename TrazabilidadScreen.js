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
    if (fecha.includes('/')) return fecha; 
    const partes = fecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fecha;
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

    const buscarTrazabilidad = async (codigoABuscar = codigoManual) => {
        const idLimpiado = codigoABuscar.trim();
        
        if (!idLimpiado) {
            Alert.alert('Código vacío', 'Ingresa un código de trazabilidad válido.');
            return;
        }

        setLoading(true);
        setErrorData(null);
        setDatosLote(null);

        try {
            const idNumerico = parseInt(idLimpiado, 10); 
            const response = await fetch(`${API_BASE_URL}/obtenerTrazabilidad?id_lote=${idNumerico}`);
            const result = await response.json();

            if (result.success) {
                setDatosLote(result);
            } else {
                setErrorData(result.error || 'El lote no existe o no fue encontrado en el sistema.');
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
                    <Text style={styles.textoInstruccion}>Ingresa el código de rastreo (10 dígitos):</Text>
                    <View style={styles.inputGrupo}>
                        <TextInput
                            style={styles.inputManual}
                            placeholder="Ej. 0000000015"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={codigoManual}
                            onChangeText={setCodigoManual}
                            maxLength={15}
                        />
                        <TouchableOpacity style={styles.botonBuscar} onPress={() => buscarTrazabilidad()}>
                            <Ionicons name="search" size={20} color={COLORS.blancoPuro} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ESTADOS (CARGANDO / ERROR) */}
                {loading && (
                    <View style={styles.estadoCentrado}>
                        <ActivityIndicator size="large" color={COLORS.azulMarino} />
                        <Text style={styles.estadoTexto}>Verificando producto...</Text>
                    </View>
                )}

                {errorData && !loading && (
                    <View style={styles.tarjetaError}>
                        <Ionicons name="alert-circle" size={40} color={COLORS.rojoIntenso} />
                        <Text style={styles.tituloError}>Producto no encontrado</Text>
                        <Text style={styles.textoError}>{errorData}</Text>
                    </View>
                )}

                {/* TABLAS DE RESULTADOS */}
                {datosLote && !loading && (
                    <View style={styles.contenedorResultados}>
                        <View style={styles.tarjetaAprobada}>
                            <Ionicons name="checkmark-circle" size={28} color="#10b981" style={{ marginRight: 8 }} />
                            <Text style={styles.textoAprobado}>Producto Verificado</Text>
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
                                <FilaTabla label="Arete (SINIIGA)" valor={datosLote.detalles_trazabilidad?.arete_siniga} destacar />
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