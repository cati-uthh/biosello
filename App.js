import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Para los íconos
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SplashScreen from './SplashScreen';
import EscanerQR from './EscanerQR';
import InicioScreen from './inicio';

// Pantallas temporales (placeholders) para Inicio y Cuenta
function CuentaScreen() { return <View style={{ flex: 1, backgroundColor: 'white' }} /> }

const Tab = createBottomTabNavigator();

function CustomHeader() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('./assets/fondo-header.png')}
      style={[styles.headerBackground, { paddingTop: insets.top }]}
      resizeMode="cover"
    >
      <Image
        source={require('./assets/logo-oficial.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
    </ImageBackground>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(false);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // Configuración de los íconos de la barra inferior
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Inicio') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Escanear QR') {
              iconName = focused ? 'scan' : 'scan-outline'; // O 'camera' / 'camera-outline'
            } else if (route.name === 'Cuenta') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#003366', // Color azul oscuro para el tab activo (ajusta según tu Figma)
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#F3E5F5', // Color de fondo lila claro de tu diseño
            paddingBottom: 5,
            height: 60,
          },
          // Aquí le decimos que use nuestro Header personalizado en todas las pantallas
          header: () => sesionActiva ? <CustomHeader /> : null,
        })}
      >
        <Tab.Screen name="Inicio">
          {(props) => (
            <InicioScreen
              {...props}
              sesionActiva={sesionActiva}
              alIniciarSesion={() => setSesionActiva(true)}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Escanear QR" component={EscanerQR} />
        <Tab.Screen name="Cuenta" component={CuentaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    height: 100,
    justifyContent: 'center', // Centra el logo verticalmente en el espacio disponible
    alignItems: 'center', // Centra el logo horizontalmente
  },
  headerLogo: {
    width: 200, // Ajusta si el logo se ve muy pequeño o muy grande
    height: 50,
  },
});