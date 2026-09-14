import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCarrito } from "../carrito.jsx";

export default function Encabezado() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { unidades } = useCarrito();

  function buscar(evento) {
    evento.preventDefault();
    const texto = q.trim();
    navigate(texto ? `/?q=${encodeURIComponent(texto)}` : "/");
  }

  return (
    <header className="encabezado">
      <div className="encabezado__barra">
        <Link to="/" className="marca">
          <span className="marca__sello">MV</span>
          Mercados <em>Viva</em>
        </Link>

        <form className="busca" onSubmit={buscar}>
          <input
            type="search"
            placeholder="Buscar pan, arroz, verduras…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>

        <Link to="/carrito" className="carrito-btn">
          Carrito
          {unidades > 0 && <span>{unidades}</span>}
        </Link>
      </div>
    </header>
  );
}
