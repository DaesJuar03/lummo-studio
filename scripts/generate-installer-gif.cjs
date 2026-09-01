const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

app.whenReady().then(async () => {
  const width = 460;
  const height = 290;

  // Convert Lummo.png to base64
  const logoPath = path.join(__dirname, '..', 'public', 'Lummo.png');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }
    body {
      width: ${width}px;
      height: ${height}px;
      background: #151515;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #151515;
      position: relative;
    }
    .logo-container {
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    .logo-img {
      width: 86px;
      height: 86px;
      border-radius: 20px;
      object-fit: contain;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }
    .text-holder {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #FFFFFF;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 12px;
      height: 16px;
      line-height: 16px;
      opacity: 0.95;
    }
    .progress-track {
      width: 320px;
      height: 6px;
      background: #08080a;
      border-radius: 999px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.95), 0 1px 0 rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .progress-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: #FFFFFF;
      border-radius: 999px;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 3px #FFFFFF;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <img src="${logoDataUri}" class="logo-img" />
    </div>
    <div class="text-holder" id="textHolder">EXTRAYENDO PAQUETES...</div>
    <div class="progress-track">
      <div class="progress-fill" id="progressFill"></div>
    </div>
  </div>

  <script>
    const steps = [
      { maxT: 0.22, text: "EXTRAYENDO PAQUETES..." },
      { maxT: 0.52, text: "INSTALANDO ARCHIVOS..." },
      { maxT: 0.80, text: "CONFIGURANDO ENTORNO..." },
      { maxT: 0.94, text: "CREANDO ACCESOS DIRECTOS..." },
      { maxT: 1.01, text: "FINALIZANDO INSTALACIÓN..." }
    ];

    window.setFrame = (t) => {
      // t is 0.0 to 1.0
      const fill = document.getElementById('progressFill');
      const text = document.getElementById('textHolder');
      
      // Progress percentage
      const percent = Math.min(100, Math.max(3, t * 100));
      fill.style.width = percent + '%';

      // Current text
      for (const step of steps) {
        if (t <= step.maxT) {
          text.textContent = step.text;
          break;
        }
      }
    };
  </script>
</body>
</html>
  `;

  const win = new BrowserWindow({
    width: width,
    height: height,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false
    }
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Wait for initial render
  await new Promise(res => setTimeout(res, 600));

  const totalFrames = 50;
  const fps = 20;
  const frameDelay = Math.round(1000 / fps); // 50ms

  const encoder = new GIFEncoder();

  console.log(`Rendering ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1);
    await win.webContents.executeJavaScript(`
      window.setFrame(${t});
      new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 15)));
    `);
    
    // Capture page frame
    const nativeImage = await win.webContents.capturePage({ x: 0, y: 0, width, height });
    const buffer = nativeImage.toBitmap(); // BGRA raw buffer

    // Convert BGRA to RGBA for gifenc
    const rgba = new Uint8Array(width * height * 4);
    for (let p = 0; p < buffer.length; p += 4) {
      rgba[p] = buffer[p + 2];     // R
      rgba[p + 1] = buffer[p + 1]; // G
      rgba[p + 2] = buffer[p];     // B
      rgba[p + 3] = buffer[p + 3]; // A
    }

    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    encoder.writeFrame(index, width, height, { palette, delay: frameDelay });
  }

  encoder.finish();
  const gifBuffer = Buffer.from(encoder.bytes());

  const outPath = path.join(__dirname, '..', 'build', 'installer.gif');
  fs.writeFileSync(outPath, gifBuffer);
  console.log(`Successfully generated installer GIF at: ${outPath} (${(gifBuffer.length / 1024).toFixed(1)} KB)`);

  app.quit();
});
