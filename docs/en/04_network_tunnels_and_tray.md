# Network Services, HTTPS Tunnels & System Tray

<p align="center">
  <strong>Lummo Studio v2.3.0 — Technical Module 04 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/04_redes_tuneles_y_tray.md">Versión en Español</a>
</p>

---

## 1. Local Proxy & Public HTTPS Tunnels

Lummo Studio enables exposing local web servers to the public internet using integrated proxy managers (`proxyManager.cjs` and `tunnelManager.cjs`).

### Public Tunnel Use Cases:
- **Webhook Debugging**: Receive third-party webhooks (Stripe, PayPal, GitHub, Twilio) directly on your local dev server.
- **Mobile Device Previews**: Share a secure HTTPS URL with remote clients or mobile devices without configuring router port forwarding.

### Network Request Flow:

```text
[External Client / Webhook] 
       │ (Public HTTPS URL)
       ▼
[Lummo Tunnel Proxy]
       │ (Reverse Local Proxy)
       ▼
[Local Development Server (localhost:3000)]
```

---

## 2. Local SSL Certificate Generation

For local web applications requiring HTTPS (e.g. Service Workers, OAuth2 callbacks, Web Crypto API):

- **Certificate Engine**: Generates RSA key pairs and X.509 self-signed certificates (`.crt` / `.key`).
- **Root CA Installation**: Provides optional automated installation into the operating system certificate store to eliminate browser SSL warning prompts.

---

## 3. System Tray Operations

`electron/managers/trayManager.cjs` controls Lummo Studio's presence in the system notification area.

- **Background Execution**: Closing the main window keeps servers running in the system tray without taking UI rendering overhead.
- **Context Menu Options**:
  - **Active Servers**: Displays running projects with one-click stop toggles.
  - **Open Dashboard**: Restores the main application window.
  - **Exit**: Terminates all active child processes and performs a clean shutdown.

---

## 4. Omnibox Command Palette (`Ctrl + K`)

`CommandPaletteModal.jsx` opens globally across the application when pressing `Ctrl + K` (or `Cmd + K` on macOS).

### Omnibox Features:
- **Fuzzy Search**: Filter projects by name, port, or framework stack.
- **Quick Database Launch**: Select and launch SQL database sessions immediately.
- **Global Actions**:
  - Import new project (`Alt + N`).
  - Create new database connection.
  - Open system settings (`Alt + S`).
  - Toggle UI themes (Dark / Light).
