import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  esTokenSesionVigente,
  normalizarUsuarioSesion,
  obtenerExpiracionToken
} from './src/utils/auth';

const SESSION_FILE = `${FileSystem.documentDirectory}biosello_session.json`;

export const AuthContext = createContext();

const leerSesionGuardada = async () => {
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (!info.exists) return null;

    const contenido = await FileSystem.readAsStringAsync(SESSION_FILE);
    const session = contenido ? JSON.parse(contenido) : null;
    const usuario = session?.usuario ? normalizarUsuarioSesion(session.usuario) : null;
    return usuario && esTokenSesionVigente(usuario) ? usuario : null;
  } catch (error) {
    return null;
  }
};

const guardarSesion = async (usuario) => {
  try {
    if (!usuario) {
      await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
      return;
    }

    await FileSystem.writeAsStringAsync(
      SESSION_FILE,
      JSON.stringify({ usuario, updatedAt: new Date().toISOString() })
    );
  } catch (error) {
    // La sesion sigue activa en memoria aunque no se pueda persistir.
  }
};

export const AuthProvider = ({ children }) => {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [sesionCargando, setSesionCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const hidratarSesion = async () => {
      const usuarioGuardado = await leerSesionGuardada();
      if (!activo) return;

      if (usuarioGuardado) {
        setUsuario(usuarioGuardado);
        setSesionActiva(true);
      }

      setSesionCargando(false);
    };

    hidratarSesion();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (sesionCargando) return;
    guardarSesion(sesionActiva && usuario ? usuario : null);
  }, [sesionActiva, sesionCargando, usuario]);

  useEffect(() => {
    if (!sesionActiva || !usuario) return undefined;

    const expiracion = obtenerExpiracionToken(usuario);
    const restante = expiracion ? expiracion - Date.now() : 0;
    if (restante <= 0) {
      setUsuario(null);
      setSesionActiva(false);
      return undefined;
    }

    const temporizador = setTimeout(() => {
      setUsuario(null);
      setSesionActiva(false);
    }, restante);

    return () => clearTimeout(temporizador);
  }, [sesionActiva, usuario]);

  const iniciarSesion = useCallback((data) => {
    const usuarioSesion = normalizarUsuarioSesion(data);
    if (!usuarioSesion) return null;

    setUsuario(usuarioSesion);
    setSesionActiva(true);
    return usuarioSesion;
  }, []);

  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    setSesionActiva(false);
  }, []);

  const value = useMemo(() => ({
    sesionActiva,
    sesionCargando,
    usuario,
    setSesionActiva,
    setUsuario,
    iniciarSesion,
    cerrarSesion
  }), [cerrarSesion, iniciarSesion, sesionActiva, sesionCargando, usuario]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
