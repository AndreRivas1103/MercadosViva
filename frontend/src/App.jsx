import { Route, Routes } from "react-router-dom";
import Encabezado from "./componentes/Encabezado.jsx";
import Pie from "./componentes/Pie.jsx";
import Inicio from "./paginas/Inicio.jsx";
import Carrito from "./paginas/Carrito.jsx";
import Pago from "./paginas/Pago.jsx";

export default function App() {
  return (
    <div className="app">
      <Encabezado />
      <main>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/pago" element={<Pago />} />
        </Routes>
      </main>
      <Pie />
    </div>
  );
}
