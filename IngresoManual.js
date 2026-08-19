import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { API_BASE_URL, getAuthHeaders } from './src/utils/auth';
import { extraerIdentificadorQR } from './src/utils/qr';
import { obtenerUriImagenAnimal } from './src/utils/imagenAnimal';

const formatearParaUI = (fecha) => {
    if (!fecha) return 'N/D';
    if (fecha.includes('/')) return fecha; 
    const partes = fecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fecha;
};

const normalizarTextoEspecie = (valor) => String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const obtenerAnimalRA = (datos) => {
    const detalles = datos?.detalles_trazabilidad || {};
    const valoresPosibles = [
        detalles.especie,
        datos?.especie,
        datos?.especie_nombre,
        datos?.tipo_carne,
        datos?.categoria,
        datos?.producto
    ];

    for (const valor of valoresPosibles) {
        const especie = normalizarTextoEspecie(valor);
        if (/PORCIN|CERDO|PORK/.test(especie)) {
            return 'cerdo';
        }
        if (/BOVIN|VACA|BEEF/.test(especie) || /(^|[^A-Z])RES([^A-Z]|$)/.test(especie)) {
            return 'vaca';
        }
    }

    return null;
};

export default function IngresoManual({ route, navigation }) {
    const { usuario } = useContext(AuthContext);
    const { width } = useWindowDimensions();
    // Si la pantalla fue abierta por el Escáner, recibe el código aquí
    const codigoEscaneado = route?.params?.codigoQR || '';
    const consultaDesdeQR = route?.params?.origenConsulta === 'qr';

    const [codigo, setCodigo] = useState(codigoEscaneado);
    const [loading, setLoading] = useState(false);
    const [datosLote, setDatosLote] = useState(null);
    const [errorData, setErrorData] = useState(null);
    const [abriendoRA, setAbriendoRA] = useState(false);
    const [errorImagenAnimal, setErrorImagenAnimal] = useState(false);
    const [reintentosImagen, setReintentosImagen] = useState(0);

    const animalRA = obtenerAnimalRA(datosLote);
    const imagenAnimalUrl = obtenerUriImagenAnimal(datosLote);
    const multimediaCompacta = width < 380;
    const anchoImagen = width >= 720 ? 190 : multimediaCompacta ? 118 : 138;
    const alturaMultimedia = width >= 720 ? 190 : multimediaCompacta ? 132 : 166;

    // Si viene del escáner con datos, busca automáticamente
    useEffect(() => {
        if (codigoEscaneado) {
            handleBuscar(codigoEscaneado);
        }
    }, [codigoEscaneado]);

    useEffect(() => {
        setErrorImagenAnimal(false);
        setReintentosImagen(0);
    }, [imagenAnimalUrl]);

    const handleBuscar = async (codigoABuscar = codigo) => {
        const identificador = extraerIdentificadorQR(codigoABuscar);
        const idLimpiado = identificador?.idLote || identificador?.codigoLote || '';
        
        if (idLimpiado === '') {
            Alert.alert('Código requerido', 'Por favor, ingrese un número válido.');
            return;
        }

        setLoading(true);
        setErrorData(null);
        setDatosLote(null);

        try {
            const idNumerico = parseInt(idLimpiado, 10);
            if (Number.isNaN(idNumerico)) {
                setErrorData('El código debe contener un identificador numérico de lote.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/obtenerTrazabilidad?id_lote=${idNumerico}`, {
                headers: getAuthHeaders(usuario)
            });
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

    const abrirRealidadAumentada = async () => {
        if (!consultaDesdeQR || !animalRA || abriendoRA) return;

        setAbriendoRA(true);
        try {
            let permiso = await Camera.getCameraPermissionsAsync();

            if (!permiso.granted && permiso.canAskAgain !== false) {
                permiso = await Camera.requestCameraPermissionsAsync();
            }

            if (!permiso.granted) {
                const acciones = [{ text: 'Entendido', style: 'cancel' }];
                if (permiso.canAskAgain === false) {
                    acciones.push({
                        text: 'Abrir configuración',
                        onPress: () => Linking.openSettings()
                    });
                }

                Alert.alert(
                    'Permiso de cámara requerido',
                    'La cámara es necesaria para visualizar el animal en Realidad Aumentada.',
                    acciones
                );
                return;
            }

            navigation.navigate('RealidadAumentada', {
                animal: animalRA,
                origen: 'consulta-qr',
                loteId: datosLote?.lote_id
            });
        } catch (error) {
            Alert.alert(
                'No se pudo abrir la cámara',
                'Ocurrió un problema al comprobar el permiso. Intenta nuevamente.'
            );
        } finally {
            setAbriendoRA(false);
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
            <View style={styles.encabezadoNavegacion}>
                <TouchableOpacity
                    style={styles.botonVolver}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al escáner"
                >
                    <Ionicons name="arrow-back" size={20} color={COLORS.azulMarino} />
                    <Text style={styles.textoVolver}>Volver al escáner</Text>
                </TouchableOpacity>
            </View>

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

                    {consultaDesdeQR && (
                        <View style={styles.tarjetaMultimedia}>
                            <View style={styles.encabezadoTarjeta}>
                                <Ionicons name="image" size={18} color={COLORS.azulCeruleo} />
                                <Text style={styles.tituloTarjetaDatos}>Fotografía y experiencia RA</Text>
                            </View>
                            <View style={styles.filaMultimedia}>
                                <View
                                    style={[
                                        styles.marcoImagenAnimal,
                                        { width: anchoImagen, height: alturaMultimedia }
                                    ]}
                                >
                                    {imagenAnimalUrl && !errorImagenAnimal ? (
                                        <Image
                                            source={{ uri: imagenAnimalUrl }}
                                            key={`${imagenAnimalUrl}-${reintentosImagen}`}
                                            style={styles.imagenAnimal}
                                            resizeMode="cover"
                                            onError={() => setErrorImagenAnimal(true)}
                                            accessibilityLabel="Fotografía registrada del animal"
                                        />
                                    ) : (
                                        <View style={styles.imagenNoDisponible}>
                                            <Ionicons name="image-outline" size={32} color="#94a3b8" />
                                            <Text style={styles.tituloSinImagen}>
                                                {imagenAnimalUrl && errorImagenAnimal ? 'No se pudo cargar' : 'Sin fotografía'}
                                            </Text>
                                            <Text style={styles.textoSinImagen}>
                                                {imagenAnimalUrl && errorImagenAnimal
                                                    ? 'Revisa tu conexión e intenta otra vez.'
                                                    : 'No hay una imagen disponible para este lote.'}
                                            </Text>
                                            {imagenAnimalUrl && errorImagenAnimal && (
                                                <TouchableOpacity
                                                    style={styles.botonReintentarImagen}
                                                    onPress={() => {
                                                        setErrorImagenAnimal(false);
                                                        setReintentosImagen((valor) => valor + 1);
                                                    }}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Reintentar carga de fotografía"
                                                >
                                                    <Text style={styles.textoReintentarImagen}>Reintentar</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {animalRA && (
                                    <TouchableOpacity
                                        style={[
                                            styles.botonRA,
                                            { height: alturaMultimedia },
                                            abriendoRA && styles.botonDeshabilitado
                                        ]}
                                        onPress={abrirRealidadAumentada}
                                        disabled={abriendoRA}
                                        activeOpacity={0.78}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Ver ${animalRA === 'cerdo' ? 'cerdo' : 'vaca'} en Realidad Aumentada`}
                                        accessibilityState={{ disabled: abriendoRA, busy: abriendoRA }}
                                    >
                                        <View style={styles.iconoRA}>
                                            <Ionicons name="cube-outline" size={25} color={COLORS.blancoPuro} />
                                        </View>
                                        <Text style={styles.tituloBotonRA}>Realidad Aumentada</Text>
                                        {!multimediaCompacta && (
                                            <Text style={styles.subtituloBotonRA}>
                                                Observa el animal en una representación a escala.
                                            </Text>
                                        )}
                                        <View style={styles.accionRA}>
                                            {abriendoRA
                                                ? <ActivityIndicator size="small" color={COLORS.blancoPuro} />
                                                : <><Text style={styles.textoAccionRA}>Abrir RA</Text><Ionicons name="arrow-forward" size={16} color={COLORS.blancoPuro} /></>}
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* BOTÓN PARA LIMPIAR Y VOLVER A BUSCAR */}
                    <TouchableOpacity
                        style={[styles.primaryButton, {marginTop: 15}]}
                        onPress={() => {
                            if (consultaDesdeQR) {
                                navigation.goBack();
                                return;
                            }
                            setDatosLote(null);
                            setCodigo('');
                        }}
                    >
                        <Text style={styles.buttonText}>{consultaDesdeQR ? 'Escanear otro código' : 'Realizar otra búsqueda'}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: COLORS.blancoPuro, paddingBottom: 40 },
    encabezadoNavegacion: { minHeight: 58, paddingHorizontal: 12, paddingTop: 8, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: COLORS.blancoPuro },
    botonVolver: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
    textoVolver: { color: COLORS.azulMarino, fontSize: 14, fontWeight: FONTS.bold },
    
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
    contenedorResultados: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 20, paddingHorizontal: 16 },
    tarjetaAprobada: { flexDirection: 'row', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#6ee7b7', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    textoAprobado: { fontSize: 16, fontWeight: '800', color: '#047857' },

    tarjetaDatos: { backgroundColor: COLORS.blancoPuro, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15, elevation: 1 },
    encabezadoTarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    tituloTarjetaDatos: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginLeft: 8 },
    cuerpoTarjeta: { padding: 15 },
    
    filaTabla: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    labelTabla: { fontSize: 13, color: '#64748b', flex: 1, paddingRight: 10 },
    valorTabla: { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 1.2, textAlign: 'right' },
    valorDestacado: { color: COLORS.azulMarino, fontWeight: '900', fontSize: 14 },

    tarjetaMultimedia: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, borderWidth: 1, borderColor: '#dbe3ec', marginBottom: 15, overflow: 'hidden', elevation: 1 },
    filaMultimedia: { flexDirection: 'row', alignItems: 'stretch', gap: 10, padding: 12 },
    marcoImagenAnimal: { flexShrink: 0, borderRadius: SIZES.radioBoton, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#dbe3ec' },
    imagenAnimal: { width: '100%', height: '100%' },
    imagenNoDisponible: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    tituloSinImagen: { color: '#475569', fontSize: 12, fontWeight: FONTS.bold, marginTop: 5, textAlign: 'center' },
    textoSinImagen: { color: '#94a3b8', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 2 },
    botonReintentarImagen: { minHeight: 28, marginTop: 5, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#e2e8f0' },
    textoReintentarImagen: { color: '#475569', fontSize: 10, fontWeight: FONTS.bold },
    botonRA: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 10, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulCeruleo, alignItems: 'flex-start', justifyContent: 'center', elevation: 2 },
    botonDeshabilitado: { opacity: 0.68 },
    iconoRA: { width: 40, height: 40, borderRadius: SIZES.radioBoton, backgroundColor: 'rgba(255, 255, 255, 0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    tituloBotonRA: { color: COLORS.blancoPuro, fontSize: 14, fontWeight: FONTS.bold },
    subtituloBotonRA: { color: '#e0f2fe', fontSize: 10, lineHeight: 14, marginTop: 3 },
    accionRA: { minHeight: 30, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
    textoAccionRA: { color: COLORS.blancoPuro, fontSize: 11, fontWeight: FONTS.bold }
});
