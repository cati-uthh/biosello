import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    isARSupportedOnDevice,
    ViroARSceneNavigator,
    ViroTrackingStateConstants
} from '@reactvision/react-viro';
import { COLORS, FONTS, SIZES } from '../theme/theme';
import { API_BASE_URL } from '../utils/auth';
import EscenaAnimalRA from './EscenaAnimalRA';
import {
    normalizarAnimalRA,
    obtenerNombreAnimalRA
} from './ModeloAnimal';

const ESCENA_INICIAL = { scene: EscenaAnimalRA };

const ESCALA_INICIAL = 1;
const ESCALA_MINIMA = 0.65;
const ESCALA_MAXIMA = 1.8;

// Función para formatear fechas al formato legible DD/MM/AAAA sin error en marcas de tiempo ISO
const formatearFechaUI = (fecha) => {
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

// Función para enmascarar el identificador del arete por seguridad mostrando solo los últimos 4 dígitos
const enmascararArete = (arete) => {
    if (!arete || arete === 'N/D') return 'N/D';
    const limpio = String(arete).trim();
    if (limpio.length <= 4) return `*******${limpio}`;
    const visibles = limpio.slice(-4);
    return `*******${visibles}`;
};

// Componente para fila de datos clave-valor con alto contraste
function FilaDato({ etiqueta, valor, destacar = false }) {
    return (
        <View style={styles.filaDato}>
            <Text style={styles.etiquetaDato}>{etiqueta}</Text>
            <Text style={[styles.valorDato, destacar && styles.valorDatoDestacado]}>
                {valor || 'N/D'}
            </Text>
        </View>
    );
}

function BotonControl({ icono, etiqueta, onPress }) {
    return (
        <TouchableOpacity
            style={styles.botonControl}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={etiqueta}
        >
            <Ionicons name={icono} size={21} color={COLORS.blancoPuro} />
            <Text style={styles.etiquetaControl}>{etiqueta}</Text>
        </TouchableOpacity>
    );
}

export default function RealidadAumentadaScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const animal = normalizarAnimalRA(route?.params?.animal);
    const nombreAnimal = obtenerNombreAnimalRA(animal);

    const [estadoModulo, setEstadoModulo] = useState('verificando');
    const [mensajeError, setMensajeError] = useState('');
    const [puedeVolverASolicitar, setPuedeVolverASolicitar] = useState(true);
    const [seguimiento, setSeguimiento] = useState('inicializando');
    const [animalColocado, setAnimalColocado] = useState(false);
    const [estadoModelo, setEstadoModelo] = useState('pendiente');
    const [errorModelo, setErrorModelo] = useState('');
    const [escala, setEscala] = useState(ESCALA_INICIAL);
    const [rotacion, setRotacion] = useState(0);
    const [resetKey, setResetKey] = useState(0);

    // Estado para la visualización del modal de propiedades de trazabilidad
    const [mostrarModalTrazabilidad, setMostrarModalTrazabilidad] = useState(false);
    const [datosLote, setDatosLote] = useState(route?.params?.datosLote || null);
    const [cargandoTrazabilidad, setCargandoTrazabilidad] = useState(false);
    const loteId = route?.params?.loteId || datosLote?.lote_id || datosLote?.id_lote || '';
    const codigoRastreo = route?.params?.codigoQR || datosLote?.codigo_lote || loteId || 'N/D';

    const prepararModulo = useCallback(async () => {
        setEstadoModulo('verificando');
        setMensajeError('');

        try {
            const soporte = await isARSupportedOnDevice();
            if (!soporte?.isARSupported) {
                setEstadoModulo('no-compatible');
                setMensajeError('Este dispositivo no es compatible con Realidad Aumentada mediante ARCore.');
                return;
            }
        } catch (error) {
            const detalle = String(error?.message || error || '');
            setEstadoModulo('no-compatible');
            setMensajeError(
                detalle.includes('UNSUPPORTED')
                    ? 'Este dispositivo no es compatible con Realidad Aumentada mediante ARCore.'
                    : 'No fue posible iniciar ARCore. Esta función requiere una compilación nativa de desarrollo, no Expo Go.'
            );
            return;
        }

        try {
            let permiso = await Camera.getCameraPermissionsAsync();
            if (!permiso.granted) {
                permiso = await Camera.requestCameraPermissionsAsync();
            }

            setPuedeVolverASolicitar(permiso.canAskAgain !== false);
            if (permiso.granted) {
                setEstadoModulo('listo');
            } else {
                setEstadoModulo('sin-permiso');
                setMensajeError('Se necesita permiso de cámara para colocar el animal en tu entorno.');
            }
        } catch (error) {
            setEstadoModulo('error');
            setMensajeError('No fue posible solicitar el permiso de cámara. Intenta nuevamente.');
        }
    }, []);

    useEffect(() => {
        prepararModulo();
    }, [prepararModulo]);

    useEffect(() => {
        const suscripcion = AppState.addEventListener('change', async (estado) => {
            if (estado === 'active' && estadoModulo === 'sin-permiso') {
                try {
                    const permiso = await Camera.getCameraPermissionsAsync();
                    if (permiso.granted) setEstadoModulo('listo');
                } catch {
                    // El botón de permiso permanece disponible si la consulta falla.
                }
            }
        });

        return () => suscripcion.remove();
    }, [estadoModulo]);

    const alActualizarSeguimiento = useCallback((estado) => {
        setSeguimiento(
            estado === ViroTrackingStateConstants.TRACKING_NORMAL
                ? 'normal'
                : 'inicializando'
        );
    }, []);

    const alColocarAnimal = useCallback(() => {
        setAnimalColocado(true);
    }, []);

    const alIniciarCargaModelo = useCallback(() => {
        setEstadoModelo('cargando');
        setErrorModelo('');
    }, []);

    const alTerminarCargaModelo = useCallback((evento) => {
        if (evento?.nativeEvent?.success === false) {
            setEstadoModelo('error');
            setErrorModelo('Viro no pudo completar la carga del archivo GLB.');
            return;
        }
        setEstadoModelo('listo');
        setErrorModelo('');
    }, []);

    const alFallarCargaModelo = useCallback((detalle) => {
        setEstadoModelo('error');
        setErrorModelo(detalle || 'No se pudo cargar el modelo 3D local.');
    }, []);

    const restablecerAnimal = useCallback(() => {
        setEscala(ESCALA_INICIAL);
        setRotacion(0);
        setEstadoModelo(animalColocado ? 'cargando' : 'pendiente');
        setErrorModelo('');
        setResetKey((valor) => valor + 1);
    }, [animalColocado]);

    const abrirConfiguracionOPedirPermiso = useCallback(() => {
        if (puedeVolverASolicitar) {
            prepararModulo();
        } else {
            Linking.openSettings();
        }
    }, [puedeVolverASolicitar, prepararModulo]);

    const instruccion = useMemo(() => {
        if (seguimiento !== 'normal') {
            return 'Mueve lentamente el teléfono para reconocer el entorno.';
        }
        if (!animalColocado) {
            return 'Toca la zona azul tenue a unos 60–100 cm frente a ti.';
        }
        if (estadoModelo === 'cargando') {
            return `Cargando el modelo de ${nombreAnimal.toLowerCase()}…`;
        }
        if (estadoModelo === 'error') {
            return `No se pudo mostrar el modelo. ${errorModelo}`;
        }
        return 'Arrastra la representación a escala o usa los controles inferiores.';
    }, [animalColocado, errorModelo, estadoModelo, nombreAnimal, seguimiento]);

    const consultarTrazabilidadSiFalta = useCallback(async () => {
        if (datosLote || !loteId || cargandoTrazabilidad) return;
        setCargandoTrazabilidad(true);
        try {
            const idNumerico = parseInt(String(loteId).trim(), 10);
            if (isNaN(idNumerico)) return;
            const response = await fetch(`${API_BASE_URL}/obtenerTrazabilidad?id_lote=${idNumerico}`);
            const result = await response.json();
            if (result.success) {
                setDatosLote(result);
            }
        } catch {
            // Se mantienen los fallbacks en caso de fallo de red
        } finally {
            setCargandoTrazabilidad(false);
        }
    }, [datosLote, loteId, cargandoTrazabilidad]);

    useEffect(() => {
        if (!datosLote && loteId) {
            consultarTrazabilidadSiFalta();
        }
    }, [consultarTrazabilidadSiFalta, datosLote, loteId]);

    // Normalización de datos de trazabilidad para la interfaz
    const trazabilidad = useMemo(() => {
        const detalles = datosLote?.detalles_trazabilidad || {};
        return {
            establecimiento: detalles.establecimiento || datosLote?.establecimiento || datosLote?.nombre_negocio || 'Carnicería BioSello',
            propietario: detalles.productor || detalles.propietario || datosLote?.propietario || datosLote?.productor || 'N/D',
            procedencia: detalles.procedencia || detalles.upp_rancho || datosLote?.procedencia || 'Huejutla de Reyes, Hgo.',
            corte: datosLote?.producto || datosLote?.tipo_corte || detalles.tipo_corte || 'Corte Cárnico',
            loteInterno: datosLote?.lote_id || datosLote?.id_lote || loteId || 'N/D',
            codigoRastreo: codigoRastreo,
            fechaProduccion: formatearFechaUI(datosLote?.fecha_empaque || datosLote?.fecha_ingreso || datosLote?.fecha_produccion),
            fechaConsumo: formatearFechaUI(datosLote?.fecha_vencimiento || detalles.fecha_vencimiento || datosLote?.fecha_caducidad),
            tipCuidado: datosLote?.tip_cuidado || detalles.tip_cuidado || null,
            recomendacion: datosLote?.tip_recomendacion || datosLote?.recomendacion || detalles.tip_recomendacion || detalles.recomendacion || null,
            especie: detalles.especie || (animal === 'cerdo' ? 'PORCINO' : 'BOVINO'),
            areteSiniga: enmascararArete(detalles.arete_siniga || datosLote?.arete_siniga || datosLote?.num_arete),
            uppRancho: detalles.upp_rancho || datosLote?.upp_origen || 'N/D',
            guiaReemo: detalles.guia_reemo || datosLote?.guia_transito || 'N/D',
            sacrificioRastro: detalles.sacrificio_rastro || datosLote?.rastro || 'N/D'
        };
    }, [datosLote, loteId, codigoRastreo, animal]);

    const aumentarEscala = () => {
        setEscala((valor) => Math.min(ESCALA_MAXIMA, Number((valor + 0.1).toFixed(2))));
    };

    const reducirEscala = () => {
        setEscala((valor) => Math.max(ESCALA_MINIMA, Number((valor - 0.1).toFixed(2))));
    };

    return (
        <View style={styles.pantalla}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {estadoModulo === 'listo' ? (
                <ViroARSceneNavigator
                    style={styles.visorRA}
                    initialScene={ESCENA_INICIAL}
                    shadowsEnabled
                    viroAppProps={{
                        animal,
                        escala,
                        rotacion,
                        resetKey,
                        onSeguimientoActualizado: alActualizarSeguimiento,
                        onAnimalColocado: alColocarAnimal,
                        onModeloCargando: alIniciarCargaModelo,
                        onModeloCargado: alTerminarCargaModelo,
                        onModeloError: alFallarCargaModelo
                    }}
                />
            ) : (
                <View style={styles.estadoContenedor}>
                    <View style={styles.estadoTarjeta}>
                        <View style={styles.estadoIcono}>
                            <Ionicons
                                name={estadoModulo === 'verificando' ? 'scan-outline' : 'alert-circle-outline'}
                                size={38}
                                color={COLORS.azulCeruleo}
                            />
                        </View>
                        <Text style={styles.estadoTitulo}>
                            {estadoModulo === 'verificando' ? 'Preparando Realidad Aumentada' : 'No se pudo abrir la RA'}
                        </Text>
                        <Text style={styles.estadoTexto}>
                            {estadoModulo === 'verificando'
                                ? 'Comprobando ARCore y el permiso de cámara…'
                                : mensajeError}
                        </Text>
                        {estadoModulo === 'verificando' ? (
                            <ActivityIndicator color={COLORS.rojoIntenso} style={styles.indicador} />
                        ) : estadoModulo === 'sin-permiso' ? (
                            <TouchableOpacity
                                style={styles.botonEstado}
                                onPress={abrirConfiguracionOPedirPermiso}
                            >
                                <Text style={styles.textoBotonEstado}>
                                    {puedeVolverASolicitar ? 'Solicitar permiso' : 'Abrir configuración'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.botonEstado} onPress={prepararModulo}>
                                <Text style={styles.textoBotonEstado}>Intentar de nuevo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Encabezado principal institucional */}
            <View style={[styles.encabezado, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.botonRegresar}
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Regresar"
                    hitSlop={8}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.blancoPuro} />
                </TouchableOpacity>
                <View style={styles.encabezadoTexto}>
                    <Text style={styles.encabezadoTitulo}>{nombreAnimal} en RA</Text>
                    <Text style={styles.encabezadoSubtitulo}>Visualización y Trazabilidad</Text>
                </View>
                {/* Botón de acceso rápido a trazabilidad en la cabecera */}
                <TouchableOpacity
                    style={styles.botonHeaderTrazabilidad}
                    onPress={() => setMostrarModalTrazabilidad(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Ver Ficha de Trazabilidad"
                    activeOpacity={0.75}
                >
                    <Ionicons name="clipboard-outline" size={18} color={COLORS.blancoPuro} />
                    <Text style={styles.textoHeaderTrazabilidad}>Ficha</Text>
                </TouchableOpacity>
            </View>

            {estadoModulo === 'listo' && (
                <>
                    {/* Tarjeta de instrucción de posicionamiento */}
                    <View style={[styles.instruccionTarjeta, { top: insets.top + 78 }]}>
                        <Ionicons
                            name={estadoModelo === 'error'
                                ? 'alert-circle-outline'
                                : animalColocado ? 'hand-left-outline' : 'scan-outline'}
                            size={20}
                            color={estadoModelo === 'error' ? COLORS.rojoIntenso : COLORS.azulCeruleo}
                        />
                        <Text style={styles.instruccionTexto}>{instruccion}</Text>
                    </View>

                    {/* Botón flotante para ver propiedades de trazabilidad (Ley de Fitts - Fácil acceso) */}
                    <TouchableOpacity
                        style={[styles.botonTrazabilidadFlotante, { top: insets.top + 140 }]}
                        onPress={() => setMostrarModalTrazabilidad(true)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Ver propiedades de trazabilidad"
                    >
                        <View style={styles.iconoBotonFlotante}>
                            <Ionicons name="ribbon-outline" size={18} color={COLORS.blancoPuro} />
                        </View>
                        <Text style={styles.textoBotonFlotante}>Ver Ficha de Trazabilidad</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.blancoPuro} />
                    </TouchableOpacity>

                    {/* Panel inferior de controles para manipulación del modelo 3D */}
                    <View style={[styles.panelControles, { bottom: insets.bottom + 16 }]}>
                        <BotonControl
                            icono="arrow-undo-outline"
                            etiqueta="Girar izq."
                            onPress={() => setRotacion((valor) => valor - 15)}
                        />
                        <BotonControl
                            icono="arrow-redo-outline"
                            etiqueta="Girar der."
                            onPress={() => setRotacion((valor) => valor + 15)}
                        />
                        <BotonControl icono="remove" etiqueta="Reducir" onPress={reducirEscala} />
                        <BotonControl icono="add" etiqueta="Aumentar" onPress={aumentarEscala} />
                        <BotonControl icono="refresh" etiqueta="Restablecer" onPress={restablecerAnimal} />
                    </View>
                </>
            )}

            {/* Modal de Ficha Técnica de Trazabilidad */}
            <Modal
                visible={mostrarModalTrazabilidad}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setMostrarModalTrazabilidad(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContenedor, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        {/* Encabezado del modal */}
                        <View style={styles.modalEncabezado}>
                            <View style={styles.modalEncabezadoIcono}>
                                <Ionicons name="shield-checkmark" size={22} color={COLORS.blancoPuro} />
                            </View>
                            <View style={styles.modalEncabezadoTexto}>
                                <Text style={styles.modalTitulo}>Ficha de Trazabilidad</Text>
                                <Text style={styles.modalSubtitulo}>Certificación y Origen BioSello</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalBotonCerrarIcono}
                                onPress={() => setMostrarModalTrazabilidad(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar ventana de trazabilidad"
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color={COLORS.blancoPuro} />
                            </TouchableOpacity>
                        </View>

                        {/* Cuerpo con scroll de datos */}
                        <ScrollView
                            contentContainerStyle={styles.modalScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Insignia de verificación */}
                            <View style={styles.tarjetaAprobada}>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" style={{ marginRight: 8 }} />
                                <Text style={styles.textoAprobado}>Producto Verificado Oficialmente</Text>
                            </View>

                            {/* 1. Carnicería y Propietario */}
                            <View style={styles.tarjetaSeccion}>
                                <View style={styles.tarjetaSeccionEncabezado}>
                                    <Ionicons name="business" size={17} color={COLORS.azulCeruleo} />
                                    <Text style={styles.tarjetaSeccionTitulo}>Establecimiento y Propietario</Text>
                                </View>
                                <View style={styles.tarjetaSeccionCuerpo}>
                                    <FilaDato etiqueta="Carnicería / Negocio" valor={trazabilidad.establecimiento} destacar />
                                    <FilaDato etiqueta="Propietario / Responsable" valor={trazabilidad.propietario} />
                                    <FilaDato etiqueta="Ubicación / Procedencia" valor={trazabilidad.procedencia} />
                                </View>
                            </View>

                            {/* 2. Corte y Fechas Clave */}
                            <View style={styles.tarjetaSeccion}>
                                <View style={styles.tarjetaSeccionEncabezado}>
                                    <Ionicons name="cube" size={17} color={COLORS.azulMarino} />
                                    <Text style={styles.tarjetaSeccionTitulo}>Datos del Producto y Fechas</Text>
                                </View>
                                <View style={styles.tarjetaSeccionCuerpo}>
                                    <FilaDato etiqueta="Pieza / Corte" valor={trazabilidad.corte} destacar />
                                    <FilaDato etiqueta="Lote de Registro" valor={trazabilidad.loteInterno} />
                                    <FilaDato etiqueta="Fecha de Producción" valor={trazabilidad.fechaProduccion} />
                                    <FilaDato etiqueta="Consumo Preferente" valor={trazabilidad.fechaConsumo} destacar />
                                </View>
                            </View>

                            {/* 3. Tips de Cuidado y Recomendaciones (Amarillo Alerta / Precaución Semántica) */}
                            {(trazabilidad.tipCuidado || trazabilidad.recomendacion) && (
                                <View style={styles.tarjetaTips}>
                                    <View style={styles.tarjetaTipsEncabezado}>
                                        <Ionicons name="bulb" size={18} color="#b45309" />
                                        <Text style={styles.tarjetaTipsTitulo}>Tips y Recomendaciones del Corte</Text>
                                    </View>
                                    <View style={styles.tarjetaTipsCuerpo}>
                                        {trazabilidad.tipCuidado ? (
                                            <View style={styles.bloqueTip}>
                                                <Text style={styles.subtituloTip}>Conservación y Cuidado:</Text>
                                                <Text style={styles.textoTip}>{trazabilidad.tipCuidado}</Text>
                                            </View>
                                        ) : null}
                                        {trazabilidad.recomendacion ? (
                                            <View style={[styles.bloqueTip, trazabilidad.tipCuidado && { marginTop: 8 }]}>
                                                <Text style={styles.subtituloTip}>Recomendación Culinaria:</Text>
                                                <Text style={styles.textoTip}>{trazabilidad.recomendacion}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            )}

                            {/* 4. Datos del Animal y Sanidad */}
                            <View style={styles.tarjetaSeccion}>
                                <View style={styles.tarjetaSeccionEncabezado}>
                                    <Ionicons name="paw" size={17} color="#ca8a04" />
                                    <Text style={styles.tarjetaSeccionTitulo}>Trazabilidad del Animal (Origen)</Text>
                                </View>
                                <View style={styles.tarjetaSeccionCuerpo}>
                                    <FilaDato etiqueta="Especie" valor={trazabilidad.especie} />
                                    <FilaDato etiqueta="Arete Oficial (SINIIGA)" valor={trazabilidad.areteSiniga} destacar />
                                    <FilaDato etiqueta="Rancho / UPP Origen" valor={trazabilidad.uppRancho} />
                                    <FilaDato etiqueta="Guía de Tránsito (REEMO)" valor={trazabilidad.guiaReemo} />
                                    <FilaDato etiqueta="Rastro de Sacrificio" valor={trazabilidad.sacrificioRastro} />
                                </View>
                            </View>

                            {/* Botón de cierre primario con alto contraste (Rojo Intenso CTA) */}
                            <TouchableOpacity
                                style={styles.btnCerrarModal}
                                onPress={() => setMostrarModalTrazabilidad(false)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar Ficha Técnica"
                            >
                                <Text style={styles.textoBtnCerrarModal}>Cerrar Ficha Técnica</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: COLORS.azulMarino },
    visorRA: { flex: 1 },
    encabezado: { position: 'absolute', top: 0, left: 0, right: 0, minHeight: 70, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(4, 30, 58, 0.94)', flexDirection: 'row', alignItems: 'flex-end' },
    botonRegresar: { width: 44, height: 44, borderRadius: SIZES.radioBoton, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center' },
    encabezadoTexto: { flex: 1, marginHorizontal: 12 },
    encabezadoTitulo: { color: COLORS.blancoPuro, fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold },
    encabezadoSubtitulo: { color: '#cbd5e1', fontSize: SIZES.textoSecundario, marginTop: 2 },
    botonHeaderTrazabilidad: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.azulCeruleo, paddingHorizontal: 10, paddingVertical: 8, borderRadius: SIZES.radioBoton, gap: 4 },
    textoHeaderTrazabilidad: { color: COLORS.blancoPuro, fontSize: 12, fontWeight: FONTS.bold },
    insigniaAnimal: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.rojoIntenso, alignItems: 'center', justifyContent: 'center' },
    instruccionTarjeta: { position: 'absolute', left: 16, right: 16, minHeight: 54, paddingHorizontal: 14, paddingVertical: 11, borderRadius: SIZES.radioTarjeta, backgroundColor: 'rgba(255, 255, 255, 0.94)', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    instruccionTexto: { flex: 1, color: '#334155', fontSize: 13, fontWeight: '600', lineHeight: 18, marginLeft: 10 },
    
    // Botón flotante para trazabilidad
    botonTrazabilidadFlotante: { position: 'absolute', left: 16, right: 16, minHeight: 46, backgroundColor: COLORS.azulCeruleo, borderRadius: SIZES.radioBoton, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    iconoBotonFlotante: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    textoBotonFlotante: { flex: 1, color: COLORS.blancoPuro, fontSize: 13, fontWeight: FONTS.bold },

    panelControles: { position: 'absolute', left: 12, right: 12, padding: 9, borderRadius: SIZES.radioTarjeta, backgroundColor: 'rgba(4, 30, 58, 0.94)', flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
    botonControl: { flex: 1, minHeight: 56, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulCeruleo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    etiquetaControl: { color: COLORS.blancoPuro, fontSize: 9, fontWeight: FONTS.bold, textAlign: 'center', marginTop: 3 },
    estadoContenedor: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#f8fafc' },
    estadoTarjeta: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, borderWidth: 1, borderColor: '#e2e8f0', padding: 24, alignItems: 'center' },
    estadoIcono: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    estadoTitulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, textAlign: 'center' },
    estadoTexto: { color: '#64748b', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
    indicador: { marginTop: 20 },
    botonEstado: { minWidth: 180, marginTop: 20, paddingVertical: 13, paddingHorizontal: 20, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.rojoIntenso, alignItems: 'center' },
    textoBotonEstado: { color: COLORS.blancoPuro, fontSize: 14, fontWeight: FONTS.bold },

    // Estilos del Modal de Trazabilidad
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(4, 30, 58, 0.72)', justifyContent: 'flex-end' },
    modalContenedor: { maxHeight: '88%', backgroundColor: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
    modalEncabezado: { backgroundColor: COLORS.azulMarino, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.azulCeruleo },
    modalEncabezadoIcono: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    modalEncabezadoTexto: { flex: 1 },
    modalTitulo: { color: COLORS.blancoPuro, fontSize: 17, fontWeight: FONTS.bold },
    modalSubtitulo: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    modalBotonCerrarIcono: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center' },
    modalScroll: { padding: 16, paddingBottom: 24 },

    tarjetaAprobada: { flexDirection: 'row', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#6ee7b7', padding: 12, borderRadius: SIZES.radioTarjeta, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    textoAprobado: { fontSize: 14, fontWeight: '800', color: '#047857' },

    tarjetaSeccion: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, elevation: 1 },
    tarjetaSeccionEncabezado: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderTopLeftRadius: SIZES.radioTarjeta, borderTopRightRadius: SIZES.radioTarjeta },
    tarjetaSeccionTitulo: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.azulMarino, marginLeft: 8 },
    tarjetaSeccionCuerpo: { paddingHorizontal: 14, paddingVertical: 6 },

    filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    etiquetaDato: { fontSize: 13, color: '#64748b', flex: 1, paddingRight: 10 },
    valorDato: { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 1.3, textAlign: 'right' },
    valorDatoDestacado: { color: COLORS.azulMarino, fontWeight: '900', fontSize: 13.5 },

    // Tarjeta de tips con acento amarillo institucional
    tarjetaTips: { backgroundColor: '#fffbeb', borderRadius: SIZES.radioTarjeta, borderWidth: 1, borderColor: '#fde68a', marginBottom: 12, padding: 14 },
    tarjetaTipsEncabezado: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    tarjetaTipsTitulo: { fontSize: 14, fontWeight: FONTS.bold, color: '#92400e', marginLeft: 8 },
    tarjetaTipsCuerpo: { marginTop: 4 },
    bloqueTip: { backgroundColor: 'rgba(255, 255, 255, 0.7)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fef08a' },
    subtituloTip: { fontSize: 12, fontWeight: FONTS.bold, color: '#b45309', marginBottom: 3 },
    textoTip: { fontSize: 13, color: '#451a03', lineHeight: 18 },

    btnCerrarModal: { backgroundColor: COLORS.rojoIntenso, minHeight: 48, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 8 },
    textoBtnCerrarModal: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold }
});
