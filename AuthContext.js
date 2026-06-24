import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [sesionActiva, setSesionActiva] = useState(false);
  const [usuario, setUsuario] = useState(null);
  
  return (
    <AuthContext.Provider value={{ sesionActiva, setSesionActiva, usuario, setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};