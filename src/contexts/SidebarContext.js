import React, { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext(null);

const STORAGE_KEY = 'soundscape:sidebarCollapsed';

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((value) => !value);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, setCollapsed, mobileOpen, openMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return {
      collapsed: false,
      toggleCollapsed: () => {},
      setCollapsed: () => {},
      mobileOpen: false,
      openMobile: () => {},
      closeMobile: () => {}
    };
  }
  return ctx;
}
