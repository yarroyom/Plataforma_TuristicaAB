"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Registra las escalas y elementos necesarios para Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function EstadisticaPage() {
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [categoria, setCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState<string>(sevenDaysAgoStr); // <-- ahora por defecto hace 7 días
  const [fechaFin, setFechaFin] = useState<string>(todayStr); // <-- ahora por defecto hoy

  useEffect(() => {
    let url = "/api/estadistica";
    const params = [];
    if (categoria) params.push(`categoria=${categoria}`);
    if (fechaInicio && fechaFin) params.push(`fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url, { cache: "no-store" })
      .then(async res => {
        if (!res.ok) {
          setIndicadores([]);
          return;
        }
        try {
          const data = await res.json();
          setIndicadores(data);
        } catch {
          setIndicadores([]);
        }
      });
  }, [categoria, fechaInicio, fechaFin]);

  // Función para exportar a Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(indicadores.map(i => ({
      Indicador: i.nombre,
      Categoría: i.categoria,
      Meta: i.meta,
      ValorActual: i.valores[0]?.valorActual ?? "",
      Unidad: i.unidad,
      Fecha: i.valores[0]?.fecha ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicadores");
    XLSX.writeFile(wb, "estadisticas.xlsx");
  };

  // Función para exportar a PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Indicadores", 10, 10);
    indicadores.forEach((i, idx) => {
      doc.text(
        `${i.nombre} (${i.categoria}): ${i.valores[0]?.valorActual ?? ""} / Meta: ${i.meta}`,
        10,
        20 + idx * 10
      );
    });
    doc.save("estadisticas.pdf");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-full shadow-sm no-print"
        aria-label="Volver"
        title="Volver"
      >
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm">◀</span>
        <span className="font-medium">Volver</span>
      </button>
      <h1 className="text-xl font-semibold mb-4">Estadística de Indicadores</h1>
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 items-center no-print">
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="border p-1 sm:p-1.5 rounded text-xs sm:text-sm">
          <option value="">Todas las categorías</option>
          <option value="Dependiente">Dependiente</option>
          <option value="Independiente 1">Independiente 1</option>
          <option value="Independiente 2">Independiente 2</option>
        </select>
        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-1 sm:p-1.5 rounded text-xs sm:text-sm" />
        <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-1 sm:p-1.5 rounded text-xs sm:text-sm" />
        <div className="flex gap-1">
          <button onClick={exportExcel} className="bg-green-600 text-white px-2 py-1 rounded text-xs sm:text-sm">Excel</button>
          <button onClick={exportPDF} className="bg-blue-600 text-white px-2 py-1 rounded text-xs sm:text-sm">PDF</button>
          <button onClick={() => window.print()} className="bg-yellow-400 hover:bg-yellow-500 text-black px-2 py-1 rounded text-xs sm:text-sm">Imprimir</button>
        </div>
      </div>
      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {indicadores.map(i => (
          <div key={i.id} className="bg-white p-3 rounded shadow-sm flex flex-col items-center">
            <div className="font-medium text-sm text-center">{i.nombre}</div>
            <div className="text-gray-600 text-xs">{i.categoria}</div>
            <div className="text-xl font-semibold mt-2">
              {i.valores[0]?.valorActual ?? "—"} {i.unidad}
            </div>
            <div className="text-xs text-gray-500 mt-1">Meta: {i.meta}</div>
            <div className="text-xs text-gray-500 mt-1">
              Cumplimiento: {i.valores[0] ? Math.round((i.valores[0].valorActual / i.meta) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
      {/* Gráfica de barras */}
      <div className="bg-white p-6 rounded shadow mb-8">
        {/* contenedor responsive: permitir scroll horizontal si hay muchas etiquetas en pantallas pequeñas */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(indicadores.length * 140, 480) }} className="h-44 md:h-64 lg:h-72">
            <Bar
              data={{
                labels: indicadores.map(i => i.nombre),
                datasets: [
                  {
                    label: "Valor Actual",
                    data: indicadores.map(i => i.valores[0]?.valorActual ?? 0),
                    backgroundColor: "rgba(59,130,246,0.6)",
                  },
                  {
                    label: "Meta",
                    data: indicadores.map(i => i.meta),
                    backgroundColor: "rgba(34,197,94,0.4)",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" as const },
                  tooltip: { mode: "index" },
                  title: { display: false },
                },
                scales: {
                  x: {
                    stacked: false,
                    ticks: { maxRotation: 45, minRotation: 0, font: { size: 10 } },
                  },
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>
      {/* Tabla de indicadores */}
      <div className="bg-white p-6 rounded shadow">
        {/* Contenedor scrollable en móviles */}
        <div className="overflow-x-auto">
          <table className="min-w-[480px] w-full">
            <thead>
              <tr>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Indicador</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Categoría</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Valor Actual</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Meta</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Unidad</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Fecha</th>
                <th className="text-left text-xs md:text-sm px-2 py-1 md:px-3 md:py-2">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map(i => (
                <tr key={i.id}>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.nombre}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.categoria}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.valores[0]?.valorActual ?? "—"}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.meta}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.unidad}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">{i.valores[0]?.fecha ? new Date(i.valores[0].fecha).toLocaleDateString() : "—"}</td>
                  <td className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm">
                    {i.valores[0] ? Math.round((i.valores[0].valorActual / i.meta) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
