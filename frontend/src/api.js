const base = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "";
const CLAVE_SESION = "mercados-viva-sesion";

export function sesionId() {
  let id = localStorage.getItem(CLAVE_SESION);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLAVE_SESION, id);
  }
  return id;
}

async function pedir(ruta, opciones = {}) {
  const encabezados = { "X-Sesion-Id": sesionId(), ...(opciones.headers || {}) };
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
  carrito: () => pedir("/api/carrito"),
  reservar: (productoId) =>
    pedir("/api/carrito", { method: "POST", body: JSON.stringify({ productoId }) }),
  quitar: (productoId) => pedir(`/api/carrito/${productoId}`, { method: "DELETE" }),
  vaciar: () => pedir("/api/carrito", { method: "DELETE" }),
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
