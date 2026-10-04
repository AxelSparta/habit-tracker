import { clerkMiddleware } from "@clerk/nextjs/server";

// Sólo deja disponible la sesión de Clerk para `auth()`; cada página hace su
// propio chequeo con `auth.protect()` (y los datos los protege RLS en Supabase).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Saltea internals de Next y archivos estáticos.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
