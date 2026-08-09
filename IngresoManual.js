import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
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

export default function IngresoManual({ route, navigation }) {
    // Si la pantalla fue abierta por el Escáner, recibe el código aquí
    const codigoEscaneado = route?.params?.codigoQR || '';

    const [codigo, setCodigo] = useState(codigoEscaneado);
    const [loading, setLoading] = useState(false);
    const [datosLote, setDatosLote] = useState(null);
    const [errorData, setErrorData] = useState(null);

    // Si viene del escáner con datos, busca automáticamente
    useEffect(() => {
        if (codigoEscaneado) {
            handleBuscar(codigoEscaneado);
        }
    }, [codigoEscaneado]);

    const handleBuscar = async (codigoABuscar = codigo) => {
        const idLimpiado = codigoABuscar.trim();
        
        if (idLimpiado === '') {
            alert('Por favor, ingrese un número válido.');
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

    // Componente reutilizable para la tabla
    const FilaTabla = ({ label, valor, destacar = false }) => (
        <View style={styles.filaTabla}>
            <Text style={styles.labelTabla}>{label}</Text>
            <Text style={[styles.valorTabla, destacar && styles.valorDestacado]}>{valor || 'N/D'}</Text>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            
            {/* 1. VISTA DE CARGA */}
            {loading && (
                <View style={styles.estadoCentrado}>
                    <ActivityIndicator size="large" color={COLORS.rojoIntenso} />
                    <Text style={styles.estadoTexto}>Consultando bases de datos...</Text>
                </View>
            )}

            {/* 2. VISTA DE ERROR */}
            {errorData && !loading && (
                <View style={styles.estadoCentrado}>
                    <Ionicons name="alert-circle" size={60} color={COLORS.rojoIntenso} />
                    <Text style={styles.tituloError}>Lote no encontrado</Text>
                    <Text style={styles.textoError}>{errorData}</Text>
                    <TouchableOpacity style={[styles.primaryButton, {marginTop: 20}]} onPress={() => setErrorData(null)}>
                        <Text style={styles.buttonText}>Intentar de nuevo</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 3. VISTA ORIGINAL (Tu diseño de Búsqueda Manual) */}
            {!datosLote && !loading && !errorData && (
                <View style={styles.containerOriginal}>
                    <Text style={styles.title}>
                        Coloque el número de código QR{'\n'}en el cuadro para escanear
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ingrese aquí el número"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={codigo}
                        onChangeText={setCodigo}
                    />

                    <TouchableOpacity style={styles.primaryButton} onPress={() => handleBuscar()}>
                        <Text style={styles.buttonText}>Buscar</Text>
                    </TouchableOpacity>

                    <Image
                        source={require('./assets/ayuda-qr.png')} 
                        style={styles.helpImage}
                        resizeMode="contain"
                    />

                    <Text style={styles.helpText}>
                        El numero se encuentra en la parte inferior{'\n'}del código QR
                    </Text>
                </View>
            )}

            {/* 4. VISTA DE RESULTADOS (Ficha Técnica de Trazabilidad) */}
            {datosLote && !loading && (
                <View style={styles.contenedorResultados}>
                    <View style={styles.tarjetaAprobada}>
                        <Ionicons name="checkmark-circle" size={28} color="#10b981" style={{ marginRight: 8 }} />
                        <Text style={styles.textoAprobado}>Producto Verificado</Text>
                    </View>

                    {/* SECCIÓN 1: PRODUCTO */}
                    <View style={styles.tarjetaDatos}>
                        <View style={styles.encabezadoTarjeta}>
                            <Ionicons name="cube" size={18} color={COLORS.azulMarino} />
                            <Text style={styles.tituloTarjetaDatos}>Datos del Producto</Text>
                        </View>
                        <View style={styles.cuerpoTarjeta}>
                            <FilaTabla label="Código Rastreo" valor={codigo} destacar />
                            <FilaTabla label="Lote Interno" valor={datosLote.lote_id} />
                            <FilaTabla label="Producto Comercial" valor={datosLote.producto} />
                            <FilaTabla label="Establecimiento" valor={datosLote.detalles_trazabilidad?.establecimiento} />
                            <FilaTabla label="Fecha de Producción" valor={formatearParaUI(datosLote.fecha_empaque)} />
                        </View>
                    </View>

                    {/* SECCIÓN 2: ORIGEN Y PRODUCTOR */}
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

                    {/* SECCIÓN 3: ANIMAL Y LOGÍSTICA */}
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

                    {/* BOTÓN PARA LIMPIAR Y VOLVER A BUSCAR */}
                    <TouchableOpacity style={[styles.primaryButton, {marginTop: 15}]} onPress={() => { setDatosLote(null); setCodigo(''); }}>
                        <Text style={styles.buttonText}>Realizar otra búsqueda</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: COLORS.blancoPuro, paddingBottom: 40 },
    
    // Estilos Originales de Ingreso Manual
    containerOriginal: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
    title: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#000', textAlign: 'center', marginBottom: 20 },
    input: { width: '100%', height: 50, borderColor: '#999', borderWidth: 1, borderRadius: SIZES.radioInput, paddingHorizontal: 15, fontSize: SIZES.textoBase, marginBottom: 20, color: '#000', backgroundColor: COLORS.blancoPuro },
    primaryButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 14, borderRadius: SIZES.radioBoton, width: '100%', alignItems: 'center', marginBottom: 20 },
    buttonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
    helpImage: { width: 250, height: 200, marginBottom: 15 },
    helpText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '600', lineHeight: 20 },

    // Estilos de Estados
    estadoCentrado: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 30 },
    estadoTexto: { marginTop: 15, color: COLORS.azulMarino, fontSize: 16, fontWeight: '600' },
    tituloError: { fontSize: 22, fontWeight: 'bold', color: '#991b1b', marginTop: 15 },
    textoError: { fontSize: 15, color: '#b91c1c', textAlign: 'center', marginTop: 8, lineHeight: 22 },

    // Estilos de la Ficha Técnica (Resultados)
    contenedorResultados: { paddingTop: 20, paddingHorizontal: 16 },
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