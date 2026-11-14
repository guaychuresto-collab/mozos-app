# App para Mozos - Versión Online

## Cómo subirla a internet (gratis) en Render

1. Creá una cuenta gratis en https://render.com (podés entrar con Google).

2. Subí esta carpeta a un repositorio de GitHub:
   - Andá a https://github.com y creá una cuenta si no tenés.
   - Creá un repositorio nuevo (público) llamado `mozos-app`.
   - Subí todos los archivos de esta carpeta (arrastrá los archivos).

3. En Render:
   - New → Web Service
   - Conectá tu cuenta de GitHub y elegí el repositorio `mozos-app`
   - Configuración:
     - Name: mozos-app (o el que quieras)
     - Runtime: Node
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Instance Type: Free
   - Create Web Service

4. Esperá 2-3 minutos a que termine de deployar.

5. Te va a dar un link como: `https://mozos-app-xxxx.onrender.com`

Ese link lo abrís desde cualquier celular y listo. Todos los mozos entran al mismo link y se actualiza en tiempo real.

**Nota:** En el plan gratis, si nadie usa la app por un rato, se “duerme” y la primera vez que entran tarda 30-50 segundos en despertar. Después anda normal.

## Uso
- Configurá el menú la primera vez.
- Las mesas ya están en el orden del salón.
- No hace falta prender ninguna computadora.
