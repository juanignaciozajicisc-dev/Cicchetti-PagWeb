# Cicchetti Reservas

Sitio web con sistema de reservas para Cicchetti, Caballito.

## Usar con base de datos

1. Abrir `iniciar-servidor.bat`.
2. Entrar en el navegador a `http://127.0.0.1:8080`.
3. Las reservas se guardan en `reservas.db`.
4. El panel "Reservas cargadas" muestra las reservas guardadas, permite filtrar por fecha, cancelar y exportar CSV.

## Modo demo

Si abrís `index.html` directamente como archivo, la página sigue funcionando, pero guarda las reservas solo en el navegador con `localStorage`.

## Archivos principales

- `index.html`: estructura del sitio y panel de reservas.
- `styles.css`: diseño responsive.
- `app.js`: lógica del formulario y conexión con la API.
- `server.py`: servidor local y API con SQLite.
- `reservas.db`: base de datos SQLite.
