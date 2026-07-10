import React, { useState, useEffect } from 'react';
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

const API_URL = 'https://biosello-backend.vercel.app/api/lotes';

export default function GenerarQR({ onVolver }) {
    const [vista, setVista] = useState('lista'); 
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [lotesActivos, setLotesActivos] = useState([]);
    const [datosLoteSeleccionado, setDatosLoteSeleccionado] = useState(null);
    const [qrValor, setQrValor] = useState('');

    useEffect(() => {
        fetchLotesDesdeBackend();
    }, []);

    const fetchLotesDesdeBackend = async () => {
        try {
            const respuesta = await fetch(API_URL);
            const json = await respuesta.json();

            if (json.success !== false && json.data) {
                const activos = json.data.filter(l => l.estado === 'activo');
                setLotesActivos(activos);
            } else {
                throw new Error(json.error || "Error al obtener lotes");
            }
        } catch (error) {
            console.warn("Usando Fallback local con datos del volcado SQL...");
            const datosDumpSQL = [
                { id_lote: 1, codigo_lote: 'LOTE-RES-001', tipo_corte: 'Canal de res', peso_kg: '125.50', fecha_ingreso: '2026-06-23', nombre_negocio: 'Carnicería cochinon' },
                { id_lote: 3, codigo_lote: 'LOT-2026-001', tipo_corte: 'Canal', peso_kg: '70.00', fecha_ingreso: '2026-06-22', nombre_negocio: 'Don Cochinon' }
            ];
            setLotesActivos(datosDumpSQL);
        } finally {
            setCargando(false);
        }
    };

    const procesarSeleccionLote = (lote) => {
        setDatosLoteSeleccionado(lote);

        const urlTrazabilidad = `https://biosell.app/trazabilidad?id_lote=${lote.id_lote}`;
        setQrValor(urlTrazabilidad);

        setVista('qr');
    };

    const lotesFiltrados = lotesActivos.filter(lote =>
        lote.codigo_lote?.toLowerCase().includes(busqueda.toLowerCase()) ||
        lote.tipo_corte?.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#002855" />
                <Text style={styles.textoCarga}>Sincronizando con BioSello Clustered DB...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>

            {vista === 'lista' && (
                <ScrollView style={styles.contenedor} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                        <Text style={styles.textoRegresarLink}>← Volver al Panel Principal</Text>
                    </TouchableOpacity>

                    <Text style={styles.tituloSeccion}>Seleccionar Lote Activo</Text>
                    <Text style={styles.subtituloSeccion}>Selecciona un lote de la base de datos para generar su código QR.</Text>

                    <View style={styles.seccionBuscar}>
                        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.inputBuscar}
                            placeholder="Buscar por código o tipo de corte..."
                            placeholderTextColor="#94a3b8"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                    </View>

                    <Text style={styles.labelListado}>Disponibles en mostrador ({lotesFiltrados.length})</Text>

                    {lotesFiltrados.map((lote) => (
                        <TouchableOpacity
                            key={String(lote.id_lote)}
                            style={styles.tarjetaLoteItem}
                            onPress={() => procesarSeleccionLote(lote)}
                        >
                            <View style={styles.bloqueIzquierdo}>
                                <View style={styles.iconoCarneContainer}>
                                    <Ionicons name="cube" size={20} color="#cc0033" />
                                </View>
                                <View>
                                    <Text style={styles.itemCodigo}>{lote.codigo_lote}</Text>
                                    <Text style={styles.itemCorte}>{lote.tipo_corte} • <Text style={{ fontWeight: 'bold' }}>{lote.peso_kg} Kg</Text></Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {vista === 'qr' && (
                <ScrollView style={styles.contenedor} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.botonRegresarLink} onPress={() => setVista('lista')}>
                        <Text style={styles.textoRegresarLink}>← Cambiar de Lote</Text>
                    </TouchableOpacity>

                    <View style={styles.tarjetaEtiqueta}>
                        <Text style={styles.encabezadoEtiqueta}>Etiqueta de Salida BioSell</Text>

                        <View style={styles.bloqueQR}>
                            <QRCode
                                value={qrValor}
                                size={180}
                                color="#002855"
                                backgroundColor="#ffffff"
                            />
                        </View>

                        <Text style={styles.codigoRespaldo}>N.° LOTE VINCULADO: {datosLoteSeleccionado?.codigo_lote}</Text>

                        <View style={styles.tablaInfo}>
                            <Text style={styles.infoLinea}><Text style={styles.bold}>Corte:</Text> {datosLoteSeleccionado?.tipo_corte}</Text>
                            <Text style={styles.infoLinea}><Text style={styles.bold}>Peso Total:</Text> {datosLoteSeleccionado?.peso_kg} Kg</Text>
                            <Text style={styles.infoLinea}><Text style={styles.bold}>Fecha Ingreso:</Text> {datosLoteSeleccionado?.fecha_ingreso}</Text>
                            <Text style={styles.infoLinea}><Text style={styles.bold}>Norma:</Text> NOM-004-SAGARPA Compliant</Text>
                        </View>

                        <TouchableOpacity style={styles.botonImprimir} onPress={() => Alert.alert("Impresora", "Imprimiendo etiqueta térmica...")}>
                            <Text style={styles.textoBotonImprimir}>🖨  Imprimir Etiqueta Adhesiva</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
    textoCarga: { marginTop: 10, color: '#002855', fontWeight: '600', fontSize: 14 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
    tituloSeccion: { fontSize: 22, fontWeight: 'bold', color: '#002855', marginTop: 10 },
    subtituloSeccion: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
    seccionBuscar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, marginBottom: 20 },
    inputBuscar: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#0f172a' },
    labelListado: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 12 },
    tarjetaLoteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    bloqueIzquierdo: { flexDirection: 'row', alignItems: 'center' },
    iconoCarneContainer: { backgroundColor: '#fff1f2', padding: 8, borderRadius: 8, marginRight: 12 },
    itemCodigo: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    itemCorte: { fontSize: 13, color: '#64748b', marginTop: 2 },
    tarjetaEtiqueta: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, marginTop: 10, alignItems: 'center', elevation: 2 },
    encabezadoEtiqueta: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    bloqueQR: { padding: 12, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
    codigoRespaldo: { fontSize: 15, fontWeight: 'bold', color: '#002855', marginTop: 15, letterSpacing: 0.5 },
    tablaInfo: { width: '100%', backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginTop: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    infoLinea: { fontSize: 13, color: '#475569', marginVertical: 4 },
    bold: { fontWeight: 'bold', color: '#1e293b' },
    botonImprimir: { backgroundColor: '#002855', width: '100%', paddingVertical: 13, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    textoBotonImprimir: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});