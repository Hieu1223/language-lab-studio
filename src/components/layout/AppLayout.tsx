import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Video, Search, History, Brain, Type, CreditCard, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Transcribe', icon: Video },
  { path: '/flashcards', label: 'Flashcards', icon: BookOpen },
  { path: '/public', label: 'Public', icon: Search },
  { path: '/history', label: 'History', icon: History },
  { path: '/practice', label: 'Practice', icon: Brain },
  { path: '/tokenizer', label: 'Tokenizer', icon: Type },
  { path: '/pricing', label: 'Pricing', icon: CreditCard },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="font-display font-bold text-lg text-primary tracking-tight">NihonGo</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">日本語 · transcriber + SRS</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-muted text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card">
          <h1 className="font-display font-bold text-primary">VietLearn</h1>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    active ? 'bg-muted text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
