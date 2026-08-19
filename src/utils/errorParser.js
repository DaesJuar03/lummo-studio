/**
 * Smart Error Parser for Lummo Studio
 * Translates cryptic technical stack traces into friendly, concise user messages in Spanish.
 */

export function parseLummoError(errInput, defaultContextTitle = null) {
  const rawMsg = typeof errInput === 'string' 
    ? errInput 
    : (errInput?.message || errInput?.error || errInput?.toString() || '');

  const msgLower = rawMsg.toLowerCase();

  // 1. Port occupied / EADDRINUSE
  if (msgLower.includes('eaddrinuse') || msgLower.includes('port') && (msgLower.includes('busy') || msgLower.includes('occupied') || msgLower.includes('in use') || msgLower.includes('usado'))) {
    return {
      category: 'PORT_IN_USE',
      title: defaultContextTitle || 'Puerto de Servidor Ocupado',
      userMessage: 'El puerto seleccionado está siendo utilizado por otra aplicación en tu equipo. Lummo Studio puede asignar un puerto libre de forma automática.',
      actionText: 'Asignar Puerto Libre',
      actionKey: 'FIX_PORT',
      iconType: 'network',
      rawDetails: rawMsg
    };
  }

  // 2. Folder or File Not Found / ENOENT
  if (msgLower.includes('enoent') || msgLower.includes('no such file') || msgLower.includes('directory') && (msgLower.includes('not found') || msgLower.includes('inexistente'))) {
    return {
      category: 'FOLDER_NOT_FOUND',
      title: defaultContextTitle || 'Carpeta o Archivo No Encontrado',
      userMessage: 'No pudimos localizar la carpeta del proyecto en tu disco. Verifica que el directorio exista o no haya sido movido.',
      actionText: 'Verificar Ubicación',
      actionKey: 'RECHECK_FOLDER',
      iconType: 'folder',
      rawDetails: rawMsg
    };
  }

  // 3. Database connection error (MySQL, Postgres, SQLite)
  if (msgLower.includes('econnrefused') || msgLower.includes('database') || msgLower.includes('mysql') || msgLower.includes('postgres') || msgLower.includes('access denied') || msgLower.includes('connection failed') || msgLower.includes('password')) {
    return {
      category: 'DB_CONNECTION_FAILED',
      title: defaultContextTitle || 'Error de Conexión a Base de Datos',
      userMessage: 'No se pudo establecer comunicación con la base de datos. Verifica que el servidor esté activo y que el usuario, clave y puerto sean correctos.',
      actionText: 'Revisar Conexión',
      actionKey: 'CHECK_DB',
      iconType: 'database',
      rawDetails: rawMsg
    };
  }

  // 4. Missing Tech / Executable not found (Node, PHP, Python, Git)
  if (msgLower.includes('not recognized') || msgLower.includes('no se reconoce') || msgLower.includes('not found in path') || msgLower.includes('command failed') || msgLower.includes('missing runtime')) {
    return {
      category: 'MISSING_RUNTIME',
      title: defaultContextTitle || 'Herramienta de Desarrollo No Detectada',
      userMessage: 'Esta función requiere un motor (como Node.js, PHP, Python o Git) que no está instalado en tu sistema. Puedes descargarlo con un clic.',
      actionText: 'Ir al Instalador',
      actionKey: 'OPEN_INSTALLER',
      iconType: 'cpu',
      rawDetails: rawMsg
    };
  }

  // 5. Permission / EACCES / UAC Denied
  if (msgLower.includes('eacces') || msgLower.includes('permisos') || msgLower.includes('permission denied') || msgLower.includes('uac') || msgLower.includes('administrator')) {
    return {
      category: 'PERMISSION_DENIED',
      title: defaultContextTitle || 'Permisos Restringidos por Windows',
      userMessage: 'El sistema operativo denegó el acceso a esta acción. Prueba ejecutando Lummo Studio como Administrador.',
      actionText: 'Entendido',
      actionKey: 'DISMISS',
      iconType: 'shield',
      rawDetails: rawMsg
    };
  }

  // 6. Network Tunnel / Proxy Error
  if (msgLower.includes('tunnel') || msgLower.includes('localtunnel') || msgLower.includes('ngrok') || msgLower.includes('proxy') || msgLower.includes('fetch failed')) {
    return {
      category: 'NETWORK_TUNNEL_ERROR',
      title: defaultContextTitle || 'Error de Red o Túnel Público',
      userMessage: 'No fue posible abrir el túnel público. Verifica tu conexión a internet o comprueba si el servidor local está encendido.',
      actionText: 'Reintentar Conexión',
      actionKey: 'RETRY',
      iconType: 'wifi',
      rawDetails: rawMsg
    };
  }

  // 7. Generic Fallback Error
  return {
    category: 'GENERIC_RUNTIME_ERROR',
    title: defaultContextTitle || 'Interrupción Inesperada',
    userMessage: 'Ocurrió un evento no planificado al realizar esta acción. Tu información y proyectos se encuentran a salvo.',
    actionText: 'Entendido',
    actionKey: 'DISMISS',
    iconType: 'alert',
    rawDetails: rawMsg
  };
}
