import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { extraerIdentificadorQR } from './src/utils/qr';

export default function EscanerQR({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
      } else {
         setShowPermissionModal(true);
      }
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setShowPermissionModal(false);
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);

    const identificador = extraerIdentificadorQR(data);
    const idExtraido = identificador?.idLote || identificador?.codigoLote || data;

    navigation.navigate('IngresoManual', {
      codigoQR: idExtraido,
      origenConsulta: 'qr'
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Coloque el código QR en el cuadro{'\n'}para escanear
      </Text>

      <View style={styles.scannerWrapper}>
         {hasPermission ? (
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              style={styles.camera}
            />
         ) : (
            <View style={styles.cameraPlaceholder}>
              <TouchableOpacity
                style={styles.retryCameraButton}
                onPress={() => setShowPermissionModal(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Activar cámara"
              >
                <Text style={styles.retryCameraText}>Activar cámara</Text>
              </TouchableOpacity>
            </View>
         )}
      </View>

      <Text style={styles.helpText}>¿No detecta el código QR?</Text>
      
      {/* Botón manual mandando el parámetro vacío */}
      <TouchableOpacity 
        style={styles.manualButton} 
        onPress={() => navigation.navigate('IngresoManual', {
          codigoQR: '',
          origenConsulta: 'manual'
        })}
      >
        <Text style={styles.manualButtonText}>Ingresar manualmente</Text>
      </TouchableOpacity>

      {scanned && (
        <TouchableOpacity style={[styles.manualButton, { marginTop: 10, backgroundColor: '#003366' }]} onPress={() => setScanned(false)}>
          <Text style={styles.manualButtonText}>Escanear de nuevo</Text>
        </TouchableOpacity>
      )}

      {/* Modal de Permisos */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Permisos de cámara</Text>
            <Text style={styles.modalText}>Necesitamos acceder a tu cámara para poder escanear el código QR.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowPermissionModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar solicitud de permiso de cámara"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={requestPermission}
                accessibilityRole="button"
                accessibilityLabel="Permitir acceso a la cámara"
              >
                <Text style={styles.modalActionText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
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
  cameraPlaceholder: { flex: 1, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  retryCameraButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center' },
  retryCameraText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: 14 },
  helpText: { fontSize: 14, fontWeight: FONTS.bold, marginBottom: 10 },
  manualButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 12, paddingHorizontal: 30, borderRadius: SIZES.radioBoton, width: '80%', alignItems: 'center' },
  manualButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: SIZES.radioTarjeta, width: '80%' },
  modalTitle: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10, color: COLORS.azulMarino },
  modalText: { fontSize: 14, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  modalButton: { minHeight: 44, minWidth: 88, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#475569', fontWeight: FONTS.bold },
  modalActionText: { color: COLORS.azulMarino, fontWeight: FONTS.bold }
});
