import { useState, useEffect } from 'react';
import type { LummoProject, DatabaseConfig } from '../types/lummo';

export interface LummoTab {
  id: string;
  title: string;
  type: 'home' | 'page' | 'project-detail' | 'database-detail' | string;
  closable?: boolean;
  pinned?: boolean;
  project?: LummoProject | null;
  db?: DatabaseConfig | null;
}

export interface TabTranslations {
  home: string;
  projects: string;
  databases: string;
  projectTitlePrefix?: string;
  databaseTitlePrefix?: string;
  copySuffix?: string;
  [key: string]: any;
}

export function useTabNavigation(t: TabTranslations) {
  const [openTabs, setOpenTabs] = useState<LummoTab[]>([
    { id: 'home', title: t.home, type: 'home', closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('home');

  const [navHistory, setNavHistory] = useState<string[]>(['home']);
  const [navIndex, setNavIndex] = useState<number>(0);

  useEffect(() => {
    setOpenTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === 'home') return { ...tab, title: t.home };
        if (tab.id === 'projects') return { ...tab, title: t.projects };
        if (tab.id === 'databases') return { ...tab, title: t.databases };
        if (tab.type === 'project-detail') {
          const name =
            tab.project?.name ||
            tab.title.replace(/^(Proyecto|Project|Base de Datos|Database)\s*\/\s*/i, '');
          return { ...tab, title: `${t.projectTitlePrefix || 'Project'} / ${name}` };
        }
        if (tab.type === 'database-detail') {
          const name =
            tab.db?.name ||
            tab.title.replace(/^(Proyecto|Project|Base de Datos|Database)\s*\/\s*/i, '');
          return { ...tab, title: `${t.databaseTitlePrefix || 'Database'} / ${name}` };
        }
        return tab;
      })
    );
  }, [t.home, t.projects, t.databases, t.projectTitlePrefix, t.databaseTitlePrefix]);

  const openTab = (
    param: string | Partial<LummoTab>,
    titleArg?: string,
    typeArg = 'page',
    projectArg: LummoProject | null = null,
    dbArg: DatabaseConfig | null = null
  ) => {
    let id: string;
    let title: string;
    let type: string;
    let project: LummoProject | null;
    let db: DatabaseConfig | null;

    if (typeof param === 'object' && param !== null) {
      id = param.id || 'home';
      title = param.title || '';
      type = param.type || 'page';
      project = param.project || null;
      db = param.db || null;
    } else {
      id = param;
      title = titleArg || '';
      type = typeArg;
      project = projectArg;
      db = dbArg;
    }

    let tabTitle = title;
    if (type === 'project-detail') {
      const name =
        project?.name || title.replace(/^(Proyecto|Project|Base de Datos|Database)\s*\/\s*/i, '');
      tabTitle = `${t.projectTitlePrefix || 'Project'} / ${name}`;
    } else if (type === 'database-detail') {
      const name =
        db?.name || title.replace(/^(Proyecto|Project|Base de Datos|Database)\s*\/\s*/i, '');
      tabTitle = `${t.databaseTitlePrefix || 'Database'} / ${name}`;
    }

    const exists = openTabs.find((tab) => tab.id === id);
    if (!exists) {
      const newTabObj: LummoTab = {
        id,
        title: tabTitle,
        type,
        project,
        db,
        closable: id !== 'home'
      };
      setOpenTabs((prev) => [...prev, newTabObj]);
    } else {
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === id ? { ...tab, title: tabTitle, project: project || tab.project } : tab
        )
      );
    }
    setActiveTabId(id);

    const newHistory = navHistory.slice(0, navIndex + 1);
    newHistory.push(id);
    setNavHistory(newHistory);
    setNavIndex(newHistory.length - 1);
  };

  const closeTab = (tabId: string) => {
    if (tabId === 'home') return;
    const updated = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(updated);

    if (activeTabId === tabId) {
      const fallbackTab = updated[updated.length - 1] || updated[0];
      if (fallbackTab) setActiveTabId(fallbackTab.id);
    }
  };

  const reorderTabs = (draggedId: string, targetId: string) => {
    setOpenTabs((prev) => {
      const draggedIndex = prev.findIndex((tab) => tab.id === draggedId);
      const targetIndex = prev.findIndex((tab) => tab.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });
  };

  const togglePinTab = (tabId: string) => {
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab))
    );
  };

  const closeOtherTabs = (tabId: string) => {
    setOpenTabs((prev) => prev.filter((tab) => tab.id === 'home' || tab.id === tabId));
    setActiveTabId(tabId);
  };

  const duplicateTab = (tabId: string) => {
    const tabToDup = openTabs.find((tab) => tab.id === tabId);
    if (!tabToDup) return;
    const dupId = `${tabToDup.id}_dup_${Date.now()}`;
    const dupTab: LummoTab = {
      ...tabToDup,
      id: dupId,
      title: `${tabToDup.title} ${t.copySuffix || '(Copy)'}`,
      closable: true
    };
    setOpenTabs((prev) => [...prev, dupTab]);
    setActiveTabId(dupId);
  };

  const handleGoBack = () => {
    if (navIndex > 0) {
      const prevTabId = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      if (openTabs.some((tab) => tab.id === prevTabId)) {
        setActiveTabId(prevTabId);
      }
    }
  };

  const handleGoForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextTabId = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      if (openTabs.some((tab) => tab.id === nextTabId)) {
        setActiveTabId(nextTabId);
      }
    }
  };

  return {
    openTabs,
    setOpenTabs,
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
  };
}

export default useTabNavigation;
