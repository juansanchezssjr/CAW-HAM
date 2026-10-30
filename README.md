![screenCapture](/github/capture.png)

## Administración de resultados

La página `admin.html` inicia sesión con GitHub Device Flow y guarda los resultados y las fotografías de `pages/` como commits en `main`. El token OAuth solo se conserva en memoria mientras la página está abierta.

GitHub no permite solicitar el Device Flow directamente desde el navegador por CORS. Por eso se incluye un Worker auxiliar que reenvía únicamente esas dos solicitudes OAuth. No necesita Client Secret.

1. Activa Device Flow en la OAuth App cuyo Client ID está configurado en `admin-auth.mjs`.
2. Desde la raíz del repositorio, inicia sesión en Wrangler con `npx wrangler login`.
3. Despliega el Worker auxiliar con `npx wrangler deploy --config wrangler.admin.jsonc`.
4. Comprueba que la URL asignada sea `https://ham-admin-auth.sanchezs.workers.dev`. Si tu cuenta usa otro subdominio de `workers.dev`, actualiza `AUTH_API_BASE` en `admin.js`.

El panel solo autoriza la cuenta `juansanchezssjr` y verifica que tenga permiso de escritura en `juansanchezssjr/CAW-HAM`. El Worker auxiliar permite solicitudes únicamente desde el sitio publicado y los orígenes locales de desarrollo.
