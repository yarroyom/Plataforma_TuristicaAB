"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Lugar {
  id: number;
  nombre: string;
  imagen_url?: string;
}

export default function LugaresPage() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/lugares")
      .then(res => res.json())
      .then(data => setLugares(data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Lugares Turísticos</h1>
      <div className="flex flex-wrap gap-4">
        {lugares.length === 0 && (
          <div className="text-gray-500">No hay lugares registrados.</div>
        )}
        {lugares.map(l => (
          <div
            key={l.id}
            className="w-48 text-center cursor-pointer hover:shadow-lg"
            onClick={() => router.push(`/lugares/${l.id}`)}
          >
            {l.imagen_url && (
              <img
                src={l.imagen_url}
                alt={l.nombre}
                className="w-full rounded"
              />
            )}
            <div className="block mt-2 font-bold text-blue-600 hover:underline">
              {l.nombre}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
