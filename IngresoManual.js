import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function IngresoManual() {
  const [codigo, setCodigo] = useState('');

  const handleBuscar = () => {
    if (codigo.trim() === '') {
      alert('Por favor, ingrese un número válido.');
      return;
    }
    // Aquí se conectará posteriormente con la base de datos de Biosello
    alert(`Buscando lote de carne con código: ${codigo}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Coloque el número de código QR{'\n'}en el cuadro para escanear
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ingrese aquí el número"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={codigo}
        onChangeText={setCodigo}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleBuscar}>
        <Text style={styles.buttonText}>Buscar</Text>
      </TouchableOpacity>

      <Image
        source={require('./assets/ayuda-qr.png')} 
        style={styles.helpImage}
        resizeMode="contain"
      />

      <Text style={styles.helpText}>
        El numero se encuentra en la parte inferior{'\n'}del código QR
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 50, // Ajusta este valor para bajar o subir todo el bloque
    paddingHorizontal: 30, // Márgenes laterales
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#999', // Borde gris claro como en tu diseño
    borderWidth: 1,
    borderRadius: 5, // Bordes ligeramente redondeados
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
    backgroundColor: '#FFF',
  },
  primaryButton: {
    backgroundColor: '#D32F2F', // El rojo institucional
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40, // Separación entre el botón y la imagen de abajo
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  helpImage: {
    width: 250,
    height: 200,
    marginBottom: 15,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20, // Mejora el espaciado entre las dos líneas de texto
  },
});