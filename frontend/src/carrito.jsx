import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CarritoCtx = createContext(null);
const CLAVE = "mercados-viva-carrito";

export function CarritoProveedor({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  }, [items]);

  const api = useMemo(() => {
    const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
    const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

    return {
      items,
      unidades,
      total,
      agregar(producto) {
        const tope = Number(producto.stock) || 0;
        if (tope < 1) return false;
        const ya = items.find((item) => item.id === producto.id);
        if ((ya?.cantidad || 0) >= tope) return false;
        setItems((previos) => {
          const actual = previos.find((item) => item.id === producto.id);
          if (actual) {
            return previos.map((item) =>
              item.id === producto.id ? { ...item, cantidad: item.cantidad + 1, stock: tope } : item
            );
          }
          return [...previos, { ...producto, cantidad: 1, stock: tope }];
        });
        return true;
      },
      quitar(id) {
        setItems((previos) => previos.filter((item) => item.id !== id));
      },
      vaciar() {
        setItems([]);
      },
    };
  }, [items]);

  return <CarritoCtx.Provider value={api}>{children}</CarritoCtx.Provider>;
}

export function useCarrito() {
  return useContext(CarritoCtx);
}
