import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  mode?: 'landing' | 'session';
}

export function Layout({ children, mode = 'landing' }: LayoutProps) {
  return (
    <div className={`app-shell ${mode === 'session' ? 'app-shell--session' : 'app-shell--landing'} text-[color:var(--ink-950)]`}>
      <div className={`app-frame ${mode === 'session' ? 'app-frame--session' : ''}`}>
        {children}
      </div>
    </div>
  );
}
