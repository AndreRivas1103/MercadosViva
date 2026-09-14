import { Link } from "react-router-dom";

export default function Pie() {
  return (
    <footer className="pie">
      <p>Mercados Viva · Compra del barrio, llega a la puerta</p>
      <Link to="/carrito">Ver carrito</Link>
    </footer>
  );
}
