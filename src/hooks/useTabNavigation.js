import { useState, useEffect } from 'react';

/**
 * Custom Hook para gestionar el sistema de pestañas dinámicas estilo navegador e historial de navegación.
 */
export function useTabNavigation(t) {
  const [openTabs, setOpenTabs] = useState([
    { id: 'home', title: t.home, type: 'home', closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('home');

  // Historial de navegación (< Volver / > Adelante)
  const [navHistory, setNavHistory] = useState(['home']);
  const [navIndex, setNavIndex] = useState(0);

  // Actualizar los títulos estáticos de las pestañas si cambia el idioma
  useEffect(() => {
    setOpenTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === 'home') return { ...tab, title: t.home };
        if (tab.id === 'projects') return { ...tab, title: t.projects };
        if (tab.id === 'databases') return { ...tab, title: t.databases };
        return tab;
      })
    );
  }, [t.home, t.projects, t.databases]);

  const openTab = (param, titleArg, typeArg = 'page', projectArg = null, dbArg = null) => {
    let id, title, type, project, db;
    if (typeof param === 'object' && param !== null) {
      ({ id, title, type = 'page', project = null, db = null } = param);
    } else {
      id = param;
      title = titleArg;
      type = typeArg;
      project = projectArg;
      db = dbArg;
    }

    let tabTitle = title;
    if (type === 'project-detail') {
      const name = project?.name || title.replace(/^(Proyecto|Base de Datos)\s*\/\s*/, '');
      tabTitle = `Proyecto / ${name}`;
    } else if (type === 'database-detail') {
      const name = db?.name || title.replace(/^(Proyecto|Base de Datos)\s*\/\s*/, '');
      tabTitle = `Base de Datos / ${name}`;
    }

    const exists = openTabs.find((t) => t.id === id);
    if (!exists) {
      const newTabObj = { id, title: tabTitle, type, project, db, closable: id !== 'home' };
      setOpenTabs((prev) => [...prev, newTabObj]);
    } else {
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, title: tabTitle, project: project || t.project } : t
        )
      );
    }
    setActiveTabId(id);

    const newHistory = navHistory.slice(0, navIndex + 1);
    newHistory.push(id);
    setNavHistory(newHistory);
    setNavIndex(newHistory.length - 1);
  };

  const closeTab = (tabId) => {
    if (tabId === 'home') return; // Inicio no se puede cerrar

    const updated = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(updated);

    if (activeTabId === tabId) {
      const fallbackTab = updated[updated.length - 1] || updated[0];
      if (fallbackTab) setActiveTabId(fallbackTab.id);
    }
  };

  const reorderTabs = (draggedId, targetId) => {
    setOpenTabs((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });
  };

  const togglePinTab = (tabId) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t))
    );
  };

  const closeOtherTabs = (tabId) => {
    setOpenTabs((prev) => prev.filter((t) => t.id === 'home' || t.id === tabId));
    setActiveTabId(tabId);
  };

  const duplicateTab = (tabId) => {
    const tabToDup = openTabs.find((t) => t.id === tabId);
    if (!tabToDup) return;
    const dupId = `${tabToDup.id}_dup_${Date.now()}`;
    const dupTab = {
      ...tabToDup,
      id: dupId,
      title: `${tabToDup.title} (Copia)`,
      closable: true
    };
    setOpenTabs((prev) => [...prev, dupTab]);
    setActiveTabId(dupId);
  };

  const handleGoBack = () => {
    if (navIndex > 0) {
      const prevTabId = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      if (openTabs.some((t) => t.id === prevTabId)) {
        setActiveTabId(prevTabId);
      }
    }
  };

  const handleGoForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextTabId = navHistory[navIndex + 1];
      setNavIndex(nextTabId + 1);
      if (openTabs.some((t) => t.id === nextTabId)) {
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
