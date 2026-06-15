import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    // Simulamos el tiempo de carga (ej. 3 segundos) antes de pasar al escáner
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);
    
    // Limpiamos el temporizador si el componente se desmonta
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Aquí luego podrás agregar el logotipo de Biosello que exportes de Figma usando el componente <Image> */}
      <Text style={styles.title}>Biosello</Text>
      <Text style={styles.subtitle}>Trazabilidad de confianza</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4CAF50', // Puedes cambiar esto por el color hexadecimal de tu diseño en Figma
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  }
});