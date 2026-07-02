import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { COLORS, SIZES, FONTS } from './src/theme/theme';

export default function EscanerQR({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    // Verificamos el estado del permiso al cargar
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') {
         setHasPermission(true);
      } else {
         // Si no tiene permiso, mostramos el modal que diseñaste
         setShowPermissionModal(true);
      }
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setShowPermissionModal(false);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    alert(`Código escaneado: ${data}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Coloque el código QR en el cuadro{'\n'}para escanear
      </Text>

      {/* Contenedor del escáner con el marco visual */}
      <View style={styles.scannerWrapper}>
         {hasPermission ? (
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              style={styles.camera}
            />
         ) : (
            <View style={styles.cameraPlaceholder} />
         )}
         
         
      </View>

      <Text style={styles.helpText}>¿No detecta el código QR?</Text>
      
      <TouchableOpacity 
        style={styles.manualButton} 
        onPress={() => navigation.navigate('IngresoManual')}
      >
        <Text style={styles.manualButtonText}>Ingresar manualmente</Text>
      </TouchableOpacity>

      {scanned && (
         <TouchableOpacity style={[styles.manualButton, {marginTop: 10, backgroundColor: '#003366'}]} onPress={() => setScanned(false)}>
            <Text style={styles.manualButtonText}>Escanear de nuevo</Text>
         </TouchableOpacity>
      )}

      {/* Modal de Permisos (Imita el primer modal de tu diseño) */}
      <Modal visible={showPermissionModal} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Permisos de camara</Text>
            <Text style={styles.modalText}>Necesitamos acceder a tu cámara para poder escanear el código QR.</Text>
            <TouchableOpacity onPress={requestPermission}>
              <Text style={styles.modalActionText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blancoPuro, alignItems: 'center', paddingTop: 40 },
  instructionText: { fontSize: SIZES.textoBase, textAlign: 'center', fontWeight: FONTS.bold, marginBottom: 30 },
  scannerWrapper: { width: 250, height: 250, overflow: 'hidden', borderRadius: SIZES.radioTarjeta, marginBottom: 40, backgroundColor: '#f0f0f0' },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, backgroundColor: '#E8E8E8' },
  helpText: { fontSize: 14, fontWeight: FONTS.bold, marginBottom: 10 },
  manualButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 12, paddingHorizontal: 30, borderRadius: SIZES.radioBoton, width: '80%', alignItems: 'center' },
  manualButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: SIZES.radioTarjeta, width: '80%' },
  modalTitle: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10, color: COLORS.azulMarino },
  modalText: { fontSize: 14, marginBottom: 20 },
  modalActionText: { color: COLORS.azulMarino, fontWeight: FONTS.bold, textAlign: 'right' }
});