import { useTranslation } from "react-i18next";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  testId?: string;
}

/** Full-page error state (doc §6.7.1). */
export function ErrorBanner({ message, onRetry, testId }: ErrorBannerProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center py-16 px-6"
      data-testid={testId ?? "error-banner"}
      role="alert"
    >
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
        >
          {t("actions.retry")}
        </button>
      )}
    </div>
  );
}
