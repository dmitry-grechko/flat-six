'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ObdFocusContextValue = {
  focus: boolean;
  setFocus: (value: boolean) => void;
  toggleFocus: () => void;
};

const ObdFocusContext = createContext<ObdFocusContextValue | null>(null);

export function ObdFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState(false);

  const toggleFocus = useCallback(() => setFocus((v) => !v), []);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  const value = useMemo(
    () => ({ focus, setFocus, toggleFocus }),
    [focus, toggleFocus],
  );

  return <ObdFocusContext.Provider value={value}>{children}</ObdFocusContext.Provider>;
}

/** Safe no-op when used outside `/obd` (no provider). */
export function useObdFocus(): ObdFocusContextValue {
  const ctx = useContext(ObdFocusContext);
  return (
    ctx ?? {
      focus: false,
      setFocus: () => {},
      toggleFocus: () => {},
    }
  );
}
