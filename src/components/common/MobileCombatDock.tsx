import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './mobileCombatDock.css';

/** The spacer follows the actual dock height, including text zoom and safe areas. */
export function MobileCombatDock({ children }: { children: ReactNode }) {
  const dock = useRef<HTMLElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const update = () => {
      const height = dock.current?.getBoundingClientRect().height ?? 0;
      if (spacer.current) spacer.current.style.height = `${height}px`;
      document.documentElement.style.setProperty('--rift-dock-height', `${height}px`);
    };
    const observer = new ResizeObserver(update);
    if (dock.current) observer.observe(dock.current);
    update();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--rift-dock-height'); };
  }, []);
  return <>
    <div ref={spacer} className="rift-dock-spacer" aria-hidden="true" />
    {createPortal(<section ref={dock} aria-label="Ações de combate" className="rift-mobile-controls border-t border-cyan-400/30 bg-[#07101b]/95 shadow-[0_-12px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl">{children}</section>, document.body)}
  </>;
}
