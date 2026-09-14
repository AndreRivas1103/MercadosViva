import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { categorias, productos as catalogo } from "./data.js";
import { conStock, guardarPedido, obtenerPedido, sembrarInventario } from "./db.js";

sembrarInventario(catalogo);

function productos() {
  return conStock(catalogo);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../../frontend/dist");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const origin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin }));
app.use(express.json());

app.get("/api/salud", (_req, res) => {
  res.json({ ok: true, servicio: "Mercados Viva", hora: new Date().toISOString() });
});

app.get("/api/categorias", (_req, res) => {
  res.json(categorias);
});

app.get("/api/productos", (req, res) => {
  const { q, categoria } = req.query;
  let lista = productos();

  if (categoria) lista = lista.filter((p) => p.categoria === categoria);
  if (q) {
    const texto = String(q).toLowerCase();
    lista = lista.filter((p) => p.nombre.toLowerCase().includes(texto));
  }

  res.json(lista);
});

app.get("/api/productos/:id", (req, res) => {
  const producto = productos().find((p) => p.id === req.params.id);
  if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(producto);
});

app.post("/api/pedidos", (req, res) => {
  const { nombre, correo, telefono, direccion, ciudad, metodo, items } = req.body ?? {};

  if (!nombre || !correo || !telefono || !direccion || !ciudad || !metodo) {
    return res.status(400).json({ error: "Completa todos los datos de pago y envío" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El carrito está vacío" });
  }

  const lineas = [];
  for (const item of items) {
    const producto = catalogo.find((p) => p.id === item.id);
    const cantidad = Number(item.cantidad);
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: "Hay un producto agotado o inválido en el carrito" });
    }
    lineas.push({
      id: producto.id,
      nombre: producto.nombre,
      cantidad,
      precio: producto.precio,
      subtotal: producto.precio * cantidad,
    });
  }

  const total = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  const pedidoId = `MV-${Date.now().toString(36).toUpperCase()}`;
  const datos = {
    id: pedidoId,
    nombre: String(nombre).trim(),
    correo: String(correo).trim(),
    telefono: String(telefono).trim(),
    direccion: String(direccion).trim(),
    ciudad: String(ciudad).trim(),
    metodo: String(metodo).trim(),
    total,
    items: lineas,
  };

  try {
    guardarPedido(datos);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error("No se pudo guardar el pedido", error);
    return res.status(500).json({ error: "No se pudo registrar el pedido" });
  }

  res.status(201).json({
    ok: true,
    pedidoId,
    total,
    items: lineas,
    aviso: "Pago recibido.",
  });
});

app.get("/api/pedidos/:id", (req, res) => {
  const pedido = obtenerPedido(req.params.id);
  if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(pedido);
});

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }
    res.sendFile(path.join(dist, "index.html"));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });
}

app.listen(PORT, () => {
  console.log(`Mercados Viva API en http://localhost:${PORT}`);
});
