/**
 * Lummo Studio - AI Agent IPC Controller
 * Soporte multi-proveedor para OpenAI, Gemini, Anthropic, DeepSeek, Groq, OpenRouter y Ollama Local.
 */
const { safeHandle } = require('./ipcUtils.cjs');

const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o-mini',
  ollama: 'llama3:latest'
};

async function callOpenAiCompatible({ url, apiKey, model, messages, temperature = 0.7 }) {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('API Key no proporcionada o vacía.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${trimmedKey}`
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMsg = `HTTP Error ${res.status}`;
    try {
      let errObj = JSON.parse(errorText);
      if (Array.isArray(errObj) && errObj.length > 0) {
        errObj = errObj[0];
      }
      parsedMsg = errObj?.error?.message || errObj?.message || (typeof errObj?.error === 'string' ? errObj.error : null) || errorText;
    } catch {}

    if (parsedMsg.includes('The caller does not have permission') || parsedMsg.includes('PERMISSION_DENIED')) {
      parsedMsg += ' (Asegúrate de obtener tu clave desde Google AI Studio: https://aistudio.google.com/api-keys y que la API "Generative Language" esté habilitada sin restricciones de IP/Referrer).';
    }

    throw new Error(parsedMsg);
  }

  const data = await res.json();
  const replyContent = data.choices?.[0]?.message?.content || '';
  return {
    role: 'assistant',
    content: replyContent
  };
}

async function callAnthropic({ apiKey, model, messages, systemPrompt }) {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('API Key no proporcionada para Anthropic Claude.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': trimmedKey,
    'anthropic-version': '2023-06-01'
  };

  // Convert OpenAI messages to Anthropic format
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt || 'Eres el Asistente Experto de Infraestructura y Bases de Datos de Lummo Studio.',
      messages: anthropicMessages
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMsg = `HTTP Error ${res.status}`;
    try {
      let errObj = JSON.parse(errorText);
      if (Array.isArray(errObj) && errObj.length > 0) {
        errObj = errObj[0];
      }
      parsedMsg = errObj?.error?.message || errObj?.message || (typeof errObj?.error === 'string' ? errObj.error : null) || errorText;
    } catch {}
    throw new Error(parsedMsg);
  }

  const data = await res.json();
  const replyContent = data.content?.[0]?.text || '';
  return {
    role: 'assistant',
    content: replyContent
  };
}

async function callOllama({ endpoint, model, messages }) {
  const baseEndpoint = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const url = `${baseEndpoint}/api/chat`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3:latest',
      messages,
      stream: false
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ollama Error (${res.status}): ${errorText || 'No se pudo conectar con Ollama local'}`);
  }

  const data = await res.json();
  return {
    role: 'assistant',
    content: data.message?.content || ''
  };
}

function registerAiHandlers() {
  // 1. Probar Conexión con Proveedor de IA
  safeHandle('ai-test-connection', async (event, { provider = 'ollama', apiKey, endpoint, model }) => {
    try {
      if (provider === 'ollama') {
        const baseEndpoint = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
        const res = await fetch(`${baseEndpoint}/api/tags`, { method: 'GET' });
        if (!res.ok) throw new Error('Ollama no responde en ' + baseEndpoint);
        const data = await res.json();
        const availableModels = (data.models || []).map(m => m.name);
        return {
          success: true,
          models: availableModels,
          message: `Conectado a Ollama (${availableModels.length} modelos locales detectados)`
        };
      }

      const trimmedKey = (apiKey || '').trim();
      if (!trimmedKey && provider !== 'ollama') {
        return { success: false, error: `API Key requerida para ${provider.toUpperCase()}` };
      }

      // Quick test query (1 token)
      const testMessages = [{ role: 'user', content: 'Ping' }];
      let testModel = model || DEFAULT_MODELS[provider] || 'gpt-4o-mini';

      if (provider === 'anthropic') {
        await callAnthropic({ apiKey: trimmedKey, model: testModel, messages: testMessages, systemPrompt: 'Ping test' });
      } else {
        const url = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
        await callOpenAiCompatible({ url, apiKey: trimmedKey, model: testModel, messages: testMessages });
      }

      return {
        success: true,
        message: `Conexión exitosa con ${provider.toUpperCase()}`
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Error de conexión'
      };
    }
  });

  // 2. Ejecutar Completado de Chat con Contexto del Sistema
  safeHandle('ai-chat-completion', async (event, {
    provider = 'openai',
    apiKey = '',
    model,
    endpoint,
    messages = [],
    context = {}
  }) => {
    try {
      const trimmedKey = (apiKey || '').trim();
      if (provider !== 'ollama' && !trimmedKey) {
        return {
          success: false,
          error: `API Key no configurada para ${provider.toUpperCase()}. Ve a Ajustes > Experimental para ingresar tu clave.`
        };
      }

      // Build System Prompt with real contextual infrastructure information
      let sysContext = `Eres Lummo AI, el copiloto inteligente de desarrollo local, servidores e infraestructura para Lummo Studio.
Tus capacidades:
- Diagnosticar y resolver errores de terminal (Node.js, Vite, Next.js, Python, PHP, Docker, etc.).
- Diseñar esquemas y generar consultas SQL para MySQL, PostgreSQL, SQLite y comandos Redis.
- Proponer arquitecturas de carpetas, dependencias y optimizaciones de rendimiento.
- Sé conciso, directo al grano y utiliza bloques de código con sintaxis markdown clara.
- IMPORTANTE: No asumas que el usuario está trabajando en un proyecto o base de datos específica a menos que te lo pregunten o esté inspeccionando su pestaña activamente. Si te saludan o hacen preguntas generales, responde de forma general y abierta sin encasillarte en un proyecto en particular.`;

      if (context.currentProject?.name || context.projectName) {
        const projName = context.currentProject?.name || context.projectName;
        const projType = context.currentProject?.techStack || context.projectType || 'Desconocido';
        const port = context.currentProject?.port || context.port || 3000;
        const status = context.currentProject?.status || context.status || 'STOPPED';

        sysContext += `\n\n[PROYECTO EN PANTALLA ACTIVA]:
- Nombre: ${projName}
- Tipo: ${projType}
- Puerto: ${port}
- Estado: ${status}`;
      } else if (context.runningProjectsCount > 0 && context.runningProjectsNames?.length > 0) {
        sysContext += `\n\n[SERVIDORES ACTIVOS EN EJECUCIÓN (${context.runningProjectsCount})]:\n${context.runningProjectsNames.map(p => `- ${p}`).join('\n')}`;
      } else {
        sysContext += `\n\n[VISTA ACTUAL]: El usuario está en la vista general (${context.currentView || 'Inicio'}). No hay proyectos seleccionados ni servidores corriendo en este momento.`;
      }

      if (context.recentLogs && context.recentLogs.length > 0) {
        const logsText = context.recentLogs.slice(-15).join('\n');
        sysContext += `\n\n[ÚLTIMOS LOGS DE CONSOLA]:\n${logsText}`;
      }

      const activeDb = context.activeDatabase || context.databaseInfo;
      if (activeDb && activeDb.name) {
        sysContext += `\n\n[BASE DE DATOS EN PANTALLA ACTIVA]:
- Tipo: ${activeDb.type}
- Nombre: ${activeDb.name}
- Tablas: ${(activeDb.tables || []).join(', ')}`;
      }

      const finalMessages = [
        { role: 'system', content: sysContext },
        ...messages
      ];

      const selectedModel = model || DEFAULT_MODELS[provider] || 'gpt-4o-mini';

      let result;
      if (provider === 'ollama') {
        result = await callOllama({ endpoint, model: selectedModel, messages: finalMessages });
      } else if (provider === 'anthropic') {
        result = await callAnthropic({ apiKey: trimmedKey, model: selectedModel, messages: finalMessages, systemPrompt: sysContext });
      } else {
        const url = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
        result = await callOpenAiCompatible({ url, apiKey: trimmedKey, model: selectedModel, messages: finalMessages });
      }

      return {
        success: true,
        message: result
      };
    } catch (err) {
      console.error('[Lummo AI Handler Error]:', err.message || err);
      return {
        success: false,
        error: err.message || 'Error al procesar la solicitud con el modelo de IA'
      };
    }
  });
}

module.exports = {
  registerAiHandlers
};
