import React, { useContext, useState } from 'react';
import { Image, ImageBackground, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SplashScreen from '../screens/inicio/SplashScreen';
import EscanerQR from '../screens/trazabilidad/EscanerQRScreen';
import InicioScreen from '../screens/inicio/InicioScreen';
import IngresoManual from '../screens/trazabilidad/IngresoManualScreen';
import CuentaScreen from '../screens/cuenta/CuentaScreen';
import ActRegistroNegocio from '../screens/autenticacion/RegistrarNegocioScreen';
import ActInicioSesion from '../screens/autenticacion/IniciarSesionScreen';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const cargarPantallaRealidadAumentada = () => require('../features/realidadAumentada/screens/RealidadAumentadaScreen').default;

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
      source={require('../../assets/fondo-header.png')}
      style={[styles.headerBackground, { paddingTop: insets.top }]}
      resizeMode="cover"
    >
      <Image
        source={require('../../assets/logo-oficial.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
    </ImageBackground>
  );
}

function MainTabs() {
  const { sesionActiva } = useContext(AuthContext);

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'home-outline';
          if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Escanear QR') iconName = focused ? 'scan' : 'scan-outline';
          if (route.name === 'Cuenta') iconName = focused ? 'person' : 'person-outline';
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
        headerShown: route.name === 'Inicio' ? sesionActiva : true,
      })}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} />
      <Tab.Screen name="Escanear QR" component={EscanerStackScreen} />
      <Tab.Screen name="Cuenta" component={CuentaScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const { sesionCargando } = useContext(AuthContext);

  if (isLoading || sesionCargando) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MainTabs">
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="actRegistroNegocio"
          component={ActRegistroNegocio}
          options={{
            headerShown: true,
            title: 'Registro de Negocio',
            headerStyle: { backgroundColor: COLORS.azulMarino },
            headerTintColor: COLORS.blancoPuro,
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen
          name="actInicioSesion"
          component={ActInicioSesion}
          options={{
            headerShown: true,
            title: 'Iniciar Sesión',
            headerStyle: { backgroundColor: COLORS.azulMarino },
            headerTintColor: COLORS.blancoPuro,
            headerBackTitleVisible: false
          }}
        />
        <Stack.Screen
          name="RealidadAumentada"
          getComponent={cargarPantallaRealidadAumentada}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
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
