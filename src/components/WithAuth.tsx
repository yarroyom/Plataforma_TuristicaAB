// Crea esta carpeta y archivo
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface WithAuthProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function WithAuth({ children, requiredRole }: WithAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    if (!loading && user && requiredRole && user.rol !== requiredRole) {
      router.push('/acceso-denegado');
    }
  }, [user, loading, requiredRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (requiredRole && user.rol !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}