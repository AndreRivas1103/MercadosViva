import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "mercados.db");
export const db = new DatabaseSync(dbPath);

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
const descontarStock = db.prepare(`
  UPDATE inventario SET stock = stock - ? WHERE producto_id = ? AND stock >= ?
`);

export function sembrarInventario(catalogo) {
  for (const producto of catalogo) {
    insertarStock.run(producto.id, producto.stock);
  }
}

export function conStock(catalogo) {
  const mapa = Object.fromEntries(listarStock.all().map((fila) => [fila.producto_id, fila.stock]));
  return catalogo.map((producto) => {
    const stock = mapa[producto.id] ?? producto.stock ?? 0;
    return { ...producto, stock, disponible: stock > 0 };
  });
}

export function guardarPedido({ id, nombre, correo, telefono, direccion, ciudad, metodo, total, items }) {
  db.exec("BEGIN");
  try {
    for (const item of items) {
      const resultado = descontarStock.run(item.cantidad, item.id, item.cantidad);
      if (resultado.changes !== 1) {
        const error = new Error(`Ya no hay suficientes unidades de ${item.nombre}`);
        error.status = 400;
        throw error;
      }
    }

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
