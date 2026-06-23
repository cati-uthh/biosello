import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConfiguracionScreen({ onVolver }) {
    const [nombreNegocio, setNombreNegocio] = useState('Comercializadora LL');
    const [prefijoLote, setPrefijoLote] = useState('LOT');

    const [categoria, setCategoria] = useState('');
    const [temperatura, setTemperatura] = useState('');
    const [vidaUtil, setVidaUtil] = useState('');

    const [plantillas, setPlantillas] = useState([
        { id: '1', categoria: 'Cortes Primarios', temperatura: '3.5', vidaUtil: '7' },
        { id: '2', categoria: 'Carne Molida', temperatura: '2.0', vidaUtil: '3' },
        { id: '3', categoria: 'Embutidos', temperatura: '4.0', vidaUtil: '15' }
    ]);

    const guardarParametrosGenerales = () => {
        Alert.alert("Éxito", "Parámetros generales actualizados correctamente.");
    };

    const agregarPlantilla = () => {
        if (!categoria || !temperatura || !vidaUtil) {
            Alert.alert("Error", "Por favor completa todos los campos de la plantilla.");
            return;
        }

        const nuevaPlantilla = {
            id: Math.random().toString(),
            categoria: categoria,
            temperatura: temperatura,
            vidaUtil: vidaUtil
        };

        setPlantillas([...plantillas, nuevaPlantilla]);
        setCategoria('');
        setTemperatura('');
        setVidaUtil('');
        Alert.alert("Éxito", `Plantilla para "${categoria}" creada correctamente.`);
    };

    return (
        <ScrollView style={styles.contenedor} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                <Text style={styles.textoRegresarLink}>← Volver al Panel Principal</Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccion}>Configuración del Sistema</Text>
            <Text style={styles.subtituloSeccion}>Administra las reglas operativas y plantillas de conservación de tu negocio.</Text>

            <View style={styles.tarjetaConfig}>
                <Text style={styles.tituloTarjeta}><Ionicons name="business" size={18} /> Datos del Establecimiento</Text>
                
                <Text style={styles.labelInput}>Nombre del Negocio:</Text>
                <TextInput
                    style={styles.input}
                    value={nombreNegocio}
                    onChangeText={setNombreNegocio}
                    placeholder="Ej. Carnicería Central"
                />

                <Text style={styles.labelInput}>Prefijo para Códigos de Lote:</Text>
                <TextInput
                    style={styles.input}
                    value={prefijoLote}
                    onChangeText={setPrefijoLote}
                    autoCapitalize="characters"
                    placeholder="Ej. LOT"
                />

                <TouchableOpacity style={styles.botonGuardar} onPress={guardarParametrosGenerales}>
                    <Text style={styles.textoBoton}>Actualizar Datos</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tarjetaConfig}>
                <Text style={styles.tituloTarjeta}><Ionicons name="thermometer" size={18} /> Crear Plantilla de Conservación (NOM-004)</Text>
                
                <Text style={styles.labelInput}>Categoría del Producto:</Text>
                <TextInput
                    style={styles.input}
                    value={categoria}
                    onChangeText={setCategoria}
                    placeholder="Ej. Cortes, Molida, Embutidos"
                />

                <View style={styles.filaInputs}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.labelInput}>Temp. Ideal (°C):</Text>
                        <TextInput
                            style={styles.input}
                            value={temperatura}
                            onChangeText={setTemperatura}
                            keyboardType="numeric"
                            placeholder="Ej. 3.5"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.labelInput}>Vida Útil (Días):</Text>
                        <TextInput
                            style={styles.input}
                            value={vidaUtil}
                            onChangeText={setVidaUtil}
                            keyboardType="numeric"
                            placeholder="Ej. 7"
                        />
                    </View>
                </View>

                <TouchableOpacity style={[styles.botonGuardar, { backgroundColor: '#cc0033' }]} onPress={agregarPlantilla}>
                    <Text style={styles.textoBoton}>➕ Agregar Plantilla</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.tituloListado}>Plantillas Activas</Text>
            {plantillas.map((item) => (
                <View key={item.id} style={styles.itemPlantilla}>
                    <View>
                        <Text style={styles.plantillaCategoria}>{item.categoria}</Text>
                        <Text style={styles.plantillaDetalle}>Parámetro: Conservación Refrigerada</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.plantillaKpi}>{item.temperatura}°C</Text>
                        <Text style={styles.plantillaSubKpi}>{item.vidaUtil} días útiles</Text>
                    </View>
                </View>
            ))}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
    tituloSeccion: { fontSize: 22, fontWeight: 'bold', color: '#002855', marginTop: 10 },
    subtituloSeccion: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
    tarjetaConfig: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 1 },
    tituloTarjeta: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
    labelInput: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#0f172a', marginBottom: 15 },
    filaInputs: { flexDirection: 'row', justifyContent: 'space-between' },
    botonGuardar: { backgroundColor: '#002855', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
    textoBoton: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
    tituloListado: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginBottom: 12, marginTop: 5 },
    itemPlantilla: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10 },
    plantillaCategoria: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    plantillaDetalle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    plantillaKpi: { fontSize: 16, fontWeight: 'bold', color: '#cc0033' },
    plantillaSubKpi: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 }
});