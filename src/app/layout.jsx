import { useEffect } from "react";

export default function Layout({ children }) {
  useEffect(() => {
    let tiempoInicio = Date.now();

    const enviarTiempo = async () => {
      const tiempoFinal = Date.now();
      const minutos = (tiempoFinal - tiempoInicio) / 60000;
      await fetch("/api/indicadores/tiempo-permanencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tiempo: minutos }),
      });
    };

    window.addEventListener("beforeunload", enviarTiempo);
    // Si tienes un botón de logout, llama enviarTiempo ahí también

    return () => window.removeEventListener("beforeunload", enviarTiempo);
  }, []);

  return <>{children}</>;
}