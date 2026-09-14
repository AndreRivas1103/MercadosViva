import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { CarritoProveedor } from "./carrito.jsx";
import "./estilos.css";

createRoot(document.getElementById("raiz")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CarritoProveedor>
        <App />
      </CarritoProveedor>
    </BrowserRouter>
  </React.StrictMode>
);
