// PC layouts
export function PCLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pc-layout">
      {children}
    </div>
  );
}
