import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GenerarQR from './generarQR';
import RegistrarLoteAnimal from './RegistrarLoteAnimal';
import MisLotes from './MisLotes';
import ActGestionSucursales from './ActGestionSucursales'; // Nueva pantalla
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

const diasParaVencer = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    const vencimiento = new Date(`${fecha}T00:00:00`);
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((vencimiento - hoy) / 86400000);
};

export default function InicioScreen({ navigation }) {
    const { sesionActiva, usuario } = useContext(AuthContext);
    const [pantallaInterna, setPantallaInterna] = useState('menu');
    const [lotes, setLotes] = useState([]);
    const [refrescando, setRefrescando] = useState(false);

    // ESTADOS DE SUCURSALES
    const [sucursales, setSucursales] = useState([]);
    const [sucursalActiva, setSucursalActiva] = useState(null);
    const [modalSucursalesVisible, setModalSucursalesVisible] = useState(false);
    const [cargandoSucursales, setCargandoSucursales] = useState(false);

    const fadeTitulo = useRef(new Animated.Value(0)).current;
    const fadeIcono = useRef(new Animated.Value(0)).current;
    const fadeTexto = useRef(new Animated.Value(0)).current;
    const fadeBotones = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!sesionActiva) {
            Animated.stagger(200, [
                Animated.timing(fadeTitulo, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeIcono, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeTexto, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeBotones, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]).start();
        }
    }, [sesionActiva, fadeTitulo, fadeIcono, fadeTexto, fadeBotones]);

    const cargarSucursales = async () => {
        const idNegocioBase = usuario?.id_negocio || usuario?.negocio?.id_negocio;
        if (!idNegocioBase) return;

        try {
            setCargandoSucursales(true);
            const response = await fetch(`${API_BASE_URL}/sucursales?id_negocio=${idNegocioBase}`);
            const result = await response.json();

            if (response.ok && result.success && result.data.length > 0) {
                setSucursales(result.data);
                if (!sucursalActiva) {
                    setSucursalActiva(result.data[0]);
                }
            }
        } catch (error) {
            console.error('Error al cargar sucursales:', error);
        } finally {
            setCargandoSucursales(false);
        }
    };

    const cargarLotes = async () => {
        if (!sesionActiva) return;
        try {
            const idNegocioSeleccionado = sucursalActiva?.id_negocio || usuario?.id_negocio || usuario?.negocio?.id_negocio;
            if (!idNegocioSeleccionado) return;

            const response = await fetch(`${API_BASE_URL}/lotes?id_negocio=${idNegocioSeleccionado}`);
            const result = await response.json();
            if (response.ok && result.success !== false) setLotes(result.data || []);
        } catch (error) {
            setLotes([]);
        } finally {
            setRefrescando(false);
        }
    };

    useEffect(() => {
        if (sesionActiva) cargarSucursales();
    }, [sesionActiva]);

    useEffect(() => {
        if (sucursalActiva) cargarLotes();
    }, [sucursalActiva]);

    useFocusEffect(
        useCallback(() => {
            if (pantallaInterna === 'menu') {
                cargarLotes();
                cargarSucursales();
            }

            const onBackPress = () => {
                if (pantallaInterna !== 'menu') {
                    setPantallaInterna('menu');
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [pantallaInterna, sesionActiva, sucursalActiva])
    );

    const alArrastrarParaActualizar = () => {
        setRefrescando(true);
        cargarLotes();
        cargarSucursales();
    };

    if (!sesionActiva) {
        return (
            <View style={styles.contenedorInvitacion}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.azulMarino}/>
                <Animated.View style={{ opacity: fadeTitulo }}>
                    <Text style={styles.tituloInvitacion}>Toma el control de tu inventario</Text>
                </Animated.View>
                <Animated.View style={{ opacity: fadeIcono }}>
                    <Image source={require('./assets/icon.png')} style={styles.iconoCuadrado} resizeMode="cover" />
                </Animated.View>
                <Animated.View style={{ opacity: fadeTexto }}>
                    <Text style={styles.descripcionInvitacion}>Registra tus lotes, monitorea la cadena de frío y genera códigos QR de trazabilidad.</Text>
                </Animated.View>

                <Animated.View style={{ opacity: fadeBotones, width: '100%', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.botonRegistrar} onPress={() => navigation.navigate('actRegistroNegocio')}>
                        <Text style={styles.textoBotonRegistrar}>Registrar mi Negocio</Text>
                    </TouchableOpacity>
                    <Text style={styles.textoLogin}>
                        ¿Ya tienes cuenta?{' '}
                        <Text style={styles.linkLogin} onPress={() => navigation.navigate('actInicioSesion')}>
                            Inicia sesión aquí.
                        </Text>
                    </Text>
                </Animated.View>
            </View>
        );
    }

    if (pantallaInterna === 'generar_qr') return <GenerarQR onVolver={() => setPantallaInterna('menu')} />;
    if (pantallaInterna === 'registrar_lote') return <RegistrarLoteAnimal onVolver={() => setPantallaInterna('menu')} />;
    if (pantallaInterna === 'mis_lotes') return <MisLotes onVolver={() => setPantallaInterna('menu')} />;
    if (pantallaInterna === 'sucursales') return <ActGestionSucursales onVolver={() => setPantallaInterna('menu')} />;

    const lotesActivos = lotes.filter(lote => lote.estado === 'activo');
    const lotesCaducados = lotes.filter((lote) => {
        const dias = diasParaVencer(lote.fecha_vencimiento);
        return lote.estado === 'caducado' || (lote.estado === 'activo' && dias !== null && dias < 0);
    });

    const porVencer = lotes.filter((lote) => {
        const dias = diasParaVencer(lote.fecha_vencimiento);
        return lote.estado === 'activo' && dias !== null && dias >= 0 && dias <= 3;
    });

    return (
        <ScrollView 
            style={styles.contenedorAdmin} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl 
                    refreshing={refrescando} 
                    onRefresh={alArrastrarParaActualizar} 
                    colors={[COLORS.rojoIntenso]} 
                />
            }
        >
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.blancoPuro} />
            
            {/* ENCABEZADO CON SELECTOR DE SUCURSAL MÁS GRANDE */}
            <View style={styles.headerDashboard}>
                <Text style={styles.bienvenidaAdmin}>
                    Hola, <Text style={{ fontWeight: 'bold' }}>{usuario?.nombre || 'Usuario'}</Text>
                </Text>

                <TouchableOpacity 
                    style={styles.selectorSucursalBotonGrande} 
                    onPress={() => setModalSucursalesVisible(true)}
                >
                    <View style={styles.iconoBotonSucursal}>
                        <Ionicons name="business" size={20} color={COLORS.blancoPuro} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.subtituloSucursalBoton}>SUCURSAL ACTIVA</Text>
                        <Text style={styles.selectorSucursalTextoGrande} numberOfLines={1}>
                            {sucursalActiva ? sucursalActiva.nombre_sucursal : 'Cargando sucursal...'}
                        </Text>
                    </View>
                    {sucursalActiva?.estatus_verificacion === 'aprobado' && (
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginRight: 5 }} />
                    )}
                    <Ionicons name="chevron-down" size={20} color={COLORS.azulMarino} />
                </TouchableOpacity>
            </View>

            {/* ALERTA CRÍTICA: CARNE CADUCADA */}
            {lotesCaducados.length > 0 && (
                <TouchableOpacity style={styles.tarjetaAlertaCritica} onPress={() => setPantallaInterna('mis_lotes')}>
                    <View style={styles.alertaIconoCritico}>
                        <Ionicons name="alert-circle" size={24} color="white" />
                    </View>
                    <View style={styles.alertaTextoContainer}>
                        <Text style={styles.alertaTituloCritico}>¡Acción Requerida!</Text>
                        <Text style={styles.alertaSubtituloCritico}>
                            Tienes {lotesCaducados.length} lote(s) caducado(s) en esta sucursal.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.rojoIntenso} />
                </TouchableOpacity>
            )}

            {/* ALERTA PREVENTIVA: CARNE POR VENCER */}
            {porVencer.length > 0 && (
                <TouchableOpacity style={styles.tarjetaAlerta} onPress={() => setPantallaInterna('mis_lotes')}>
                    <View style={styles.alertaIconoContainer}>
                        <Ionicons name="warning" size={24} color="white" />
                    </View>
                    <View style={styles.alertaTextoContainer}>
                        <Text style={styles.alertaTitulo}>Carne por vencer</Text>
                        <Text style={styles.alertaSubtitulo}>
                            {porVencer.length} lote(s) vence(n) en los próximos 3 días.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ea580c" />
                </TouchableOpacity>
            )}

            <Text style={styles.preguntaSeccion}>¿Qué deseas hacer?</Text>

            <View style={styles.gridMenu}>
                <TouchableOpacity style={styles.tarjetaMenu} onPress={() => setPantallaInterna('registrar_lote')}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#ffe4e6' }]}>
                        <Ionicons name="add" size={28} color="#f43f5e" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Registrar carne</Text>
                    <Text style={styles.tarjetaSubtitulo}>Entrada nueva de lote</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tarjetaMenu} onPress={() => setPantallaInterna('generar_qr')}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#f1f5f9' }]}>
                        <Ionicons name="qr-code" size={24} color="#475569" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Hacer código QR</Text>
                    <Text style={styles.tarjetaSubtitulo}>Generar código QR e imprimir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tarjetaMenu}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="people" size={24} color="#16a34a" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Mis empleados</Text>
                    <Text style={styles.tarjetaSubtitulo}>Gestionar accesos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tarjetaMenu} onPress={() => setPantallaInterna('sucursales')}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#e0f2fe' }]}>
                        <Ionicons name="business" size={24} color="#0284c7" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Mis sucursales</Text>
                    <Text style={styles.tarjetaSubtitulo}>Alta y verificación COFEPRIS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tarjetaMenu} onPress={() => setPantallaInterna('mis_lotes')}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#fef9c3' }]}>
                        <Ionicons name="clipboard" size={24} color="#ca8a04" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Ver lotes</Text>
                    <Text style={styles.tarjetaSubtitulo}>Inventario por estado</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.preguntaSeccion}>Resumen de Inventario ({sucursalActiva?.nombre_sucursal || 'Sucursal'})</Text>

            <View style={styles.gridKpis}>
                <TouchableOpacity style={styles.tarjetaKpi} onPress={() => setPantallaInterna('mis_lotes')}>
                    <Text style={styles.kpiNumero}>{lotesActivos.length}</Text>
                    <Text style={styles.kpiLabel}>Lotes disponibles</Text>
                    <Text style={[styles.kpiEstado, { color: '#10b981' }]}>Ver stock activo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tarjetaKpi} onPress={() => setPantallaInterna('mis_lotes')}>
                    <Text style={[styles.kpiNumero, { color: '#dc2626' }]}>{lotesCaducados.length + porVencer.length}</Text>
                    <Text style={styles.kpiLabel}>Alertas sanitarias</Text>
                    <Text style={[styles.kpiEstado, { color: '#dc2626' }]}>Revisar conservación</Text>
                </TouchableOpacity>
            </View>

            {/* MODAL SELECCIONAR SUCURSAL */}
            <Modal visible={modalSucursalesVisible} transparent animationType="fade">
                <View style={styles.modalFondo}>
                    <View style={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Cambiar de Sucursal</Text>
                            <TouchableOpacity onPress={() => setModalSucursalesVisible(false)}>
                                <Ionicons name="close" size={22} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        {cargandoSucursales ? (
                            <ActivityIndicator color={COLORS.azulMarino} style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 280 }}>
                                {sucursales.map((suc) => (
                                    <TouchableOpacity
                                        key={suc.id_negocio}
                                        style={[
                                            styles.opcionSucursal,
                                            sucursalActiva?.id_negocio === suc.id_negocio && styles.opcionSucursalActiva
                                        ]}
                                        onPress={() => {
                                            setSucursalActiva(suc);
                                            setModalSucursalesVisible(false);
                                        }}
                                    >
                                        <Ionicons 
                                            name="business" 
                                            size={22} 
                                            color={sucursalActiva?.id_negocio === suc.id_negocio ? COLORS.blancoPuro : COLORS.azulMarino} 
                                        />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[
                                                    styles.textoOpSucursal,
                                                    sucursalActiva?.id_negocio === suc.id_negocio && styles.textoOpSucursalActiva
                                                ]}>
                                                    {suc.nombre_sucursal}
                                                </Text>
                                                {suc.estatus_verificacion === 'aprobado' && (
                                                    <Ionicons name="checkmark-circle" size={16} color={sucursalActiva?.id_negocio === suc.id_negocio ? '#34d399' : '#10b981'} />
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.subtextoOpSucursal,
                                                sucursalActiva?.id_negocio === suc.id_negocio && { color: '#e2e8f0' }
                                            ]}>
                                                {suc.direccion}
                                            </Text>
                                        </View>
                                        {sucursalActiva?.id_negocio === suc.id_negocio && (
                                            <Ionicons name="radio-button-on" size={20} color={COLORS.blancoPuro} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedorInvitacion: { flex: 1, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    tituloInvitacion: { color: COLORS.blancoPuro, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, textAlign: 'center', marginBottom: 40 },
    iconoCuadrado: { width: 300, height: 300, borderRadius: 10, marginBottom: 40, backgroundColor: COLORS.blancoPuro, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    descripcionInvitacion: { color: '#e2e8f0', fontSize: SIZES.textoBase, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 10 },
    botonRegistrar: { backgroundColor: COLORS.rojoIntenso, width: '100%', paddingVertical: 15, borderRadius: SIZES.radioBoton, alignItems: 'center', marginBottom: 25 },
    textoBotonRegistrar: { color: COLORS.blancoPuro, fontSize: SIZES.textoBase, fontWeight: FONTS.bold },
    textoLogin: { color: COLORS.blancoPuro, fontSize: 15 },
    linkLogin: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, textDecorationLine: 'underline' },
    
    contenedorAdmin: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    headerDashboard: { marginBottom: 15 },
    bienvenidaAdmin: { fontSize: 18, color: '#1e293b', marginBottom: 8 },
    
    // BOTÓN SELECTOR DE SUCURSAL MÁS GRANDE Y CÓMODO
    selectorSucursalBotonGrande: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8fafc', 
        paddingHorizontal: 14, 
        paddingVertical: 12, 
        borderRadius: SIZES.radioTarjeta, 
        borderWidth: 1.5, 
        borderColor: '#cbd5e1',
        gap: 12 
    },
    iconoBotonSucursal: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center' },
    subtituloSucursalBoton: { fontSize: 10, fontWeight: FONTS.bold, color: '#64748b', letterSpacing: 0.5 },
    selectorSucursalTextoGrande: { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.azulMarino },

    tarjetaAlerta: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: SIZES.radioTarjeta, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    alertaIconoContainer: { backgroundColor: '#ea580c', padding: 8, borderRadius: SIZES.radioBoton, marginRight: 12 },
    alertaTitulo: { fontSize: 15, fontWeight: FONTS.bold, color: '#9a3412' },
    alertaSubtitulo: { fontSize: 13, color: '#ea580c', marginTop: 2 },

    tarjetaAlertaCritica: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: SIZES.radioTarjeta, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    alertaIconoCritico: { backgroundColor: COLORS.rojoIntenso, padding: 8, borderRadius: SIZES.radioBoton, marginRight: 12 },
    alertaTituloCritico: { fontSize: 15, fontWeight: FONTS.bold, color: '#991b1b' },
    alertaSubtituloCritico: { fontSize: 13, color: COLORS.rojoIntenso, marginTop: 2 },
    
    alertaTextoContainer: { flex: 1 },
    
    preguntaSeccion: { fontSize: SIZES.tituloSeccion + 2, fontWeight: FONTS.bold, color: '#64748b', marginVertical: 12 },
    gridMenu: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 15 },
    tarjetaMenu: { backgroundColor: COLORS.blancoPuro, width: '48%', borderRadius: SIZES.radioTarjeta, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    iconoFondo: { width: 44, height: 44, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    tarjetaTitulo: { fontSize: 14, fontWeight: FONTS.bold, color: '#0f172a' },
    tarjetaSubtitulo: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    
    gridKpis: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    tarjetaKpi: { backgroundColor: COLORS.blancoPuro, width: '48%', borderRadius: SIZES.radioTarjeta, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    kpiNumero: { fontSize: SIZES.kpi, fontWeight: FONTS.bold, color: '#0f172a' },
    kpiLabel: { fontSize: SIZES.textoSecundario, color: '#64748b', marginTop: 2 },
    kpiEstado: { fontSize: 11, fontWeight: FONTS.bold, marginTop: 4 },

    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
    modalContenido: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitulo: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.azulMarino },
    opcionSucursal: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
    opcionSucursalActiva: { backgroundColor: COLORS.azulMarino, borderColor: COLORS.azulMarino },
    textoOpSucursal: { fontSize: 14, fontWeight: FONTS.bold, color: '#0f172a' },
    textoOpSucursalActiva: { color: COLORS.blancoPuro },
    subtextoOpSucursal: { fontSize: 12, color: '#64748b' }
});