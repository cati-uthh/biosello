import React, { useState } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GenerarQR from './generarQR';

export default function InicioScreen({ sesionActiva, alIniciarSesion }) {

    const [pantallaInterna, setPantallaInterna] = useState('menu');

    if (!sesionActiva) {
        return (
            <View style={styles.contenedorInvitacion}>
                <StatusBar barStyle="light-content" backgroundColor="#002855" />

                <Image
                    source={require('./assets/logo-oficial.png')}
                    style={styles.logoInvitacion}
                    resizeMode="contain"
                />

                <Text style={styles.eslogan}>Transparencia del campo a la mesa.</Text>

                <Text style={styles.tituloInvitacion}>Toma el control de tu inventario</Text>

                <Image
                    source={require('./assets/add-register.jpeg')}
                    style={styles.ilustracion}
                    resizeMode="contain"
                />

                <Text style={styles.descripcionInvitacion}>
                    Registra tus lotes, monitorea la cadena de frío y genera códigos QR
                    de trazabilidad para dar confianza a tus clientes.
                </Text>

                <TouchableOpacity style={styles.botonRegistrar} onPress={alIniciarSesion}>
                    <Text style={styles.textoBotonRegistrar}>Registrar mi Negocio</Text>
                </TouchableOpacity>

                <Text style={styles.textoLogin}>
                    ¿Ya tienes cuenta? <Text style={styles.linkLogin}>Inicia sesión aquí.</Text>
                </Text>
            </View>
        );
    }
    if (pantallaInterna === 'generar_qr') {
        return (
            <GenerarQR onVolver={() => setPantallaInterna('menu')} />
        );
    }

    return (
        <ScrollView style={styles.contenedorAdmin} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <Text style={styles.bienvenidaAdmin}>Bienvenido: <Text style={{ fontWeight: 'bold' }}>[Usuario]</Text></Text>

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
                <TouchableOpacity style={styles.tarjetaMenu}>
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

                <TouchableOpacity style={styles.tarjetaMenu}>
                    <View style={[styles.iconoFondo, { backgroundColor: '#fef9c3' }]}>
                        <Ionicons name="clipboard" size={24} color="#ca8a04" />
                    </View>
                    <Text style={styles.tarjetaTitulo}>Ver reportes</Text>
                    <Text style={styles.tarjetaSubtitulo}>Inventario y caducidad</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.preguntaSeccion}>Mis Lotes:</Text>

            <View style={styles.gridKpis}>
                <View style={styles.tarjetaKpi}>
                    <Text style={styles.kpiNumero}>14</Text>
                    <Text style={styles.kpiLabel}>Lotes de carne</Text>
                    <Text style={[styles.kpiEstado, { color: '#10b981' }]}>Excelente calidad!</Text>
                </View>

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
    contenedorInvitacion: {
        flex: 1,
        backgroundColor: '#002855',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    logoInvitacion: {
        width: 160,
        height: 45,
        marginBottom: 5,
    },
    eslogan: {
        color: '#38bdf8',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 30,
    },
    tituloInvitacion: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    ilustracion: {
        width: '85%',
        height: 200,
        marginBottom: 25,
    },
    descripcionInvitacion: {
        color: '#e2e8f0',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 35,
    },
    botonRegistrar: {
        backgroundColor: '#cc0033',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    textoBotonRegistrar: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textoLogin: {
        color: '#ffffff',
        fontSize: 14,
    },
    linkLogin: {
        color: '#38bdf8',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
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