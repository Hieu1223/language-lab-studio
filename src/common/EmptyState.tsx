interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  testId?: string;
}

/** Shared empty-state (doc §6.7.6). */
export function EmptyState({ title, description, icon, action, testId }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center py-16 px-6"
      data-testid={testId ?? "empty-state"}
    >
      {icon && <div className="opacity-40">{icon}</div>}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-snug">{description}</p>
      )}
      {action}
    </div>
  );
}
