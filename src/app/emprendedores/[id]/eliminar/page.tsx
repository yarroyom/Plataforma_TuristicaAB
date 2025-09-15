"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EliminarEmprendedor() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const eliminar = async () => {
      await fetch(`/api/emprendedores/${id}`, { method: "DELETE" });
      router.push("/emprendedores");
    };
    eliminar();
  }, [id, router]);

  return <p className="p-8">Eliminando perfil...</p>;
}
