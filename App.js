import React, { useState, useContext } from 'react'; // <-- Añadido useContext
import { View, Image, StyleSheet, ImageBackground, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SplashScreen from './SplashScreen';
import EscanerQR from './EscanerQR';
import InicioScreen from './inicio';
import IngresoManual from './IngresoManual';

import ActRegistroNegocio from './actRegistroNegocio';
import ActInicioSesion from './ActInicioSesion';
import { AuthProvider, AuthContext } from './AuthContext'; // <-- Importamos AuthContext

function CuentaScreen() { return <View style={{ flex: 1, backgroundColor: 'white' }} /> }

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function EscanerStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EscanerPrincipal" component={EscanerQR} />
      <Stack.Screen name="IngresoManual" component={IngresoManual} />
    </Stack.Navigator>
  );
}

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

// 2. ENCAPSULAMOS TUS PESTAÑAS EN UN COMPONENTE SEPARADO
function MainTabs() {
  // Ahora MainTabs lee la sesión real directamente del contexto
  const { sesionActiva } = useContext(AuthContext); 

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Escanear QR') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Cuenta') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#003366',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#F3E5F5',
          paddingBottom: 5,
          height: 60,
        },
        header: () => <CustomHeader />,
        // Si estamos en Inicio Y NO hay sesión, lo oculta. En cualquier otro caso, lo muestra.
        headerShown: route.name === 'Inicio' ? sesionActiva : true,
      })}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} />
      <Tab.Screen name="Escanear QR" component={EscanerStackScreen} />
      <Tab.Screen name="Cuenta" component={CuentaScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
      <Stack.Navigator initialRouteName="MainTabs">
        
        {/* Usamos component={} de manera limpia */}
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

        {/* --- PANTALLAS DE AUTENTICACIÓN (A Pantalla Completa) --- */}
        <Stack.Screen
          name="actRegistroNegocio"
          component={ActRegistroNegocio}
          options={{
            headerShown: true,
            title: 'Registro de Negocio',
            headerStyle: { backgroundColor: '#041E3A' }, // Fondo azul institucional BioSello
            headerTintColor: '#ffffff', // Flecha blanca
            headerBackTitleVisible: false // Quita el texto feo de "Atrás" en iOS
          }}
        />

        <Stack.Screen
          name="actInicioSesion"
          component={ActInicioSesion}
          options={{
            headerShown: true,
            title: 'Iniciar Sesión',
            headerStyle: { backgroundColor: '#041E3A' },
            headerTintColor: '#ffffff',
            headerBackTitleVisible: false
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 200,
    height: 50,
  },
});