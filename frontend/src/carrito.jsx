import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { formatearTimer } from "./tiempo.js";

const CarritoCtx = createContext(null);

export function CarritoProveedor({ children }) {
  const [items, setItems] = useState([]);
  const [ahora, setAhora] = useState(() => Date.now());

  const sincronizar = useCallback(async () => {
    try {
      setItems(await api.carrito());
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    sincronizar();
    const id = window.setInterval(sincronizar, 15000);
    return () => window.clearInterval(id);
  }, [sincronizar]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (items.some((item) => Number(item.expiraEn) <= t)) {
        sincronizar();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [items, sincronizar]);

  const acciones = useMemo(() => {
    const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
    const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
    const expiraEn = items.reduce((max, item) => Math.max(max, Number(item.expiraEn) || 0), 0);

    return {
      items,
      unidades,
      total,
      ahora,
      expiraEn,
      timer: expiraEn ? formatearTimer(expiraEn, ahora) : "",
      sincronizar,
      async agregar(producto) {
        setItems(await api.reservar(producto.id));
      },
      async quitar(id) {
        setItems(await api.quitar(id));
      },
      async vaciar() {
        try {
          setItems(await api.vaciar());
        } catch {
          setItems([]);
        }
      },
    };
  }, [items, ahora, sincronizar]);

  return <CarritoCtx.Provider value={acciones}>{children}</CarritoCtx.Provider>;
}

export function useCarrito() {
  return useContext(CarritoCtx);
}
