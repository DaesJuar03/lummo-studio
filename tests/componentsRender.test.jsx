import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Common & Toast
import { ToastProvider } from '../src/context/ToastContext';
import Header from '../src/components/common/Header';
import LogsConsole from '../src/components/common/LogsConsole';
import UserErrorModal from '../src/components/modals/UserErrorModal';

// Views
import HomeDashboard from '../src/components/views/HomeDashboard';
import ProjectsPanel from '../src/components/views/ProjectsPanel';
import DatabasesPanel from '../src/components/views/DatabasesPanel';
import ProjectDetailPage from '../src/components/views/ProjectDetailPage';
import DatabaseDetailPage from '../src/components/views/DatabaseDetailPage';
import SqlWorkbenchTab from '../src/components/views/database/SqlWorkbenchTab';
import RedisWorkbenchTab from '../src/components/views/database/RedisWorkbenchTab';

// Modals
import SettingsModal from '../src/components/modals/SettingsModal';
import ServicesTab from '../src/components/modals/settings/ServicesTab';
import PortsTab from '../src/components/modals/settings/PortsTab';
import EditorTab from '../src/components/modals/settings/EditorTab';
import ProjectsManagerTab from '../src/components/modals/settings/ProjectsManagerTab';
import SslTab from '../src/components/modals/settings/SslTab';
import GeneralTab from '../src/components/modals/settings/GeneralTab';

import ApiAndWebhookModal from '../src/components/modals/ApiAndWebhookModal';
import ApiClientView from '../src/components/modals/api-webhook/ApiClientView';
import WebhookInspectorView from '../src/components/modals/api-webhook/WebhookInspectorView';

import ImportProjectModal from '../src/components/modals/ImportProjectModal';
import NewTabActionModal from '../src/components/modals/NewTabActionModal';
import CloneRepoModal from '../src/components/modals/CloneRepoModal';
import NewProjectWizardModal from '../src/components/modals/NewProjectWizardModal';
import CreateDatabaseModal from '../src/components/modals/CreateDatabaseModal';
import ImportExportSqlModal from '../src/components/modals/ImportExportSqlModal';
import ScriptLauncherModal from '../src/components/modals/ScriptLauncherModal';
import ExecutionConfigModal from '../src/components/modals/ExecutionConfigModal';
import DockerComposeModal from '../src/components/modals/DockerComposeModal';
import NetworkTunnelModal from '../src/components/modals/NetworkTunnelModal';
import CommandPaletteModal from '../src/components/modals/CommandPaletteModal';

import { getTranslations } from '../src/locales';

const mockProject = {
  id: 'proj-1',
  name: 'Test Vite App',
  path: 'C:/projects/vite-app',
  port: 5173,
  status: 'STOPPED',
  command: 'npm run dev',
  techStack: 'React, Vite, TailwindCSS'
};

const mockDb = {
  id: 'sqlite',
  name: 'Local SQLite DB',
  type: 'sqlite',
  engine: 'sqlite',
  port: null,
  status: 'READY',
  tech: 'SQLite 3.45'
};

const mockRedis = {
  id: 'redis',
  name: 'Local Redis Cache',
  type: 'redis',
  engine: 'redis',
  port: 6379,
  status: 'READY',
  tech: 'Redis 7.2'
};

const t = getTranslations('es');

describe('Full React Component Render & Connection Suite', () => {
  it('renders Header correctly in light and dark mode', () => {
    const htmlDark = renderToString(
      <Header
        openTabs={[{ id: 'home', title: 'Inicio', type: 'home' }]}
        activeTabId="home"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
        onPlusClick={() => {}}
        onOpenCommandPalette={() => {}}
        onOpenSettings={() => {}}
        runningCount={0}
        canGoBack={false}
        canGoForward={false}
        onGoBack={() => {}}
        onGoForward={() => {}}
        theme="dark"
        language="es"
      />
    );
    expect(htmlDark).toContain('Lummo Studio');

    const htmlLight = renderToString(
      <Header
        openTabs={[{ id: 'home', title: 'Inicio', type: 'home' }]}
        activeTabId="home"
        theme="light"
        language="es"
      />
    );
    expect(htmlLight).toContain('Lummo Studio');
  });

  it('renders HomeDashboard correctly', () => {
    const html = renderToString(
      <HomeDashboard
        projects={[mockProject]}
        customDatabases={[mockDb]}
        onAddProject={() => {}}
        onOpenProjectsTab={() => {}}
        onOpenDatabasesTab={() => {}}
        onToggleProject={() => {}}
        onRemoveProject={() => {}}
        onSelectProjectDetail={() => {}}
        onSelectDatabaseDetail={() => {}}
        theme="dark"
        language="es"
      />
    );
    expect(html).toContain('Lanzador de Entornos Locales');
    expect(html).toContain('Test Vite App');
  });

  it('renders ProjectsPanel correctly', () => {
    const html = renderToString(
      <ProjectsPanel
        projects={[mockProject]}
        onAddProject={() => {}}
        onToggleProject={() => {}}
        onOpenBrowser={() => {}}
        onOpenEditor={() => {}}
        onRemoveProject={() => {}}
        onUpdatePort={() => {}}
        onToggleLogs={() => {}}
        onSelectProjectDetail={() => {}}
        theme="dark"
      />
    );
    expect(html).toContain('Gestor Completo de Proyectos');
    expect(html).toContain('Test Vite App');
  });

  it('renders DatabasesPanel correctly', () => {
    const html = renderToString(
      <DatabasesPanel
        customDatabases={[mockDb, mockRedis]}
        onAddCustomDatabase={() => {}}
        onSelectDatabaseDetail={() => {}}
        theme="dark"
      />
    );
    expect(html).toContain('Gestor de Bases de Datos');
    expect(html).toContain('Local SQLite DB');
  });

  it('renders SettingsModal and its subtabs correctly', () => {
    const htmlModal = renderToString(
      <SettingsModal
        onClose={() => {}}
        envStatus={{ node: { installed: true, version: 'v20.10.0' } }}
        onScanEnv={() => {}}
        isScanning={false}
        theme="dark"
        onToggleTheme={() => {}}
        language="es"
        onSelectLanguage={() => {}}
        projects={[mockProject]}
        onSaveProjects={() => {}}
        onRemoveProject={() => {}}
      />
    );
    expect(htmlModal).toContain('Ajustes');

    expect(renderToString(<ServicesTab envStatus={{}} isScanning={false} theme="dark" t={t} />)).toContain('Servicios');
    expect(renderToString(<PortsTab theme="dark" t={t} />)).toContain('5173');
    expect(renderToString(<EditorTab detectedEditors={[]} selectedEditorCmd="code" theme="dark" t={t} />)).toContain('code');
    expect(renderToString(<ProjectsManagerTab projects={[mockProject]} theme="dark" t={t} />)).toContain('Test Vite App');
    expect(renderToString(<SslTab theme="dark" />)).toContain('SSL');
    expect(renderToString(<GeneralTab language="es" theme="dark" t={t} />)).toContain('General');
  });

  it('renders ApiAndWebhookModal and subviews correctly', () => {
    const html = renderToString(
      <ApiAndWebhookModal
        isOpen={true}
        onClose={() => {}}
        project={mockProject}
        tunnelUrl="https://lummo.loca.lt"
        onStartTunnel={() => {}}
        theme="dark"
      />
    );
    expect(html).toContain('API &amp; Webhook Hub');

    const htmlClient = renderToString(
      <ApiClientView port={5173} theme="dark" collections={[]} onSaveCollectionRequest={() => {}} />
    );
    expect(htmlClient).toContain('Enviar');

    const htmlWebhook = renderToString(
      <WebhookInspectorView port={5173} tunnelUrl="" onStartTunnel={() => {}} theme="dark" webhookEvents={[]} />
    );
    expect(htmlWebhook).toContain('Webhooks');
  });

  it('renders ProjectDetailPage correctly', () => {
    const html = renderToString(
      <ProjectDetailPage
        project={mockProject}
        onBack={() => {}}
        onToggleProject={() => {}}
        onOpenBrowser={() => {}}
        onOpenEditor={() => {}}
        onOpenLogs={() => {}}
        onUpdatePort={() => {}}
        onUpdateCommand={() => {}}
        theme="dark"
      />
    );
    expect(html).toContain('Test Vite App');
    expect(html).toContain('PORT');
  });

  it('renders DatabaseDetailPage and its SQL/Redis workbenches correctly', () => {
    const htmlSql = renderToString(
      <ToastProvider>
        <DatabaseDetailPage
          db={mockDb}
          onBack={() => {}}
          theme="dark"
        />
      </ToastProvider>
    );
    expect(htmlSql).toContain('Local SQLite DB');

    const htmlRedis = renderToString(
      <ToastProvider>
        <DatabaseDetailPage
          db={mockRedis}
          onBack={() => {}}
          theme="dark"
        />
      </ToastProvider>
    );
    expect(htmlRedis).toContain('Local Redis Cache');

    const htmlSqlTab = renderToString(
      <SqlWorkbenchTab
        db={mockDb}
        theme="dark"
        tablesList={['users', 'orders']}
        selectedTable="users"
        onSelectTable={() => {}}
        onOpenSchemaDesigner={() => {}}
        onNotice={() => {}}
      />
    );
    expect(htmlSqlTab).toContain('users');

    const htmlRedisTab = renderToString(
      <RedisWorkbenchTab
        db={mockRedis}
        theme="dark"
        onNotice={() => {}}
      />
    );
    expect(htmlRedisTab).toContain('Redis');
  });

  it('renders all standalone modals correctly without errors', () => {
    expect(renderToString(<ImportProjectModal isOpen={true} onClose={() => {}} theme="dark" />)).toContain('Importar');
    expect(renderToString(<NewTabActionModal isOpen={true} onClose={() => {}} onOpenProjects={() => {}} onOpenDatabases={() => {}} onAddProject={() => {}} theme="dark" />)).toContain('Pestaña');
    expect(renderToString(<CloneRepoModal isOpen={true} onClose={() => {}} theme="dark" language="es" />)).toContain('Clonar');
    expect(renderToString(<NewProjectWizardModal isOpen={true} onClose={() => {}} theme="dark" />)).toContain('Plantilla');
    expect(renderToString(<CreateDatabaseModal isOpen={true} onClose={() => {}} theme="dark" />)).toContain('Base de Datos');
    expect(renderToString(<ImportExportSqlModal isOpen={true} onClose={() => {}} db={mockDb} theme="dark" />)).toContain('SQL');
    expect(renderToString(<ScriptLauncherModal isOpen={true} onClose={() => {}} project={mockProject} theme="dark" />)).toContain('Script');
    expect(renderToString(<ExecutionConfigModal isOpen={true} onClose={() => {}} project={mockProject} theme="dark" />)).toContain('Ejecución');
    expect(renderToString(<DockerComposeModal isOpen={true} onClose={() => {}} project={mockProject} theme="dark" />)).toContain('Docker');
    expect(renderToString(<NetworkTunnelModal isOpen={true} onClose={() => {}} project={mockProject} theme="dark" />)).toContain('Túnel');
    expect(renderToString(<CommandPaletteModal isOpen={true} onClose={() => {}} theme="dark" />)).toContain('comando');
    expect(renderToString(<UserErrorModal error={new Error('Test Error')} onClose={() => {}} theme="dark" />)).toContain('Interrupción');
    expect(renderToString(<LogsConsole logs={[]} projects={[mockProject]} activeProjectId="proj-1" onClose={() => {}} onClearLogs={() => {}} />)).toContain('Console Logs');
  });
});
