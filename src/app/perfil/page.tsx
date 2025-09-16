"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import WithAuth from '@/components/WithAuth';

// Definir interfaz para el perfil
interface Perfil {
  id?: string;
  nombre: string;
  correo: string;
  rol: string;
}

export default function PerfilPage() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState<Perfil>({
    nombre: '',
    correo: '',
    rol: ''
  });

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const res = await fetch('/api/perfil', {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Error al cargar perfil');
        }
        
        const data: Perfil = await res.json();
        setPerfil(data);
        setFormData(data);
      } catch (error) {
        console.error('Error cargando perfil:', error);
      }
    };

    if (user) {
      cargarPerfil();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (res.ok) {
        setEditando(false);
        const updated: Perfil = await res.json();
        setPerfil(updated);
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
    }
  };

  const handleEliminar = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar tu perfil?')) {
      try {
        const res = await fetch('/api/perfil', {
          method: 'DELETE',
          credentials: 'include'
        });

        if (res.ok) {
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error eliminando perfil:', error);
      }
    }
  };

  return (
    <WithAuth>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>
        
        {perfil && (
          <div className="bg-white shadow-lg rounded-lg p-6">
            {editando ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={user?.rol !== 'emprendedor'} // Solo emprendedores pueden editar email
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {perfil.nombre}</p>
                  <p><strong>Email:</strong> {perfil.correo}</p>
                  <p><strong>Rol:</strong> {perfil.rol}</p>
                </div>

                <div className="mt-6 flex gap-4">
                  {user?.rol === 'emprendedor' && (
                    <>
                      <button
                        onClick={() => setEditando(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg"
                      >
                        Editar Perfil
                      </button>
                      <button
                        onClick={handleEliminar}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg"
                      >
                        Eliminar Perfil
                      </button>
                    </>
                  )}
                  
                  {user?.rol === 'turista' && (
                    <button
                      onClick={() => alert('Modo de visualización - Solo turistas pueden ver')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      Ver Detalles
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </WithAuth>
  );
}