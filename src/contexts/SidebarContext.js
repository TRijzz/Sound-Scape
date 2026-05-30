import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const SidebarContext = createContext(null);

const STORAGE_KEY = 'soundscape:sidebarCollapsed';

// Hysteresis bounds for auto-collapse on window resize. Below COLLAPSE_BELOW
// we force collapsed; above EXPAND_ABOVE we restore the user's saved choice.
// The gap prevents flicker when resizing across the boundary.
const COLLAPSE_BELOW = 1100;
const EXPAND_ABOVE = 1280;

const readSavedCollapsed = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // On first paint, respect viewport width — if the window is already
    // narrow, start collapsed regardless of saved preference.
    if (window.innerWidth < COLLAPSE_BELOW) return true;
    return readSavedCollapsed();
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tracks whether the *current* collapsed state was set by the user
  // (toggle button click) vs. by the auto-resize handler. Manual choices
  // are persisted to localStorage; auto choices are not, so the user's
  // preference is restored when the window grows back.
  const userPreferenceRef = useRef(readSavedCollapsed());

  // Persist only manual choices.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, userPreferenceRef.current ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Auto-collapse / expand on window resize — but only on actual
  // *crossings* of the hysteresis thresholds, not on every resize
  // event. This is important because resize fires for many reasons
  // (scrollbar appearing/disappearing, content reflow, devtools
  // opening, etc.) and we don't want every one of those to clobber
  // a state the user just set manually.
  const prevWidthRef = useRef(typeof window === 'undefined' ? 0 : window.innerWidth);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      const prev = prevWidthRef.current;
      const curr = window.innerWidth;
      prevWidthRef.current = curr;

      if (prev >= COLLAPSE_BELOW && curr < COLLAPSE_BELOW) {
        // Crossed from "wide enough" to "too narrow" — force collapsed.
        setCollapsed(true);
      } else if (prev <= EXPAND_ABOVE && curr > EXPAND_ABOVE) {
        // Crossed from "narrow" back to "wide" — restore user preference.
        setCollapsed(userPreferenceRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      userPreferenceRef.current = next;
      return next;
    });
  };
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
