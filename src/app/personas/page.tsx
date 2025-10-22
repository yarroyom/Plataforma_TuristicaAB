"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PersonasPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Obtener current user para saber rol
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(d => setMe(d))
      .catch(() => setMe(null));

    fetch('/api/usuarios', { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login');
          return [];
        }
        return res.json();
      })
      .then(data => setUsuarios(data || []))
      .catch(() => setUsuarios([]));
  }, []);

  const handleDelete = async (id: number) => {
    if (!me || String(me.rol).toUpperCase() !== 'ADMIN') return alert('No autorizado');
    if (!confirm('¿Eliminar esta persona? Esta acción es irreversible.')) return;
    const res = await fetch('/api/usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id }) });
    if (res.ok) {
      setUsuarios(prev => prev.filter(u => u.id !== id));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Personas</h1>
          <button onClick={() => router.push('/principal')} className="bg-green-600 text-white px-3 py-2 rounded">Volver</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 personas-grid">
          {usuarios.map(u => (
            <div key={u.id} className="card bg-white p-3 rounded shadow flex items-center gap-3">
              <div className="flex items-center gap-3" style={{ flex: '1 1 auto' }}>
                <img src={u.foto || '/images.jpeg'} alt={`Foto de ${u.nombre}`} title={u.nombre} className="w-12 h-12 rounded-full object-cover" />
                <div className="info">
                  <div className="name">{u.nombre}</div>
                </div>
              </div>
              {me && String(me.rol).toUpperCase() === 'ADMIN' && (
                <div className="card-actions">
                  <button onClick={() => handleDelete(u.id)} className="btn-delete">Eliminar</button>
                </div>
              )}
            </div>
          ))}
          {usuarios.length === 0 && (
            <div className="text-gray-500">No hay personas registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
}
