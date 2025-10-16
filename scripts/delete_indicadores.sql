BEGIN;

-- Borra valores asociados a los indicadores por nombre
DELETE FROM "ValorIndicador"
WHERE "indicadorId" IN (
  SELECT id FROM "Indicador"
  WHERE nombre IN (
    'Tiempo promedio de permanencia en el sitio',
    'Número de accesos desde distintas fuentes'
  )
);

-- Borra los indicadores
DELETE FROM "Indicador"
WHERE nombre IN (
  'Tiempo promedio de permanencia en el sitio',
  'Número de accesos desde distintas fuentes'
);

COMMIT;
