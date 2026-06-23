import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [sesionActiva, setSesionActiva] = useState(false);
  
  return (
    <AuthContext.Provider value={{ sesionActiva, setSesionActiva }}>
      {children}
    </AuthContext.Provider>
  );
};