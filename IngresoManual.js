import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS, SIZES, FONTS } from './src/theme/theme';


export default function IngresoManual() {
  const [codigo, setCodigo] = useState('');

  const handleBuscar = () => {
    if (codigo.trim() === '') {
      alert('Por favor, ingrese un número válido.');
      return;
    }
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
  container: { flex: 1, backgroundColor: COLORS.blancoPuro, alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  title: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#000', textAlign: 'center', marginBottom: 20 },
  input: { width: '100%', height: 50, borderColor: '#999', borderWidth: 1, borderRadius: SIZES.radioInput, paddingHorizontal: 15, fontSize: SIZES.textoBase, marginBottom: 20, color: '#000', backgroundColor: COLORS.blancoPuro },
  primaryButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 12, borderRadius: SIZES.radioBoton, width: '100%', alignItems: 'center', marginBottom: 40 },
  buttonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  helpImage: { width: 250, height: 200, marginBottom: 15 },
  helpText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '600', lineHeight: 20 },
});