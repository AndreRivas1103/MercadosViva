const base = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "";

async function pedir(ruta, opciones = {}) {
  const encabezados = { ...(opciones.headers || {}) };
  if (opciones.body) encabezados["Content-Type"] = "application/json";

  const respuesta = await fetch(`${base}${ruta}`, {
    ...opciones,
    headers: encabezados,
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || "No se pudo completar la compra");
  }
  return datos;
}

export const api = {
  categorias: () => pedir("/api/categorias"),
  productos: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, valor]) => valor))
    ).toString();
    return pedir(`/api/productos${query ? `?${query}` : ""}`);
  },
  pedido: (cuerpo) =>
    pedir("/api/pedidos", { method: "POST", body: JSON.stringify(cuerpo) }),
};

export function pesos(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
