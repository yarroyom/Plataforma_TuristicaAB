// Crea esta carpeta y archivo
import { useState, useEffect } from 'react';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  correo: string;
  rol: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (token) {
        try {
          const decoded = jwt.decode(token) as User;
          setUser(decoded);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, logout };
}