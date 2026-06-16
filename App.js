import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SplashScreen from './SplashScreen';
import EscanerQR from './EscanerQR';
import InicioScreen from './inicio'; 
import IngresoManual from './IngresoManual';

function CuentaScreen() { return <View style={{ flex: 1, backgroundColor: 'white' }} /> }

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator(); 

// Este componente agrupa el Escáner y el Ingreso Manual dentro de la misma pestaña
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
        <Tab.Screen name="Escanear QR" component={EscanerStackScreen} />
        <Tab.Screen name="Cuenta" component={CuentaScreen} />
      </Tab.Navigator>
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