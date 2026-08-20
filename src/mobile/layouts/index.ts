// Mobile layouts
export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background mobile-layout">
      {children}
    </div>
  );
}
