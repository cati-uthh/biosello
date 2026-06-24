import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator // Para mostrar que está cargando mientras consulta la BD
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function GenerarQR({ onVolver }) {
    const [qrValor, setQrValor] = useState('');
    const [datosLote, setDatosLote] = useState(null);
    const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
    const [cargando, setCargando] = useState(false); // Estado para el spinner de carga

    // 🧬 FUNCIÓN ADAPTADA PARA BASE DE DATOS
    const ejecutarGeneracionLote = async () => {
        setCargando(true); // Activamos animación de carga

        try {
            /* 🌐 CONEXIÓN BASE DE DATOS (PROXIMAMENTE):
              Aquí es donde harás la petición HTTP POST a tu backend en PHP.
              Ejemplo de estructura futura:
              
              const respuesta = await fetch('https://biosello/backend.vercel.app/controlador/registrar_lote.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: 1,
                    producto: "Corte Primario - Rib Eye",
                    origen: "Rancho El Huasteco, Hgo.",
                    temperatura: "3.5°C"
                })
              });
              const datosServidor = await respuesta.json();
            */

            // 🕒 SIMULACIÓN DE RETARDO DE RED (Simula que tarda 1.5 segundos en responder el servidor)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulamos la respuesta que te daría tu base de datos MySQL (ya con un ID auto-incremental real)
            const datosDesdeBD = {
                tenant_id: 1,
                lote_id: "LOT-2026-" + Math.floor(Math.random() * 9000 + 1000), // En el futuro será: datosServidor.lote_id
                producto: "Corte Primario - Rib Eye",
                origen: "Rancho El Huasteco, Hgo.",
                fechaSacrificio: new Date().toISOString().split('T')[0], // Fecha real del sistema
                fechaEmpaque: new Date().toISOString().split('T')[0],
                temperaturaConservacion: "3.5°C",
                estado: "Fresco / Óptima Calidad"
            };

            // Estructuramos la URL dinámica que se guardará en el QR
            const urlPayload = `https://biosell.app/trazabilidad?tenant=${datosDesdeBD.tenant_id}&lote=${datosDesdeBD.lote_id}`;

            // Actualizamos los estados de React con la respuesta del servidor
            setDatosLote(datosDesdeBD);
            setQrValor(urlPayload);
            setMostrarTarjeta(true);

            Alert.alert("Éxito", `Lote guardado en Base de Datos e identificador vinculado: ${datosDesdeBD.lote_id}`);

        } catch (error) {
            Alert.alert("Error de Conexión", "No se pudo conectar con el servidor de BioSell. Intente más tarde.");
            console.error(error);
        } finally {
            setCargando(false); // Apagamos el spinner de carga
        }
    };

    return (
        <ScrollView style={styles.contenedorQR} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                <Text style={styles.textoRegresarLink}>← Volver al Panel Principal</Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccionQR}>Módulo de Trazabilidad Operativa</Text>
            <Text style={styles.subtituloSeccionQR}>Generación y vinculación de códigos de salida en mostrador [RF-02, RF-10].</Text>

            {/* Botón de acción condicional (Muestra spinner si está cargando) */}
            <TouchableOpacity
                style={[styles.botonAccionQR, cargando && styles.botonDeshabilitado]}
                onPress={ejecutarGeneracionLote}
                disabled={cargando}
            >
                {cargando ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <Text style={styles.textoBotonQR}>🧬 Registrar Lote y Crear QR</Text>
                )}
            </TouchableOpacity>

            {/* Vista previa de la etiqueta (Se alimenta directo del estado datosLote) */}
            {mostrarTarjeta && (
                <View style={styles.tarjetaEtiqueta}>
                    <Text style={styles.encabezadoEtiqueta}>Etiqueta de Salida BioSell</Text>

                    <View style={styles.bloqueQR}>
                        <QRCode
                            value={qrValor}
                            size={170}
                            color="#002855"
                            backgroundColor="#ffffff"
                        />
                    </View>

                    <Text style={styles.codigoRespaldo}>N.° LOTE REAL: {datosLote?.lote_id}</Text>

                    <View style={styles.tablaInfo}>
                        <Text style={styles.infoLinea}><Text style={styles.bold}>Producto:</Text> {datosLote?.producto}</Text>
                        <Text style={styles.infoLinea}><Text style={styles.bold}>Origen:</Text> {datosLote?.origen}</Text>
                        <Text style={styles.infoLinea}><Text style={styles.bold}>Registrado el:</Text> {datosLote?.fechaEmpaque}</Text>
                        <Text style={styles.infoLinea}><Text style={styles.bold}>Norma:</Text> NOM-004-SAGARPA Compliant</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.botonImprimir}
                        onPress={() => Alert.alert("Impresora", "Enviando formato de impresión a la tiqueteadora Bluetooth...")}
                    >
                        <Text style={styles.textoBotonImprimir}>🖨️ Imprimir Ticket Adhesivo</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedorQR: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
    tituloSeccionQR: { fontSize: 22, fontWeight: 'bold', color: '#002855', marginTop: 10 },
    subtituloSeccionQR: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
    botonAccionQR: { backgroundColor: '#cc0033', paddingVertical: 16, borderRadius: 10, alignItems: 'center', elevation: 3, height: 55, justifyContent: 'center' },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    textoBotonQR: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    tarjetaEtiqueta: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, marginTop: 25, alignItems: 'center', elevation: 2 },
    encabezadoEtiqueta: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    bloqueQR: { padding: 12, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
    codigoRespaldo: { fontSize: 15, fontWeight: 'bold', color: '#002855', marginTop: 15, letterSpacing: 0.5 },
    tablaInfo: { width: '100%', backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginTop: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    infoLinea: { fontSize: 13, color: '#475569', marginVertical: 3 },
    bold: { fontWeight: 'bold', color: '#1e293b' },
    botonImprimir: { backgroundColor: '#002855', width: '100%', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    textoBotonImprimir: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});