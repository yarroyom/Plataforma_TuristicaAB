"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMsg("");
    if (password.length < 6) return setMsg('La contraseña debe tener al menos 6 caracteres');
    if (password !== confirm) return setMsg('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      if (res.ok) {
        setMsg('Contraseña restablecida correctamente. Redirigiendo al login...');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d?.error || 'Error al restablecer');
      }
    } catch (e) {
      setMsg('Error de conexión');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Restablecer contraseña</h2>
        {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" />
          <input type="password" placeholder="Confirmar contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full p-2 border rounded" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.push('/login')} className="px-3 py-1 rounded bg-gray-200">Cancelar</button>
            <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white" disabled={loading}>{loading ? 'Enviando...' : 'Restablecer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
