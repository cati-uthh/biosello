import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View, Image, StyleSheet, Text, TouchableOpacity, ScrollView, StatusBar, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GenerarQR from './generarQR';
import RegistrarLoteAnimal from './RegistrarLoteAnimal';
import MisLotes from './MisLotes';
import { AuthContext } from './AuthContext'; // Importamos el contexto

export default function InicioScreen({ navigation }) {
    // Usamos el contexto para obtener el estado y la función para cambiarlo
    const { sesionActiva, setSesionActiva } = useContext(AuthContext); 
    const [pantallaInterna, setPantallaInterna] = useState('menu');

    // 1. Referencias de animación para cada elemento
    const fadeTitulo = useRef(new Animated.Value(0)).current;
    const fadeIcono = useRef(new Animated.Value(0)).current;
    const fadeTexto = useRef(new Animated.Value(0)).current;
    const fadeBotones = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Solo animamos si estamos en la pantalla de bienvenida
        if (!sesionActiva) {
            // Animated.stagger hace que las animaciones arranquen en cascada (cada 200ms)
            Animated.stagger(200, [
                Animated.timing(fadeTitulo, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeIcono, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeTexto, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(fadeBotones, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]).start();
        }
    }, [sesionActiva]);

    // VISTA A: USUARIO NO REGISTRADO (Diseño Animado con Ícono 1:1)
    if (!sesionActiva) {
        return (
            <View style={styles.contenedorInvitacion}>
                <StatusBar barStyle="light-content" backgroundColor="#041E3A" />
                <Animated.View style={{ opacity: fadeTitulo }}><Text style={styles.tituloInvitacion}>Toma el control de tu inventario</Text></Animated.View>
                <Animated.View style={{ opacity: fadeIcono }}>
                    <Image source={require('./assets/icon.png')} style={styles.iconoCuadrado} resizeMode="cover" />
                </Animated.View>
                <Animated.View style={{ opacity: fadeTexto }}><Text style={styles.descripcionInvitacion}>Registra tus lotes, monitorea la cadena de frío y genera códigos QR de trazabilidad.</Text></Animated.View>
                
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
    
    // --- VISTA B: DASHBOARD ADMINISTRADOR ---
    if (pantallaInterna === 'generar_qr') return <GenerarQR onVolver={() => setPantallaInterna('menu')} />;
    if (pantallaInterna === 'registrar_lote') return <RegistrarLoteAnimal onVolver={() => setPantallaInterna('menu')} />;
    if (pantallaInterna === 'mis_lotes') return <MisLotes onVolver={() => setPantallaInterna('menu')} />;

    return (
        <ScrollView style={styles.contenedorAdmin} showsVerticalScrollIndicator={false}>
            
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <Text style={styles.bienvenidaAdmin}>Bienvenido al Sistema <Text style={{ fontWeight: 'bold' }}>[Usuario]</Text></Text>

            <View style={styles.tarjetaAlerta}>
                <View style={styles.alertaIconoContainer}>
                    <Ionicons name="warning" size={24} color="white" />
                </View>
                <View style={styles.alertaTextoContainer}>
                    <Text style={styles.alertaTitulo}>¡Carne por vencer!</Text>
                    <Text style={styles.alertaSubtitulo}>Res molida - vence mañana</Text>
                </View>
            </View>

            <Text style={styles.preguntaSeccion}>¿Que desea hacer?</Text>

            <View style={styles.gridMenu}>
                <TouchableOpacity
                    style={styles.tarjetaMenu}
                    onPress={() => setPantallaInterna('registrar_lote')}
                >
                    <View style={[styles.iconoFondo, { backgroundColor: '#ffe4e6' }]}>
                        <Ionicons name="add" size={28} color="#f43f5e" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Registrar carne</Text>
                    <Text style={styles.tarjetaSubtitulo}>Entrada nueva de lote</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tarjetaMenu}
                    onPress={() => setPantallaInterna('generar_qr')}
                >
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

                <TouchableOpacity
                    style={styles.tarjetaMenu}
                    onPress={() => setPantallaInterna('mis_lotes')}
                >
                    <View style={[styles.iconoFondo, { backgroundColor: '#fef9c3' }]}>
                        <Ionicons name="clipboard" size={24} color="#ca8a04" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Ver lotes</Text>
                    <Text style={styles.tarjetaSubtitulo}>Inventario por especie</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.preguntaSeccion}>Mis Lotes:</Text>

            <View style={styles.gridKpis}>
                <TouchableOpacity style={styles.tarjetaKpi} onPress={() => setPantallaInterna('mis_lotes')}>
                    <Text style={styles.kpiNumero}>14</Text>
                    <Text style={styles.kpiLabel}>Lotes de carne</Text>
                    <Text style={[styles.kpiEstado, { color: '#10b981' }]}>Ver inventario</Text>
                </TouchableOpacity>

                <View style={styles.tarjetaKpi}>
                    <Text style={[styles.kpiNumero, { color: '#dc2626' }]}>2</Text>
                    <Text style={styles.kpiLabel}>Por vencer pronto</Text>
                    <Text style={[styles.kpiEstado, { color: '#dc2626' }]}>Atender calidad</Text>
                </View>
            </View>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // --- ESTILOS VISTA A ---
    contenedorInvitacion: {
        flex: 1,
        backgroundColor: '#041E3A',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    tituloInvitacion: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
    },
    // NUEVO ESTILO: Ícono 1:1 con bordes redondeados
    iconoCuadrado: {
        width: 300, // Tamaño del ancho
        height: 300, // Exactamente el mismo tamaño para que sea 1:1
        borderRadius: 10, // Curvatura estilo iOS (25% del tamaño aprox)
        marginBottom: 40,
        backgroundColor: '#FFFFFF', // Fondo blanco por si la imagen tiene transparencias
        // Sombra sutil para darle profundidad
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8, 
    },
    descripcionInvitacion: {
        color: '#e2e8f0',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    botonRegistrar: {
        backgroundColor: '#D32F2F',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 25,
    },
    textoBotonRegistrar: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textoLogin: {
        color: '#ffffff',
        fontSize: 15,
    },
    linkLogin: {
        color: '#ffffff',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },

    // --- ESTILOS VISTA B (Mantenidos igual) ---
    contenedorAdmin: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    bienvenidaAdmin: {
        fontSize: 20,
        color: '#1e293b',
        marginBottom: 15,
    },
    tarjetaAlerta: {
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#ffe4e6',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    alertaIconoContainer: {
        backgroundColor: '#ef4444',
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    alertaTextoContainer: {
        flex: 1,
    },
    alertaTitulo: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    alertaSubtitulo: {
        fontSize: 13,
        color: '#dc2626',
        marginTop: 2,
    },
    preguntaSeccion: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#64748b',
        marginVertical: 12,
    },
    gridMenu: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 15,
    },
    tarjetaMenu: {
        backgroundColor: '#ffffff',
        width: '48%',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    iconoFondo: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    tarjetaTitulo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    tarjetaSubtitulo: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
    gridKpis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    tarjetaKpi: {
        backgroundColor: '#ffffff',
        width: '48%',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    kpiNumero: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    kpiLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    kpiEstado: {
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 4,
    }
});