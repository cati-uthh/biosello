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

const obtenerConsumoPreferente = (datos) => {
    const fechaDirecta = datos?.fecha_vencimiento || datos?.detalles_trazabilidad?.fecha_vencimiento;
    if (fechaDirecta) return formatearParaUI(fechaDirecta);
    const fechaEmpaque = datos?.fecha_empaque || datos?.fecha_ingreso;
    if (fechaEmpaque) {
        try {
            const partes = String(fechaEmpaque).split('T')[0].split('-');
            if (partes.length === 3 && partes[0].length === 4) {
                const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
                d.setDate(d.getDate() + 5);
                const dia = String(d.getDate()).padStart(2, '0');
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const anio = d.getFullYear();
                return `${dia}/${mes}/${anio}`;
            }
        } catch {
        }
    }
    return 'N/D';
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

export default function IngresoManual({ route, navigation }) {
    const { usuario } = useContext(AuthContext);
    const { width } = useWindowDimensions();
    const codigoEscaneado = route?.params?.codigoQR || '';
    const consultaDesdeQR = route?.params?.origenConsulta === 'qr';
    const idCorteEscaneado = route?.params?.id_corte || '';
    const incluirTipCuidadoEscaneado = route?.params?.incluir_tip_cuidado === true;
    const incluirRecomendacionEscaneada = route?.params?.incluir_recomendacion === true;

    const [codigo, setCodigo] = useState(codigoEscaneado);
    const [loading, setLoading] = useState(false);
    const [datosLote, setDatosLote] = useState(null);
    const [errorData, setErrorData] = useState(null);
    const [abriendoRA, setAbriendoRA] = useState(false);
    const [errorImagenAnimal, setErrorImagenAnimal] = useState(false);
    const [reintentosImagen, setReintentosImagen] = useState(0);

    const animalRA = obtenerAnimalRA(datosLote);
    const imagenAnimalUrl = obtenerUriImagenAnimal(datosLote);
    const recomendacionCorte = datosLote?.tip_recomendacion
        || datosLote?.recomendacion
        || datosLote?.detalles_trazabilidad?.tip_recomendacion
        || datosLote?.detalles_trazabilidad?.recomendacion
        || null;
    const tipCuidadoCorte = datosLote?.tip_cuidado
        || datosLote?.detalles_trazabilidad?.tip_cuidado
        || null;

    useEffect(() => {
        if (codigoEscaneado) {
            handleBuscar(codigoEscaneado);
        }
    }, [codigoEscaneado]);

    useEffect(() => {
        setErrorImagenAnimal(false);
        setReintentosImagen(0);
    }, [imagenAnimalUrl]);

    const handleCambioTexto = (valor) => {
        if (!valor || valor === 'LOT' || valor === 'LOT-') {
            setCodigo('');
            return;
        }
        setCodigo(formatearEntradaLote(valor));
    };

    const handleBuscar = async (codigoABuscar = codigo) => {
        const identificador = extraerIdentificadorQR(codigoABuscar);
        let idLimpiado = (identificador?.idLote || identificador?.codigoLote || codigoABuscar || '').trim();
        let idCorteExtraido = identificador?.idCorte || (consultaDesdeQR ? idCorteEscaneado : '');
        let incluirTipCuidado = identificador?.incluirTipCuidado !== undefined 
            ? identificador.incluirTipCuidado 
            : (consultaDesdeQR ? incluirTipCuidadoEscaneado : true);
        let incluirRecomendacion = identificador?.incluirRecomendacion !== undefined 
            ? identificador.incluirRecomendacion 
            : (consultaDesdeQR ? incluirRecomendacionEscaneada : true);

        // Si el código incluye el sufijo del corte (ej. LOT-2026-08-001-C02)
        const matchCorte = idLimpiado.match(/^(.+)[-_]C(\d+)$/i);
        if (matchCorte) {
            idLimpiado = matchCorte[1].trim();
            if (!idCorteExtraido) {
                idCorteExtraido = String(Number(matchCorte[2]));
            }
        }
        
        if (!idLimpiado) {
            Alert.alert('Código requerido', 'Por favor, ingrese un código o número de lote válido.');
            return;
        }

        setLoading(true);
        setErrorData(null);
        setDatosLote(null);

        try {
            const params = new URLSearchParams();
            if (idCorteExtraido) {
                params.append('id_corte', String(idCorteExtraido));
                params.append('incluir_tip_cuidado', String(incluirTipCuidado));
                params.append('incluir_recomendacion', String(incluirRecomendacion));
            }

            let result = null;

            // Lista de posibles candidatos para consulta pública
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

                params.set('id_lote', term);

                try {
                    // Consulta pública directa sin filtros de sesión de usuario
                    const response = await fetch(`${API_BASE_URL}/obtenerTrazabilidad?${params.toString()}`);
                    const json = await response.json();
                    if (response.ok && json && json.success) {
                        result = json;
                        break;
                    }
                } catch (e) {
                    // Continuar con el siguiente candidato
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

    const abrirRealidadAumentada = async () => {
        if (!animalRA || abriendoRA) return;

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
                loteId: datosLote?.lote_id,
                datosLote: datosLote,
                codigoQR: codigo
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

    const FilaTabla = ({ label, valor }) => (
        <View style={styles.filaTabla}>
            <Text style={styles.labelTabla}>{label}</Text>
            <Text style={styles.valorTabla}>{valor || 'N/D'}</Text>
        </View>
    );

    const nombreCarniceria = datosLote?.detalles_trazabilidad?.establecimiento
        || datosLote?.establecimiento
        || datosLote?.nombre_negocio
        || 'Carnicería "El Amigo"';

    const nombreLimpioCarniceria = nombreCarniceria.includes('"')
        ? nombreCarniceria
        : `Carnicería "${nombreCarniceria.replace(/^Carnicería\s+/i, '')}"`;

    const fechaProduccionFormateada = formatearParaUI(datosLote?.fecha_empaque || datosLote?.fecha_ingreso);
    const fechaConsumoFormateada = obtenerConsumoPreferente(datosLote);

    // Extracción dinámica de los tips de catalogo_corte y trazabilidad
    const tipsCuidadoArray = [];

    if (recomendacionCorte && String(recomendacionCorte).includes('|')) {
        const fragmentos = String(recomendacionCorte).split('|').map((f) => f.trim()).filter(Boolean);
        for (const frag of fragmentos) {
            tipsCuidadoArray.push(frag.replace(/^(Tip:\s*|Recomendación:\s*)/i, ''));
        }
    } else {
        if (tipCuidadoCorte) {
            tipsCuidadoArray.push(String(tipCuidadoCorte).replace(/^Tip:\s*/i, ''));
        }
        if (recomendacionCorte) {
            tipsCuidadoArray.push(String(recomendacionCorte).replace(/^Recomendación:\s*/i, ''));
        }
    }

    if (tipsCuidadoArray.length === 0) {
        tipsCuidadoArray.push('Sin recomendaciones específicas registradas para este corte.');
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.encabezadoNavegacion}>
                <TouchableOpacity
                    style={styles.botonVolver}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Volver a escanear"
                >
                    <Ionicons name="arrow-back" size={20} color={COLORS.azulMarino} />
                    <Text style={styles.textoVolver}>Volver a escanear</Text>
                </TouchableOpacity>
                {datosLote && <Text style={styles.tituloResultado}>Resultado:</Text>}
            </View>

            {loading && (
                <View style={styles.estadoCentrado}>
                    <ActivityIndicator size="large" color={COLORS.rojoIntenso} />
                    <Text style={styles.estadoTexto}>Consultando bases de datos...</Text>
                </View>
            )}

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

            {!datosLote && !loading && !errorData && (
                <View style={styles.containerOriginal}>
                    <Text style={styles.title}>
                        Coloque el número de código QR{'\n'}en el cuadro para escanear
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. 202608001 o 20260800102"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={22}
                        value={codigo}
                        onChangeText={handleCambioTexto}
                        autoCapitalize="characters"
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

            {datosLote && !loading && (
                <View style={styles.contenedorResultados}>
                    <View style={styles.badgeCarniceriaFigma}>
                        <Text style={styles.textoBadgeCarniceria}>{nombreLimpioCarniceria}</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: 8 }} />
                    </View>

                    <View style={styles.marcoFotoAnimalFigma}>
                        {imagenAnimalUrl && !errorImagenAnimal ? (
                            <Image
                                source={{ uri: imagenAnimalUrl }}
                                key={`${imagenAnimalUrl}-${reintentosImagen}`}
                                style={styles.fotoAnimalFigma}
                                resizeMode="cover"
                                onError={() => setErrorImagenAnimal(true)}
                                accessibilityLabel="Fotografía registrada del animal"
                            />
                        ) : (
                            <View style={styles.marcoSinFotoFigma}>
                                <Ionicons
                                    name={animalRA === 'cerdo' ? 'paw-outline' : 'leaf-outline'}
                                    size={44}
                                    color="#94a3b8"
                                />
                                <Text style={styles.tituloSinFotoFigma}>
                                    {imagenAnimalUrl && errorImagenAnimal ? 'No se pudo cargar la imagen' : 'Sin fotografía registrada'}
                                </Text>
                                <Text style={styles.textoSinFotoFigma}>
                                    {imagenAnimalUrl && errorImagenAnimal
                                        ? 'Revisa tu conexión a internet.'
                                        : 'Fotografía en Vercel Blob no disponible.'}
                                </Text>
                                {imagenAnimalUrl && errorImagenAnimal && (
                                    <TouchableOpacity
                                        style={styles.botonReintentarFotoFigma}
                                        onPress={() => {
                                            setErrorImagenAnimal(false);
                                            setReintentosImagen((valor) => valor + 1);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Reintentar carga de fotografía"
                                    >
                                        <Text style={styles.textoReintentarFotoFigma}>Reintentar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {animalRA && (
                            <TouchableOpacity
                                style={[styles.botonOverlayRA, abriendoRA && styles.botonDeshabilitado]}
                                onPress={abrirRealidadAumentada}
                                disabled={abriendoRA}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="Ver en Realidad Aumentada 3D"
                            >
                                <Ionicons name="cube-outline" size={17} color={COLORS.blancoPuro} style={{ marginRight: 6 }} />
                                <Text style={styles.textoBotonOverlayRA}>
                                    {abriendoRA ? 'Abriendo RA...' : 'Ver en RA 3D'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.tarjetaFigma}>
                        <View style={styles.bannerTarjetaFigma}>
                            <Text style={styles.tituloBannerFigma}>Datos del producto</Text>
                        </View>
                        <View style={styles.cuerpoTarjetaFigma}>
                            <FilaTabla label="Tipo de corte" valor={datosLote.producto || datosLote.tipo_corte || 'Bistec/Diesmillo'} />
                            <FilaTabla label="Lote" valor={datosLote.lote_id || datosLote.codigo_lote} />
                            <FilaTabla label="Fecha de producción" valor={fechaProduccionFormateada} />
                            <FilaTabla label="Consumo preferente" valor={fechaConsumoFormateada} />
                        </View>
                    </View>

                    <View style={styles.tarjetaFigma}>
                        <View style={styles.bannerTarjetaFigma}>
                            <Text style={styles.tituloBannerFigma}>Origen y sanidad</Text>
                        </View>
                        <View style={styles.cuerpoTarjetaFigma}>
                            <FilaTabla label="Especie" valor={datosLote.detalles_trazabilidad?.especie || (animalRA === 'cerdo' ? 'Porcino' : 'Bovino')} />
                            <FilaTabla label="Nombre del productor" valor={datosLote.detalles_trazabilidad?.productor || datosLote.detalles_trazabilidad?.propietario} />
                            <FilaTabla label="Procedencia" valor={datosLote.detalles_trazabilidad?.procedencia || datosLote.detalles_trazabilidad?.upp_rancho} />
                            <FilaTabla label="Rastro:" valor={datosLote.detalles_trazabilidad?.sacrificio_rastro || 'Rastro Municipal'} />
                            <FilaTabla label="Arete" valor={enmascararArete(datosLote.detalles_trazabilidad?.arete_siniga || datosLote.arete_siniga || datosLote.num_arete)} />
                        </View>
                    </View>

                    <View style={styles.tarjetaFigma}>
                        <View style={styles.bannerTarjetaFigma}>
                            <Text style={styles.tituloBannerFigma}>Recomendaciones</Text>
                        </View>
                        <View style={styles.cuerpoTarjetaFigma}>
                            {tipsCuidadoArray.map((tip, idx) => (
                                <Text key={idx} style={styles.bulletRecomendacion}>
                                    • "{tip}"
                                </Text>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, {marginTop: 18}]}
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
    encabezadoNavegacion: { minHeight: 54, paddingHorizontal: 14, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: COLORS.blancoPuro },
    botonVolver: { alignSelf: 'center', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
    textoVolver: { color: COLORS.azulMarino, fontSize: 14, fontWeight: FONTS.bold },
    tituloResultado: { fontSize: 16, fontWeight: FONTS.bold, color: '#0f172a' },
    
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

    // Estilos de la Ficha Técnica (Diseño Figma)
    contenedorResultados: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 14, paddingHorizontal: 16 },
    
    // Badge Superior de Carnicería con Checkmark
    badgeCarniceriaFigma: { flexDirection: 'row', backgroundColor: '#dbeafe', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
    textoBadgeCarniceria: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.azulMarino },

    // Marco de Fotografía del Animal
    marcoFotoAnimalFigma: { width: '100%', height: 210, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#dbe3ec', marginBottom: 14, position: 'relative' },
    fotoAnimalFigma: { width: '100%', height: '100%' },
    marcoSinFotoFigma: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16 },
    tituloSinFotoFigma: { color: '#475569', fontSize: 13, fontWeight: FONTS.bold, marginTop: 8, textAlign: 'center' },
    textoSinFotoFigma: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 3 },
    botonReintentarFotoFigma: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#e2e8f0' },
    textoReintentarFotoFigma: { color: '#475569', fontSize: 11, fontWeight: FONTS.bold },
    botonOverlayRA: { position: 'absolute', bottom: 12, right: 12, backgroundColor: COLORS.azulMarino, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: SIZES.radioBoton, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    textoBotonOverlayRA: { color: COLORS.blancoPuro, fontSize: 13, fontWeight: FONTS.bold },
    botonDeshabilitado: { opacity: 0.68 },

    // Tarjetas modulares de Figma
    tarjetaFigma: { backgroundColor: COLORS.blancoPuro, borderRadius: 14, borderWidth: 1, borderColor: '#dbe3ec', marginBottom: 14, overflow: 'hidden', elevation: 1 },
    bannerTarjetaFigma: { backgroundColor: '#dbeafe', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
    tituloBannerFigma: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.azulMarino },
    cuerpoTarjetaFigma: { paddingHorizontal: 16, paddingVertical: 6 },
    
    // Filas de datos
    filaTabla: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    labelTabla: { fontSize: 13.5, color: '#334155', flex: 1, paddingRight: 10 },
    valorTabla: { fontSize: 13.5, color: '#0f172a', fontWeight: FONTS.bold, flex: 1.3, textAlign: 'right' },

    // Bullets de recomendaciones
    bulletRecomendacion: { fontSize: 13.5, color: '#1e293b', fontStyle: 'italic', paddingVertical: 6, lineHeight: 20 }
});
