import { Link } from "react-router-dom";
import { pesos } from "../api.js";
import { useCarrito } from "../carrito.jsx";
import { formatearTimer } from "../tiempo.js";

export default function Carrito() {
  const { items, total, quitar, ahora } = useCarrito();

  if (items.length === 0) {
    return (
      <section className="caja">
        <h1>Tu carrito está vacío</h1>
        <p>Vuelve al inicio y elige pan, arroz, verduras o bebidas.</p>
        <Link className="boton" to="/">
          Seguir comprando
        </Link>
      </section>
    );
  }

  return (
    <section className="caja">
      <h1>Carrito</h1>
      <p className="reserva-aviso">Cada producto queda reservado 10 minutos para ti. Si se acaba el tiempo, otro puede tomarlo.</p>
      <ul className="lista-carrito">
        {items.map((item) => (
          <li key={item.id}>
            <img src={item.imagen} alt="" />
            <div>
              <h2>{item.nombre}</h2>
              <p>
                {item.cantidad} × {pesos(item.precio)}
              </p>
              <p className="reserva">Reservado {formatearTimer(item.expiraEn, ahora)}</p>
            </div>
            <strong>{pesos(item.precio * item.cantidad)}</strong>
            <button type="button" className="quitar" onClick={() => quitar(item.id)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="resumen">
        <p>
          Total <b>{pesos(total)}</b>
        </p>
        <Link className="boton" to="/pago">
          Confirmar y pagar
        </Link>
      </div>
    </section>
  );
}
