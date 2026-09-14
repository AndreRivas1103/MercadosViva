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
        if (!producto.disponible) return;
        setItems((previos) => {
          const ya = previos.find((item) => item.id === producto.id);
          if (ya) {
            return previos.map((item) =>
              item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
            );
          }
          return [...previos, { ...producto, cantidad: 1 }];
        });
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
