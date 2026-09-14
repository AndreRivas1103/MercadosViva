import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, pesos } from "../api.js";
import { useCarrito } from "../carrito.jsx";

export default function Inicio() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const { agregar } = useCarrito();

  useEffect(() => {
    api.categorias().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .productos({ q, categoria })
      .then(setProductos)
      .catch((err) => setError(err.message));
  }, [q, categoria]);

  function elegir(producto) {
    if (!producto.disponible) return;
    agregar(producto);
    setAviso(`${producto.nombre} se fue al carrito`);
    window.clearTimeout(elegir._t);
    elegir._t = window.setTimeout(() => setAviso(""), 1800);
  }

  const listos = productos.filter((p) => p.disponible).length;
  const agotados = productos.length - listos;

  return (
    <section className="tienda">
      <div className="portada-tienda">
        <p className="ojal">Canasta del día · 20 productos</p>
        <h1>Lo que hay, y lo que se acabó.</h1>
        <p>
          <b className="marca-ok">{listos} disponibles</b>
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
        {productos.map((producto) => (
          <article
            key={producto.id}
            className={`producto ${producto.disponible ? "esta" : "no-esta"}`}
          >
            <div className="producto__foto">
              <img src={producto.imagen} alt="" />
              <span className={producto.disponible ? "sello sello--si" : "sello sello--no"}>
                {producto.disponible ? "Disponible" : "Agotado"}
              </span>
            </div>
            <div className="producto__info">
              <strong>{pesos(producto.precio)}</strong>
              <small> / {producto.unidad}</small>
              <h2>{producto.nombre}</h2>
              {producto.disponible ? (
                <button type="button" className="boton" onClick={() => elegir(producto)}>
                  Agregar al carrito
                </button>
              ) : (
                <p className="sin-stock">No hay disponibilidad en el momento</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
