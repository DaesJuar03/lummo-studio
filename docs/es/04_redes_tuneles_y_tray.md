# Servicios de Red, Túneles HTTPS y System Tray

<p align="center">
  <strong>Lummo Studio v2.3.0 — Módulo Técnico 04 (Español)</strong>
</p>

<p align="center">
  <a href="../INDEX_ES.md">← Volver al Índice General</a> | 
  <a href="../en/04_network_tunnels_and_tray.md">English Version</a>
</p>

---

## 1. Proxy Local y Túneles HTTPS Públicos

Lummo Studio facilita la exposición de servidores web locales a la red pública mediante integraciones de proxy seguro (`proxyManager.cjs` y `tunnelManager.cjs`).

### Casos de Uso del Túnel:
- **Pruebas de Webhooks**: Probar servicios de terceros (Stripe, PayPal, GitHub Webhooks, Twilio) enviando peticiones a tu entorno local `localhost`.
- **Previsualización en Dispositivos Móviles**: Compartir una URL pública segura HTTPS con teléfonos o clientes externos sin configurar port forwarding en el router.

### Flujo de Red:

```text
[Cliente Externo / Webhook] 
       │ (HTTPS URL Pública)
       ▼
[Túnel HTTPS Lummo / Tunnel Proxy]
       │ (Proxy Local Reverso)
       ▼
[Servidor de Desarrollo Local (localhost:3000)]
```

---

## 2. Generación de Certificados SSL Locales

Para desarrollar sitios web que requieren estrictamente HTTPS en entorno local (ej. Service Workers, OAuth2, Web Crypto API):

- **Motor de Certificados**: Genera pares de claves RSA y certificados autofirmados X.509 (`.crt` / `.key`).
- **Instalación de Certificado RAÍZ (CA)**: Lummo Studio ofrece una opción para registrar el certificado de desarrollo en el almacén de certificados del sistema operativo para evitar advertencias de seguridad en el navegador web.

---

## 3. Integración en la Bandeja del Sistema (System Tray)

El módulo `electron/managers/trayManager.cjs` administra la presencia de Lummo Studio en la barra de tareas/área de notificación de Windows.

- **Modo en Segundo Plano**: Al cerrar la ventana principal de la aplicación, Lummo Studio puede permanecer minimizado en la bandeja del sistema, manteniendo los servidores web locales y procesos en ejecución sin consumir recursos de renderizado de la UI.
- **Menú Contextual Rápido**:
  - **Servidores Activos**: Muestra la lista de proyectos en ejecución con opciones para detenerlos individualmente.
  - **Abrir Dashboard**: Restaura la ventana principal de la aplicación.
  - **Salir Completamente**: Detiene todos los subprocesos activos y cierra la aplicación de manera limpia.

---

## 4. Buscador Omnibox Command Palette (`Ctrl + K`)

El modal `CommandPaletteModal.jsx` se activa globalmente en la aplicación presionando `Ctrl + K` (o `Cmd + K` en macOS).

### Capacidades del Omnibox:
- **Búsqueda Difusa de Proyectos**: Filtrado instantáneo de proyectos por nombre, puerto o stack tecnológico.
- **Navegación Rápida a Bases de Datos**: Selección e inicio directo de sesiones SQL.
- **Ejecución de Acciones Globales**:
  - Importar nuevo proyecto (`Alt + N`).
  - Crear base de datos.
  - Abrir configuración del sistema (`Alt + S`).
  - Cambiar tema de la interfaz (Oscuro / Claro).
