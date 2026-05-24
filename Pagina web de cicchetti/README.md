# Cicchetti Reservas

Sitio web con sistema de reservas para Cicchetti, Caballito.

## Usar con base de datos

1. Abrir `iniciar-servidor.bat`.
2. Entrar en el navegador a `http://127.0.0.1:8080`.
3. Las reservas se guardan en `reservas.db`.
4. El panel "Reservas cargadas" pide la clave del local para mostrar datos personales, cancelar y exportar CSV.

Clave inicial del panel: `cicchetti-2026`

Para cambiarla, editar `admin-key.txt` y reiniciar el servidor.

## Seguridad local

- El servidor escucha solo en `127.0.0.1`, por lo que no queda publicado en internet.
- El servidor rechaza conexiones que no vengan de la propia computadora.
- Las reservas nuevas se pueden crear desde el formulario, pero ver datos personales, cancelar reservas y exportar CSV requiere la clave del local.
- La página agrega headers de seguridad para reducir riesgos comunes del navegador.

## Modo demo

Si abrís `index.html` directamente como archivo, la página sigue funcionando, pero guarda las reservas solo en el navegador con `localStorage`.

## Archivos principales

- `index.html`: estructura del sitio y panel de reservas.
- `styles.css`: diseño responsive.
- `app.js`: lógica del formulario y conexión con la API.
- `server.py`: servidor local y API con SQLite.
- `reservas.db`: base de datos SQLite.
- `admin-key.txt`: clave local para el panel del local.
