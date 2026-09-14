import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "mercados.db");
export const db = new DatabaseSync(dbPath);

export const MINUTOS_RESERVA = 10;
const DURACION_RESERVA = MINUTOS_RESERVA * 60 * 1000;

function errorHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    metodo TEXT NOT NULL,
    total INTEGER NOT NULL,
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pedido_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
  );

  CREATE TABLE IF NOT EXISTS inventario (
    producto_id TEXT PRIMARY KEY,
    stock INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservas (
    sesion_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    expira_en INTEGER NOT NULL,
    PRIMARY KEY (sesion_id, producto_id)
  );
`);

const insertarPedido = db.prepare(`
  INSERT INTO pedidos (id, nombre, correo, telefono, direccion, ciudad, metodo, total, creado_en)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertarItem = db.prepare(`
  INSERT INTO pedido_items (pedido_id, producto_id, nombre, cantidad, precio, subtotal)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const buscarPedido = db.prepare(`SELECT * FROM pedidos WHERE id = ?`);
const buscarItems = db.prepare(`SELECT producto_id, nombre, cantidad, precio, subtotal FROM pedido_items WHERE pedido_id = ?`);
const insertarStock = db.prepare(`INSERT OR IGNORE INTO inventario (producto_id, stock) VALUES (?, ?)`);
const listarStock = db.prepare(`SELECT producto_id, stock FROM inventario`);
const stockDe = db.prepare(`SELECT stock FROM inventario WHERE producto_id = ?`);
const descontarStock = db.prepare(`
  UPDATE inventario SET stock = stock - ? WHERE producto_id = ? AND stock >= ?
`);
const borrarVencidas = db.prepare(`DELETE FROM reservas WHERE expira_en <= ?`);
const reservadoProducto = db.prepare(`
  SELECT COALESCE(SUM(cantidad), 0) AS total FROM reservas WHERE producto_id = ?
`);
const listarReservado = db.prepare(`
  SELECT producto_id, COALESCE(SUM(cantidad), 0) AS total FROM reservas GROUP BY producto_id
`);
const reservaSesion = db.prepare(`
  SELECT producto_id, cantidad, expira_en FROM reservas WHERE sesion_id = ? AND producto_id = ?
`);
const listarReservasSesion = db.prepare(`
  SELECT producto_id, cantidad, expira_en FROM reservas WHERE sesion_id = ? ORDER BY expira_en
`);
const insertarReserva = db.prepare(`
  INSERT INTO reservas (sesion_id, producto_id, cantidad, expira_en) VALUES (?, ?, 1, ?)
`);
const actualizarReserva = db.prepare(`
  UPDATE reservas SET cantidad = ?, expira_en = ? WHERE sesion_id = ? AND producto_id = ?
`);
const borrarReserva = db.prepare(`DELETE FROM reservas WHERE sesion_id = ? AND producto_id = ?`);
const borrarReservasSesion = db.prepare(`DELETE FROM reservas WHERE sesion_id = ?`);

function limpiarVencidas() {
  borrarVencidas.run(Date.now());
}

function itemDeCatalogo(catalogo, fila) {
  const producto = catalogo.find((p) => p.id === fila.producto_id);
  if (!producto) return null;
  return {
    ...producto,
    cantidad: fila.cantidad,
    expiraEn: fila.expira_en,
  };
}

export function sembrarInventario(catalogo) {
  for (const producto of catalogo) {
    insertarStock.run(producto.id, producto.stock);
  }
}

export function conStock(catalogo) {
  limpiarVencidas();
  const mapa = Object.fromEntries(listarStock.all().map((fila) => [fila.producto_id, fila.stock]));
  const ocupado = Object.fromEntries(listarReservado.all().map((fila) => [fila.producto_id, fila.total]));
  return catalogo.map((producto) => {
    const fisico = mapa[producto.id] ?? producto.stock ?? 0;
    const stock = Math.max(0, fisico - (ocupado[producto.id] ?? 0));
    return { ...producto, stock, disponible: stock > 0 };
  });
}

export function carritoDeSesion(sesionId, catalogo) {
  limpiarVencidas();
  return listarReservasSesion.all(sesionId).map((fila) => itemDeCatalogo(catalogo, fila)).filter(Boolean);
}

export function reservarUnidad(sesionId, productoId, catalogo) {
  const producto = catalogo.find((p) => p.id === productoId);
  if (!producto) throw errorHttp(404, "Producto no encontrado");

  db.exec("BEGIN");
  try {
    limpiarVencidas();
    const fisico = stockDe.get(productoId)?.stock ?? 0;
    const ocupado = reservadoProducto.get(productoId)?.total ?? 0;
    if (fisico - ocupado < 1) {
      throw errorHttp(400, `Ya no hay unidades disponibles de ${producto.nombre}`);
    }

    const mia = reservaSesion.get(sesionId, productoId);
    const expira = Date.now() + DURACION_RESERVA;
    if (mia) {
      actualizarReserva.run(mia.cantidad + 1, expira, sesionId, productoId);
    } else {
      insertarReserva.run(sesionId, productoId, expira);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return carritoDeSesion(sesionId, catalogo);
}

export function quitarReserva(sesionId, productoId, catalogo) {
  borrarReserva.run(sesionId, productoId);
  return carritoDeSesion(sesionId, catalogo);
}

export function vaciarReservas(sesionId, catalogo) {
  borrarReservasSesion.run(sesionId);
  return carritoDeSesion(sesionId, catalogo);
}

export function guardarPedido({ sesionId, id, nombre, correo, telefono, direccion, ciudad, metodo, total, items }) {
  db.exec("BEGIN");
  try {
    limpiarVencidas();
    const reservas = listarReservasSesion.all(sesionId);
    if (reservas.length === 0) {
      throw errorHttp(400, "Tu reserva de 10 minutos venció. Vuelve a armar el carrito");
    }
    if (reservas.length !== items.length) {
      throw errorHttp(400, "El carrito cambió. Vuelve a revisarlo antes de pagar");
    }

    for (const item of items) {
      const reserva = reservas.find((fila) => fila.producto_id === item.id);
      if (!reserva || reserva.cantidad !== item.cantidad) {
        throw errorHttp(400, `La reserva de ${item.nombre} venció o ya no coincide. Vuelve al carrito`);
      }
      const resultado = descontarStock.run(item.cantidad, item.id, item.cantidad);
      if (resultado.changes !== 1) {
        throw errorHttp(400, `Ya no hay suficientes unidades de ${item.nombre}`);
      }
    }

    borrarReservasSesion.run(sesionId);

    insertarPedido.run(
      id,
      nombre,
      correo,
      telefono,
      direccion,
      ciudad,
      metodo,
      total,
      new Date().toISOString()
    );
    for (const item of items) {
      insertarItem.run(id, item.id, item.nombre, item.cantidad, item.precio, item.subtotal);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function obtenerPedido(id) {
  const pedido = buscarPedido.get(id);
  if (!pedido) return null;
  return { ...pedido, items: buscarItems.all(id) };
}
