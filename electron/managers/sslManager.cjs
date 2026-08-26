const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const tls = require('tls');
const os = require('os');

const CA_COMMON_NAME = 'Lummo Local Development CA';
const DEFAULT_PASSPHRASE = 'lummo_local_ssl_2026';

// Storage directory for Lummo SSL files
function getSslDir() {
  const baseDir = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Preferences') : path.join(os.homedir(), '.config'));
  const sslDir = path.join(baseDir, 'lummo', 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
  }
  const certsDir = path.join(sslDir, 'certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }
  return { sslDir, certsDir };
}

function getCaPaths() {
  const { sslDir, certsDir } = getSslDir();
  return {
    sslDir,
    certsDir,
    caCertPath: path.join(sslDir, 'LummoCA.crt'),
    caPfxPath: path.join(sslDir, 'LummoCA.pfx'),
    caKeyPath: path.join(sslDir, 'LummoCA.key')
  };
}

// Memory cache for SecureContext objects
const secureContextCache = new Map();

/**
 * Check if the Lummo CA is installed in the Windows Root Certificate store
 */
function isCaInstalled() {
  if (process.platform !== 'win32') return false;
  try {
    const output = execSync('certutil.exe -user -store Root', { encoding: 'utf-8', timeout: 5000 });
    if (output.includes(CA_COMMON_NAME) || output.includes('Lummo Local Development CA') || output.includes('Lummo Studio')) {
      return true;
    }
  } catch (e) {
    try {
      const outputSystem = execSync('certutil.exe -store Root', { encoding: 'utf-8', timeout: 5000 });
      if (outputSystem.includes(CA_COMMON_NAME) || outputSystem.includes('Lummo Local Development CA') || outputSystem.includes('Lummo Studio')) {
        return true;
      }
    } catch (err) {
      return false;
    }
  }
  return false;
}

/**
 * Ensure Root CA exists in the file system. If not, generate via PowerShell PKI cmdlets.
 */
async function ensureCaCreated() {
  const { caCertPath, caPfxPath } = getCaPaths();

  if (fs.existsSync(caCertPath) && fs.existsSync(caPfxPath)) {
    return { caCertPath, caPfxPath };
  }

  if (process.platform === 'win32') {
    const psScript = `
      $ErrorActionPreference = "Stop"
      $pwd = ConvertTo-SecureString -String "${DEFAULT_PASSPHRASE}" -Force -AsPlainText
      
      # Clean any existing certs with this name in CurrentUser store
      Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Subject -like "*${CA_COMMON_NAME}*" } | Remove-Item -Force -ErrorAction SilentlyContinue

      # Generate new Root CA valid for 10 years
      $ca = New-SelfSignedCertificate -Type Custom -KeySpec Signature \`
        -Subject "CN=${CA_COMMON_NAME}, O=Lummo Studio, OU=Local Development" \`
        -KeyExportPolicy Exportable -HashAlgorithm SHA256 -KeyLength 2048 \`
        -CertStoreLocation "Cert:\\CurrentUser\\My" \`
        -KeyUsage CertSign, CRLSign, DigitalSignature \`
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1,1.3.6.1.5.5.7.3.2","2.5.29.19={text}CA=true&pathlength=1") \`
        -NotAfter (Get-Date).AddYears(10)

      # Export Public Certificate (.crt)
      Export-Certificate -Cert $ca -FilePath "${caCertPath.replace(/\\/g, '\\\\')}" | Out-Null

      # Export PFX Bundle (.pfx)
      Export-PfxCertificate -Cert $ca -FilePath "${caPfxPath.replace(/\\/g, '\\\\')}" -Password $pwd | Out-Null
    `;

    return new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        if (err) {
          return reject(new Error('No se pudo generar la CA Raíz de Lummo: ' + err.message));
        }
        resolve({ caCertPath, caPfxPath });
      });
    });
  }

  return { caCertPath, caPfxPath };
}

/**
 * Install the Lummo Root CA in Windows Trusted Root Certification Authorities store
 */
async function installCa() {
  if (process.platform !== 'win32') {
    return { success: false, error: 'La instalación automática de certificados de confianza está disponible para Windows.' };
  }

  const { caCertPath } = await ensureCaCreated();

  return new Promise((resolve) => {
    const cmd = `certutil.exe -user -addstore -f "Root" "${caCertPath}"`;
    exec(cmd, (err, stdout) => {
      if (err) {
        // Try without -user (machine level) if -user failed
        exec(`certutil.exe -addstore -f "Root" "${caCertPath}"`, (err2, stdout2) => {
          if (err2) {
            return resolve({
              success: false,
              error: 'Error al registrar en almacén de certificados: ' + (err2.message || err.message)
            });
          }
          resolve({
            success: true,
            message: 'Certificado Raíz de Lummo instalado con éxito en Windows.',
            output: stdout2
          });
        });
        return;
      }

      resolve({
        success: true,
        message: 'Certificado Raíz de Lummo instalado con éxito en Windows.',
        output: stdout
      });
    });
  });
}

/**
 * Remove the Lummo Root CA from the Windows certificate store
 */
async function uninstallCa() {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Operación no soportada en este sistema operativo.' };
  }

  return new Promise((resolve) => {
    exec(`certutil.exe -user -delstore "Root" "${CA_COMMON_NAME}"`, (err, stdout) => {
      // Also try deleting at machine level
      exec(`certutil.exe -delstore "Root" "${CA_COMMON_NAME}"`, () => {});
      secureContextCache.clear();

      if (err && !stdout.includes('0 certificates removed')) {
        return resolve({ success: true, message: 'CA de Lummo desinstalada de Windows.' });
      }

      resolve({
        success: true,
        message: 'CA de Lummo desinstalada de Windows.'
      });
    });
  });
}

/**
 * Generate or retrieve an SSL Certificate for a specific domain signed by Lummo Root CA
 */
async function getOrCreateDomainCertificate(domain = 'localhost') {
  const cleanDomain = domain.toLowerCase().trim();
  const { certsDir, caCertPath, caPfxPath } = getCaPaths();
  const safeFilename = cleanDomain.replace(/[^a-z0-9.-]/gi, '_');
  const domainPfxPath = path.join(certsDir, `${safeFilename}.pfx`);

  // Check in-memory cache
  if (secureContextCache.has(cleanDomain)) {
    return {
      secureContext: secureContextCache.get(cleanDomain),
      pfxPath: domainPfxPath
    };
  }

  // Ensure Root CA exists
  await ensureCaCreated();

  // If already exists on disk, load into memory
  if (fs.existsSync(domainPfxPath)) {
    try {
      const pfxBuffer = fs.readFileSync(domainPfxPath);
      const secureContext = tls.createSecureContext({
        pfx: pfxBuffer,
        passphrase: DEFAULT_PASSPHRASE
      });
      secureContextCache.set(cleanDomain, secureContext);
      return { secureContext, pfxPath: domainPfxPath };
    } catch (e) {
      console.warn(`[SSL Manager] Regenerando PFX corrupto para ${cleanDomain}`);
    }
  }

  // Generate domain certificate signed by Lummo CA
  if (process.platform === 'win32') {
    const psScript = `
      $ErrorActionPreference = "Stop"
      $pwd = ConvertTo-SecureString -String "${DEFAULT_PASSPHRASE}" -Force -AsPlainText

      # Load CA from My store or import from PFX
      $ca = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Subject -like "*${CA_COMMON_NAME}*" } | Select-Object -First 1
      if (-not $ca) {
        $caImported = Import-PfxCertificate -FilePath "${caPfxPath.replace(/\\/g, '\\\\')}" -CertStoreLocation Cert:\\CurrentUser\\My -Password $pwd
        $ca = $caImported[0]
      }

      # Build SAN list
      $sanList = @("${cleanDomain}", "localhost", "127.0.0.1", "*.${cleanDomain}", "*.test", "*.local", "*.localhost")

      # Generate Leaf Certificate signed by CA
      $cert = New-SelfSignedCertificate -Signer $ca \`
        -Subject "CN=${cleanDomain}" \`
        -DnsName $sanList \`
        -KeyExportPolicy Exportable -HashAlgorithm SHA256 -KeyLength 2048 \`
        -CertStoreLocation "Cert:\\CurrentUser\\My" \`
        -KeyUsage DigitalSignature, KeyEncipherment \`
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1") \`
        -NotAfter (Get-Date).AddYears(3)

      # Export to PFX
      Export-PfxCertificate -Cert $cert -FilePath "${domainPfxPath.replace(/\\/g, '\\\\')}" -Password $pwd | Out-Null
    `;

    await new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        if (err) return reject(new Error(`Error al emitir certificado SSL para ${cleanDomain}: ` + err.message));
        resolve();
      });
    });

    const pfxBuffer = fs.readFileSync(domainPfxPath);
    const secureContext = tls.createSecureContext({
      pfx: pfxBuffer,
      passphrase: DEFAULT_PASSPHRASE
    });
    secureContextCache.set(cleanDomain, secureContext);
    return { secureContext, pfxPath: domainPfxPath };
  }

  throw new Error('Generación de certificados no soportada en esta plataforma.');
}

/**
 * Get status of the SSL subsystem
 */
function getSslStatus() {
  const { caCertPath } = getCaPaths();
  const caInstalled = isCaInstalled();
  const caExists = fs.existsSync(caCertPath);

  const { certsDir } = getSslDir();
  let generatedCertCount = 0;
  try {
    if (fs.existsSync(certsDir)) {
      generatedCertCount = fs.readdirSync(certsDir).filter(f => f.endsWith('.pfx')).length;
    }
  } catch (e) {}

  return {
    caInstalled,
    caExists,
    caCertPath,
    caName: CA_COMMON_NAME,
    generatedCertCount,
    sslDefaultPort: 8443
  };
}

module.exports = {
  getSslDir,
  getCaPaths,
  isCaInstalled,
  ensureCaCreated,
  installCa,
  uninstallCa,
  getOrCreateDomainCertificate,
  getSslStatus,
  CA_COMMON_NAME,
  DEFAULT_PASSPHRASE
};
