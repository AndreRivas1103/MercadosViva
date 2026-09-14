import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, pesos } from "../api.js";
import { useCarrito } from "../carrito.jsx";

const UMBRAL_AGOTARSE = 5;

function estadoProducto(producto) {
  const stock = Number(producto.stock) || 0;
  if (stock <= 0) {
    return {
      clase: "no-esta",
      sello: "Agotado",
      selloClase: "sello--no",
      texto: "No hay disponibilidad en el momento",
    };
  }
  if (stock <= UMBRAL_AGOTARSE) {
    return {
      clase: "por-acabar",
      sello: "Por agotarse",
      selloClase: "sello--bajo",
      texto: `${stock} en disponibilidad`,
    };
  }
  return {
    clase: "esta",
    sello: "Disponible",
    selloClase: "sello--si",
    texto: `${stock} en disponibilidad`,
  };
}

export default function Inicio() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const { agregar } = useCarrito();

  const cargarProductos = useCallback(() => {
    api
      .productos({ q, categoria })
      .then(setProductos)
      .catch((err) => setError(err.message));
  }, [q, categoria]);

  useEffect(() => {
    api.categorias().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === "visible") cargarProductos();
    }
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", cargarProductos);
    const id = window.setInterval(cargarProductos, 15000);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", cargarProductos);
      window.clearInterval(id);
    };
  }, [cargarProductos]);

  async function elegir(producto) {
    try {
      await agregar(producto);
      setAviso(`${producto.nombre} se fue al carrito. Tienes 10:00 para pagar.`);
    } catch (err) {
      setAviso(err.message);
    }
    cargarProductos();
    window.clearTimeout(elegir._t);
    elegir._t = window.setTimeout(() => setAviso(""), 2200);
  }

  const listos = productos.filter((p) => p.stock > 0).length;
  const bajos = productos.filter((p) => p.stock > 0 && p.stock <= UMBRAL_AGOTARSE).length;
  const agotados = productos.length - listos;

  return (
    <section className="tienda">
      <div className="portada-tienda">
        <p className="ojal">Canasta del día · 20 productos</p>
        <h1>Lo que hay, y lo que se acabó.</h1>
        <p>
          <b className="marca-ok">{listos} disponibles</b>
          {bajos > 0 && (
            <>
              {" · "}
              <b className="marca-bajo">{bajos} por agotarse</b>
            </>
          )}
          {" · "}
          <b className="marca-no">{agotados} agotados</b>
        </p>
      </div>

      <div className="categorias">
        <button className={!categoria ? "activa" : ""} type="button" onClick={() => setCategoria("")}>
          Todos
        </button>
        {categorias.map((item) => (
          <button
            key={item.id}
            className={categoria === item.id ? "activa" : ""}
            type="button"
            onClick={() => setCategoria(item.id)}
          >
            {item.nombre}
          </button>
        ))}
      </div>

      {q && (
        <p className="resultado">
          Resultados para <strong>“{q}”</strong>
        </p>
      )}
      {error && <p className="aviso">{error}</p>}
      {aviso && <p className="toast">{aviso}</p>}

      <div className="catalogo">
        {productos.map((producto) => {
          const estado = estadoProducto(producto);
          return (
            <article key={producto.id} className={`producto ${estado.clase}`}>
              <div className="producto__foto">
                <img src={producto.imagen} alt="" />
                <span className={`sello ${estado.selloClase}`}>{estado.sello}</span>
              </div>
              <div className="producto__info">
                <strong>{pesos(producto.precio)}</strong>
                <small> / {producto.unidad}</small>
                <h2>{producto.nombre}</h2>
                <p
                  className={`quedan${estado.clase === "por-acabar" ? " bajo" : ""}${
                    estado.clase === "no-esta" ? " agotado" : ""
                  }`}
                >
                  {estado.texto}
                </p>
                {producto.stock > 0 && (
                  <button type="button" className="boton" onClick={() => elegir(producto)}>
                    Agregar al carrito
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
