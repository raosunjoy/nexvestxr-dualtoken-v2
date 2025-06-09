import React, { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Mock user authentication (in production, integrate with backend auth)
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ id: 'mock-user-id', email: 'mock-user@example.com', role: 'investor' });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };