import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Video, Search, History, Brain, Type, CreditCard, Menu, X, BookText, LogOut, BookMarked, Languages, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { path: '/youtube', label: 'Phiên dịch', icon: Video },
  { path: '/vocabulary', label: 'Từ vựng', icon: BookOpen },
  { path: '/grammar', label: 'Ngữ pháp', icon: BookText },
  { path: '/manga', label: 'Manga', icon: BookMarked },
  { path: '/translation-practice', label: 'Luyện dịch', icon: Languages },
  { path: '/practice', label: 'Luyện câu', icon: Brain },
  { path: '/public', label: 'Công khai', icon: Search },
  { path: '/history', label: 'Lịch sử', icon: History },
  { path: '/tokenizer', label: 'Tokenizer', icon: Type },
  { path: '/pricing', label: 'Mua credit', icon: CreditCard },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

const publicPaths = ['/public', '/login', '/landing'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const visibleNav = user ? navItems : navItems.filter(n => publicPaths.includes(n.path));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">日</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-primary tracking-tight">NihonGo</h1>
              <p className="text-[10px] text-muted-foreground font-mono">日本語 · Học tiếng Nhật</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleNav.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-r-xl mr-2 ${
                  active ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate font-bold">{user.name}</p>
              <button onClick={logout} className="p-1 text-muted-foreground hover:text-foreground">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">日</span>
            </div>
            <h1 className="font-display font-bold text-primary">NihonGo</h1>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border">
            {visibleNav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    active ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground w-full">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
