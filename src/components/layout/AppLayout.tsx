import { useAuth } from '@/lib/auth-context';
import {
  Activity,
  BookMarked,
  BookOpen,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Video,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

/** Paths + icons are static; labels are resolved per-render so locale changes apply. */
const navItems = [
  { path: '/youtube', labelKey: 'nav.transcription', icon: Video },
  { path: '/manga', labelKey: 'nav.manga', icon: BookMarked },
  { path: '/dictionary', labelKey: 'nav.dictionary', icon: ScrollText },
  { path: '/flashcard', labelKey: 'nav.vocabulary', icon: BookOpen },
  { path: '/monitor', labelKey: 'nav.monitor', icon: Activity },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useTranslation('common');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={`hidden md:flex flex-col border-r border-border bg-card flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className={`p-4 border-b border-border flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary overflow-hidden flex-shrink-0">
                <img src="/icon-512.png" alt={t('app.logoAlt')} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-lg text-primary tracking-tight truncate">{t('app.name')}</h1>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-xl bg-primary overflow-hidden">
              <img src="/icon-512.png" alt={t('app.logoAlt')} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        
        <div className="flex-1 py-2 overflow-y-auto">
          <nav className="space-y-0.5" aria-label={t('nav.mainNavigation')}>
            {navItems.map(item => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const label = t(item.labelKey);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-r-xl mr-2 group relative ${
                    active 
                      ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  title={sidebarCollapsed ? label : ''}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full p-3 flex items-center justify-center hover:bg-muted/50 transition-colors"
            title={sidebarCollapsed ? t('nav.expand') : t('nav.collapse')}
            aria-label={sidebarCollapsed ? t('nav.expand') : t('nav.collapse')}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {user && !sidebarCollapsed && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate font-bold">{user.name}</p>
              <button onClick={logout} className="p-1 text-muted-foreground hover:text-foreground" title={t('nav.logout')} aria-label={t('nav.logout')}><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
        {user && sidebarCollapsed && (
          <div className="p-3 border-t border-border flex justify-center">
            <button onClick={logout} className="p-1 text-muted-foreground hover:text-foreground" title={t('nav.logout')} aria-label={t('nav.logout')}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary overflow-hidden">
              <img src="/icon-512.png" alt={t('app.logoAlt')} className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display font-bold text-primary">{t('app.name')}</h1>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${active ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}>
                  <item.icon className="w-4 h-4" />{t(item.labelKey)}
                </Link>
              );
            })}
            {user && (
              <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground w-full">
                <LogOut className="w-4 h-4" /> {t('nav.logout')}
              </button>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
