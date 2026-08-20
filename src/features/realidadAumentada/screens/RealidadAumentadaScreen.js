import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Linking,
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
import { COLORS, FONTS, SIZES } from '../../../theme/theme';
import EscenaAnimalRA from '../components/EscenaAnimalRA';
import {
    normalizarAnimalRA,
    obtenerNombreAnimalRA
} from '../components/ModeloAnimal';

const ESCENA_INICIAL = { scene: EscenaAnimalRA };

const ESCALA_INICIAL = 1;
const ESCALA_MINIMA = 0.65;
const ESCALA_MAXIMA = 1.8;

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
                    <Text style={styles.encabezadoSubtitulo}>Visualización local</Text>
                </View>
                <View style={styles.insigniaAnimal}>
                    <Ionicons name="paw" size={18} color={COLORS.blancoPuro} />
                </View>
            </View>

            {estadoModulo === 'listo' && (
                <>
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
    insigniaAnimal: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.rojoIntenso, alignItems: 'center', justifyContent: 'center' },
    instruccionTarjeta: { position: 'absolute', left: 16, right: 16, minHeight: 54, paddingHorizontal: 14, paddingVertical: 11, borderRadius: SIZES.radioTarjeta, backgroundColor: 'rgba(255, 255, 255, 0.94)', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    instruccionTexto: { flex: 1, color: '#334155', fontSize: 13, fontWeight: '600', lineHeight: 18, marginLeft: 10 },
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
    textoBotonEstado: { color: COLORS.blancoPuro, fontSize: 14, fontWeight: FONTS.bold }
});
