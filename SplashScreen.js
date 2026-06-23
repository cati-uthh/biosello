import React, { useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    Image, 
    StyleSheet, 
    Animated, 
    Easing, 
    StatusBar,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Convertimos el componente de degradado en uno animable
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const loaderSpinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Fade In del logo
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // 2. Oleaje de degradados oscuros
        Animated.timing(waveAnim, {
            toValue: 1,
            duration: 3500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        // 3. Spinner constante
        Animated.loop(
            Animated.timing(loaderSpinAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        const timer = setTimeout(() => {
            if (onFinish) onFinish();
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    // Interpolaciones de movimiento
    const translateY1 = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [height * 0.2, -height * 0.1]
    });
    
    const translateX2 = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width * 0.2]
    });
    
    const translateY3 = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [height, height * 0.4]
    });

    const loaderSpin = loaderSpinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* --- FONDO DE DEGRADADOS OSCUROS --- */}
            <View style={styles.waveBackground}>
                {/* Ola 1: Azul Profundo (Viene de abajo hacia arriba) */}
                <AnimatedGradient
                    colors={['rgba(0, 51, 102, 0.8)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.wave, 
                        { transform: [{ translateY: translateY1 }, { rotate: '25deg' }] }
                    ]}
                />
                
                {/* Ola 2: Azul Institucional (Cruza en diagonal) */}
                <AnimatedGradient
                    colors={['rgba(4, 30, 58, 0.9)', 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[
                        styles.wave, 
                        { transform: [{ translateX: translateX2 }, { rotate: '-15deg' }] }
                    ]}
                />
                
                {/* Ola 3: Azul Noche (Sube suavemente desde el fondo) */}
                <AnimatedGradient
                    colors={['rgba(2, 12, 23, 0.95)', 'transparent']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                        styles.wave, 
                        { transform: [{ translateY: translateY3 }, { rotate: '45deg' }] }
                    ]}
                />
            </View>

            {/* --- CONTENIDO FRONTAL --- */}
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                
                <View style={styles.logoContainer}>
                    <Image
                        source={require('./assets/icon-clean-background.png')} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.loadingContainer}>
                    <Animated.View style={[styles.simpleSpinner, { transform: [{ rotate: loaderSpin }] }]} />
                    <Text style={styles.loadingText}>Cargando...</Text>
                </View>

            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#010810', // Fondo base casi negro para que los degradados resalten
    },
    waveBackground: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        overflow: 'hidden',
        zIndex: 0,
    },
    wave: {
        position: 'absolute',
        width: width * 2, // Extra grande para que el degradado sea larguísimo
        height: height * 1.5, 
        opacity: 0.7, // Se mezclan los tonos oscuros de forma elegante
    },
    content: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        zIndex: 1,
    },
    logoContainer: {
        flex: 1, // Toma todo el espacio disponible en el centro
        justifyContent: 'center', // Centra el logo verticalmente
        width: '75%', 
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: 250, 
    },
    loadingContainer: {
        alignItems: 'center',
        marginBottom: 60, // Margen exacto desde la base del teléfono
    },
    simpleSpinner: {
        width: 45,
        height: 45,
        borderRadius: 25,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.05)', // Más sutil para combinar con el fondo oscuro
        borderTopColor: '#FFFFFF',
        marginBottom: 20,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 1.5,
    }
});