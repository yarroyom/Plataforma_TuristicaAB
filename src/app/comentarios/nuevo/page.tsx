"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Lugar {
  id: number;
  nombre: string;
}

export default function NuevoComentarioPage() {
  const router = useRouter();
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [form, setForm] = useState({
    lugarId: "",
    comentario: "",
    calificacion: 5,
    fechaVisita: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/lugares")
      .then(res => res.json())
      .then(data => setLugares(data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCalificacion = (valor: number) => {
    setForm({ ...form, calificacion: valor });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/resenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lugarId: Number(form.lugarId),
        comentario: form.comentario,
        calificacion: Number(form.calificacion),
        fechaVisita: form.fechaVisita || null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(`/lugares/${form.lugarId}`);
    } else {
      const data = await res.json();
      alert(data.error || "Error al enviar comentario");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dejar Comentario</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="font-semibold">Lugar:</label>
        <select
          name="lugarId"
          value={form.lugarId}
          onChange={handleChange}
          required
          className="border p-2 rounded"
        >
          <option value="">Selecciona un lugar</option>
          {lugares.map(l => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
        <label className="font-semibold">Comentario:</label>
        <textarea
          name="comentario"
          value={form.comentario}
          onChange={handleChange}
          required
          className="border p-2 rounded"
          rows={3}
        />
        <label className="font-semibold">Calificación:</label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(valor => (
            <span
              key={valor}
              className={`cursor-pointer text-2xl ${form.calificacion >= valor ? "text-yellow-400" : "text-gray-300"}`}
              onClick={() => handleCalificacion(valor)}
            >★</span>
          ))}
        </div>
        <label className="font-semibold">Fecha de visita (opcional):</label>
        <input
          type="date"
          name="fechaVisita"
          value={form.fechaVisita}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar Comentario"}
        </button>
      </form>
    </div>
  );
}
