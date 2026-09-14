import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, pesos } from "../api.js";
import { useCarrito } from "../carrito.jsx";

export default function Pago() {
  const { items, total, vaciar } = useCarrito();
  const [error, setError] = useState("");
  const [recibo, setRecibo] = useState(null);

  if (items.length === 0 && !recibo) return <Navigate to="/carrito" replace />;

  async function pagar(evento) {
    evento.preventDefault();
    const datos = new FormData(evento.target);
    try {
      const respuesta = await api.pedido({
        nombre: datos.get("nombre"),
        correo: datos.get("correo"),
        telefono: datos.get("telefono"),
        direccion: datos.get("direccion"),
        ciudad: datos.get("ciudad"),
        metodo: datos.get("metodo"),
        items: items.map((item) => ({ id: item.id, cantidad: item.cantidad })),
      });
      setRecibo(respuesta);
      vaciar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (recibo) {
    return (
      <section className="caja">
        <h1>Pago confirmado</h1>
        <p>
          Pedido <strong>{recibo.pedidoId}</strong> por {pesos(recibo.total)}.
        </p>
        <p>{recibo.aviso}</p>
        <Link className="boton" to="/">
          Volver a comprar
        </Link>
      </section>
    );
  }

  return (
    <section className="caja pago">
      <div>
        <h1>Pagar</h1>
        <p>Total a pagar: {pesos(total)}</p>
        {error && <p className="aviso">{error}</p>}
        <form onSubmit={pagar}>
          <label>
            Nombre
            <input name="nombre" required />
          </label>
          <label>
            Correo
            <input name="correo" type="email" required />
          </label>
          <label>
            Teléfono
            <input name="telefono" required />
          </label>
          <label>
            Dirección
            <input name="direccion" required />
          </label>
          <label>
            Ciudad
            <input name="ciudad" defaultValue="Medellín" required />
          </label>
          <label>
            Medio de pago
            <select name="metodo" required>
              <option value="tarjeta">Tarjeta débito o crédito</option>
              <option value="nequi">Nequi</option>
              <option value="contraentrega">Contraentrega</option>
            </select>
          </label>
          <button className="boton" type="submit">
            Confirmar pago
          </button>
        </form>
      </div>
      <aside>
        <h2>Tu pedido</h2>
        {items.map((item) => (
          <p key={item.id}>
            {item.cantidad} × {item.nombre}
            <b>{pesos(item.precio * item.cantidad)}</b>
          </p>
        ))}
      </aside>
    </section>
  );
}
