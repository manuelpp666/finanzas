import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start"; // 1. Importado aquí

import { renderErrorPage } from "./lib/error-page";

// Tu middleware de errores actual se queda igual
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// 2. Creamos el filtro de protección contra ataques CSRF para tus Server Functions
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  // 3. Agregado al array junto con tu middleware de errores
  requestMiddleware: [csrfMiddleware, errorMiddleware], 
}));