import React, { lazy, Suspense } from 'react';
import HeaderRaw from './components/common/Header';
import HomeDashboardRaw from './components/views/HomeDashboard';
import ProjectsPanelRaw from './components/views/ProjectsPanel';
import DatabasesPanelRaw from './components/views/DatabasesPanel';
import LogsConsoleRaw from './components/common/LogsConsole';
import ErrorBoundary from './components/common/ErrorBoundary';
import UserErrorModalRaw from './components/modals/UserErrorModal';
import PostUpdateBannerRaw from './components/common/PostUpdateBanner';
import ChangelogSheetRaw from './components/common/ChangelogSheet';
import { useLummoState } from './context/useLummoState';
import { useAppUpdater } from './hooks/useAppUpdater';
import type { LummoProject, DatabaseConfig } from './types/lummo';

const Header = HeaderRaw as React.ComponentType<any>;
const HomeDashboard = HomeDashboardRaw as React.ComponentType<any>;
const ProjectsPanel = ProjectsPanelRaw as React.ComponentType<any>;
const DatabasesPanel = DatabasesPanelRaw as React.ComponentType<any>;
const LogsConsole = LogsConsoleRaw as React.ComponentType<any>;
const UserErrorModal = UserErrorModalRaw as React.ComponentType<any>;
const PostUpdateBanner = PostUpdateBannerRaw as React.ComponentType<any>;
const ChangelogSheet = ChangelogSheetRaw as React.ComponentType<any>;

const SettingsModal = lazy(() => import('./components/modals/SettingsModal')) as React.ComponentType<any>;
const CommandPaletteModal = lazy(() => import('./components/modals/CommandPaletteModal')) as React.ComponentType<any>;
const NewTabActionModal = lazy(() => import('./components/modals/NewTabActionModal')) as React.ComponentType<any>;
const ImportProjectModal = lazy(() => import('./components/modals/ImportProjectModal')) as React.ComponentType<any>;
const OnboardingWizard = lazy(() => import('./components/views/OnboardingWizard')) as React.ComponentType<any>;
const StandaloneLogWindow = lazy(() => import('./components/views/StandaloneLogWindow')) as React.ComponentType<any>;
const StandaloneApiHubWindow = lazy(() => import('./components/views/StandaloneApiHubWindow')) as React.ComponentType<any>;
const StandaloneGitWindow = lazy(() => import('./components/views/StandaloneGitWindow')) as React.ComponentType<any>;
const ProjectDetailPage = lazy(() => import('./components/views/ProjectDetailPage')) as React.ComponentType<any>;
const DatabaseDetailPage = lazy(() => import('./components/views/DatabaseDetailPage')) as React.ComponentType<any>;
const AiAssistantDock = lazy(() => import('./components/ai/AiAssistantDock')) as React.ComponentType<any>;

export default function App() {
  const {
    projects,
    saveProjects,
    envStatus,
    isScanning,
    handleScanEnv,
    logs,
    activeLogsProject,
    setActiveLogsProject,
    handleClearProjectLogs,
    handleClearAllLogs,
    userError,
    setUserError,
    showOnboarding,
    setShowOnboarding,
    handleOnboardingComplete,
    language,
    setLanguage,
    langDetection,
    customDatabases,
    handleAddCustomDatabase,
    handleRemoveDatabase,
    showSettings,
    setShowSettings,
    showCommandPalette,
    setShowCommandPalette,
    showNewTabModal,
    setShowNewTabModal,
    showImportModal,
    setShowImportModal,
    theme,
    toggleTheme,
    t,
    tabNav,
    handleImportFolderPath,
    handleToggleProject,
    handleOpenLogWindow,
    handleOpenBrowser,
    handleOpenEditor,
    handleRemoveProject,
    handleUpdateProject,
    handleUpdatePort,
    handleUpdateCommand,
    activeDiagnostics,
    handleDismissDiagnostic
  } = useLummoState();

  const updater = useAppUpdater();
  const [showAiAssistant, setShowAiAssistant] = React.useState<boolean>(false);

  const {
    openTabs,
    activeTabId,
    setActiveTabId,
    navIndex,
    navHistory,
    openTab,
    closeTab,
    reorderTabs,
    togglePinTab,
    closeOtherTabs,
    duplicateTab,
    handleGoBack,
    handleGoForward
  } = tabNav;

  const hash = window.location.hash;
  if (hash.startsWith('#/logs/')) {
    const projectId = hash.replace('#/logs/', '').split('?')[0];
    const searchParams = new URLSearchParams(hash.split('?')[1] || '');
    const projectName = searchParams.get('name') || 'Terminal Logs';

    return (
      <Suspense fallback={<div className="h-screen bg-[#141414]" />}>
        <StandaloneLogWindow projectId={projectId} projectName={projectName} />
      </Suspense>
    );
  }

  if (hash.startsWith('#/api-hub/')) {
    const projectId = hash.replace('#/api-hub/', '').split('?')[0];
    const searchParams = new URLSearchParams(hash.split('?')[1] || '');
    const projectName = searchParams.get('name') || 'API & Webhooks';
    const port = Number(searchParams.get('port')) || 3000;
    const projectPath = searchParams.get('path') || '';

    return (
      <Suspense fallback={<div className="h-screen bg-[#141414]" />}>
        <StandaloneApiHubWindow
          projectId={projectId}
          projectName={projectName}
          port={port}
          projectPath={projectPath}
          theme={theme}
        />
      </Suspense>
    );
  }

  if (hash.startsWith('#/git-inspector/')) {
    const projectId = hash.replace('#/git-inspector/', '').split('?')[0];
    const searchParams = new URLSearchParams(hash.split('?')[1] || '');
    const projectName = searchParams.get('name') || 'Git Inspector';
    const projectPath = searchParams.get('path') || '';

    return (
      <Suspense fallback={<div className="h-screen bg-[#141414]" />}>
        <StandaloneGitWindow
          projectId={projectId}
          projectName={projectName}
          projectPath={projectPath}
          theme={theme}
        />
      </Suspense>
    );
  }

  const runningCount = projects.filter((p) => p.status === 'RUNNING').length;
  const activeTabObj = openTabs.find((tab) => tab.id === activeTabId) || openTabs[0];

  const cleanSQLite: DatabaseConfig = {
    id: 'sqlite-custom',
    name: 'Nueva Base de Datos SQLite',
    type: 'sqlite',
    port: undefined,
    status: 'READY'
  };

  if (showOnboarding) {
    return (
      <OnboardingWizard
        isOpen={true}
        onComplete={handleOnboardingComplete}
        envStatus={envStatus}
        onScanEnv={handleScanEnv}
        isScanning={isScanning}
        theme={theme}
        onToggleTheme={toggleTheme}
        language={language}
        onSelectLanguage={(lang: string) => setLanguage(lang)}
        detectedLang={langDetection.detectedLang}
        isLangSupported={langDetection.isSupported}
      />
    );
  }

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#141414] text-[#E5E5E5]' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <Header
        updater={updater}
        openTabs={openTabs}
        activeTabId={activeTabId}
        onSelectTab={(id: string) => setActiveTabId(id)}
        onCloseTab={closeTab}
        onPlusClick={() => setShowNewTabModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAiAssistant={() => setShowAiAssistant(true)}
        runningCount={runningCount}
        canGoBack={navIndex > 0}
        canGoForward={navIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReorderTabs={reorderTabs}
        onTogglePinTab={togglePinTab}
        onCloseOtherTabs={closeOtherTabs}
        onDuplicateTab={duplicateTab}
        theme={theme}
        language={language}
      />

      <PostUpdateBanner
        version={updater.currentVersion}
        show={updater.showPostUpdateBanner}
        onDismiss={updater.dismissPostUpdateBanner}
        onOpenChangelog={updater.openChangelogSheet}
        theme={theme}
        language={language}
      />

      <main
        className={`flex-1 flex flex-col ${
          activeTabObj?.type === 'home' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'
        }`}
      >
        <ErrorBoundary>
          {activeTabObj?.type === 'home' && (
            <HomeDashboard
              projects={projects}
              customDatabases={customDatabases}
              onAddProject={() => setShowImportModal(true)}
              onImportFolder={handleImportFolderPath}
              onOpenProjectsTab={() =>
                openTab({ id: 'projects', title: t.projects, type: 'projects' })
              }
              onOpenDatabasesTab={() =>
                openTab({ id: 'databases', title: t.databases, type: 'databases' })
              }
              onOpenSettings={() => setShowSettings(true)}
              onToggleProject={handleToggleProject}
              onRemoveProject={handleRemoveProject}
              onSelectProjectDetail={(project: LummoProject) =>
                openTab({
                  id: project.id,
                  title: `${
                    t.projectTitlePrefix || (language === 'es' ? 'Proyecto' : 'Project')
                  } / ${project.name}`,
                  type: 'project-detail',
                  project
                })
              }
              onSelectDatabaseDetail={(dbItem: DatabaseConfig) =>
                openTab({
                  id: `db-${dbItem.id}`,
                  title: `${
                    t.databaseTitlePrefix || (language === 'es' ? 'Base de Datos' : 'Database')
                  } / ${dbItem.name}`,
                  type: 'database-detail',
                  db: dbItem
                })
              }
              onAddCustomDatabase={handleAddCustomDatabase}
              onRemoveDatabase={handleRemoveDatabase}
              theme={theme}
              language={language}
            />
          )}

          {activeTabObj?.type === 'projects' && (
            <ProjectsPanel
              projects={projects}
              onAddProject={() => setShowImportModal(true)}
              onToggleProject={handleToggleProject}
              onOpenBrowser={handleOpenBrowser}
              onOpenEditor={handleOpenEditor}
              onRemoveProject={handleRemoveProject}
              onUpdateProject={handleUpdateProject}
              onUpdatePort={handleUpdatePort}
              onToggleLogs={(id: string) => {
                const project = projects.find((p) => p.id === id || p.path === id);
                if (project) handleOpenLogWindow(project);
              }}
              onSelectProjectDetail={(project: LummoProject) =>
                openTab({
                  id: project.id,
                  title: `${
                    t.projectTitlePrefix || (language === 'es' ? 'Proyecto' : 'Project')
                  } / ${project.name}`,
                  type: 'project-detail',
                  project
                })
              }
              activeLogsProject={activeLogsProject}
              theme={theme}
              language={language}
            />
          )}

          {activeTabObj?.type === 'databases' && (
            <DatabasesPanel
              envStatus={envStatus}
              customDatabases={customDatabases}
              onAddCustomDatabase={handleAddCustomDatabase}
              onSelectDatabaseDetail={(dbItem: DatabaseConfig) =>
                openTab({
                  id: `db-${dbItem.id}`,
                  title: `${
                    t.databaseTitlePrefix || (language === 'es' ? 'Base de Datos' : 'Database')
                  } / ${dbItem.name}`,
                  type: 'database-detail',
                  db: dbItem
                })
              }
              theme={theme}
              language={language}
            />
          )}

          <Suspense
            fallback={
              <div className="flex items-center justify-center p-12 text-xs font-mono text-slate-500">
                <span className="animate-pulse">
                  {language === 'es'
                    ? 'Cargando módulo de Lummo Studio...'
                    : 'Loading Lummo Studio module...'}
                </span>
              </div>
            }
          >
            {activeTabObj?.type === 'project-detail' && activeTabObj.project && (
              <ProjectDetailPage
                project={
                  projects.find(
                    (p) => p.id === activeTabObj.project?.id || p.path === activeTabObj.project?.path
                  ) || activeTabObj.project
                }
                activeDiagnostic={
                  activeDiagnostics[activeTabObj.project?.id || ''] || 
                  activeDiagnostics[activeTabObj.project?.path || ''] || 
                  null
                }
                onDismissDiagnostic={() => 
                  handleDismissDiagnostic(activeTabObj.project?.id || activeTabObj.project?.path || '')
                }
                onBack={() => setActiveTabId('home')}
                onToggleProject={handleToggleProject}
                onOpenBrowser={handleOpenBrowser}
                onOpenEditor={handleOpenEditor}
                onOpenLogs={handleOpenLogWindow}
                onUpdateProject={handleUpdateProject}
                onUpdatePort={handleUpdatePort}
                onUpdateCommand={handleUpdateCommand}
                projectLogs={
                  logs[activeTabObj.project?.id || ''] || 
                  logs[activeTabObj.project?.path || ''] || 
                  []
                }
                onClearProjectLogs={() => 
                  handleClearProjectLogs(activeTabObj.project?.id || activeTabObj.project?.path || '')
                }
                theme={theme}
                language={language}
              />
            )}

            {activeTabObj?.type === 'database-detail' && activeTabObj.db && (
              <DatabaseDetailPage
                db={activeTabObj.db}
                onBack={() => setActiveTabId('databases')}
                theme={theme}
                language={language}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <Suspense fallback={null}>
        {activeLogsProject && (
          <LogsConsole
            logs={logs}
            activeProjectId={activeLogsProject}
            projects={projects}
            onClose={() => setActiveLogsProject(null)}
            onClearLogs={handleClearProjectLogs}
            language={language}
            theme={theme}
          />
        )}

        {showSettings && (
          <SettingsModal
            updater={updater}
            onClose={() => setShowSettings(false)}
            envStatus={envStatus}
            onScanEnv={handleScanEnv}
            isScanning={isScanning}
            theme={theme}
            onToggleTheme={toggleTheme}
            language={language}
            onSelectLanguage={(lang: string) => setLanguage(lang)}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onClearAllLogs={handleClearAllLogs}
            projects={projects}
            onSaveProjects={saveProjects}
            onRemoveProject={handleRemoveProject}
            onOpenFolder={(folderPath: string) => {
              if (window.electronAPI?.openInEditor) {
                window.electronAPI.openInEditor(folderPath, 'explorer');
              }
            }}
          />
        )}

        <NewTabActionModal
          isOpen={showNewTabModal}
          onClose={() => setShowNewTabModal(false)}
          onOpenProjects={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
          onOpenDatabases={() =>
            openTab({ id: 'databases', title: t.databases, type: 'databases' })
          }
          onAddProject={() => setShowImportModal(true)}
          onOpenSQLiteWorkbench={() =>
            openTab({
              id: 'db-sqlite',
              title: `${
                t.databaseTitlePrefix || (language === 'es' ? 'Base de Datos' : 'Database')
              } / SQLite`,
              type: 'database-detail',
              db: cleanSQLite
            })
          }
          theme={theme}
          language={language}
        />

        <ImportProjectModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportFolder={handleImportFolderPath}
          projects={projects}
          theme={theme}
          language={language}
        />

        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          projects={projects}
          customDatabases={customDatabases}
          onAddProject={() => setShowImportModal(true)}
          onOpenProjects={() => openTab({ id: 'projects', title: t.projects, type: 'projects' })}
          onOpenDatabases={() =>
            openTab({ id: 'databases', title: t.databases, type: 'databases' })
          }
          onOpenSettings={() => setShowSettings(true)}
          onToggleProject={handleToggleProject}
          onSelectDatabaseDetail={(dbItem: DatabaseConfig) =>
            openTab({
              id: `db-${dbItem.id}`,
              title: `${
                t.databaseTitlePrefix || (language === 'es' ? 'Base de Datos' : 'Database')
              } / ${dbItem.name}`,
              type: 'database-detail',
              db: dbItem
            })
          }
          onOpenOnboarding={() => setShowOnboarding(true)}
          theme={theme}
          language={language}
        />

        {userError && (
          <UserErrorModal
            error={userError.error}
            title={userError.title}
            onClose={() => setUserError(null)}
            onOpenInstaller={() => setShowSettings(true)}
            theme={theme}
            language={language}
          />
        )}

        <ChangelogSheet
          show={updater.showChangelogSheet}
          version={updater.currentVersion}
          releaseNotes={updater.updateInfo?.releaseNotes}
          onClose={updater.dismissChangelogSheet}
          theme={theme}
          language={language}
        />

        <AiAssistantDock
          isOpen={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          projects={projects}
          customDatabases={customDatabases}
          logs={logs}
          activeTab={activeTabObj}
          onOpenSettings={() => {
            setShowSettings(true);
          }}
          theme={theme}
          language={language}
        />
      </Suspense>
    </div>
  );
}
