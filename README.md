# Mercados Viva

Directorio de plazas de mercado del Valle de Aburrá. El código sigue en dos carpetas (`frontend` y `backend`), pero se levantan y se publican juntos.

## Cómo correrlo (los dos al tiempo)

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

Eso abre la API en `http://localhost:3001` y la web en `http://localhost:5173`.

## Despliegue (front y back al mismo tiempo)

El lugar gratis para publicar **los dos juntos** es **Render**: un solo Web Service, una sola URL.

1. Sube el repo a GitHub.
2. En [render.com](https://render.com) crea un **Web Service** y apunta a ese repo.
3. Render lee `render.yaml` y monta front + back en el mismo servicio.
