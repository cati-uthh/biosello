import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CameraView, Camera } from "expo-camera";

export default function EscanerQR() {
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
         
         {/* Aquí podrías agregar una imagen PNG con transparencia que sea el marco cuadrado de tu diseño, posicionada de forma absoluta sobre la cámara */}
      </View>

      <Text style={styles.helpText}>¿No detecta el código QR?</Text>
      
      <TouchableOpacity style={styles.manualButton}>
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 40,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 30,
  },
  scannerWrapper: {
    width: 250,
    height: 250,
    overflow: 'hidden',
    borderRadius: 10,
    marginBottom: 40,
    backgroundColor: '#f0f0f0', // Color de fondo por si no hay cámara aún
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
     flex: 1,
     backgroundColor: '#E8E8E8',
  },
  helpText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  manualButton: {
    backgroundColor: '#D32F2F', // El rojo de tu botón
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Estilos del Modal
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#F3E5F5', // Lila claro
    padding: 20,
    borderRadius: 15,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalActionText: {
    color: '#003366',
    fontWeight: 'bold',
    textAlign: 'right',
  }
});