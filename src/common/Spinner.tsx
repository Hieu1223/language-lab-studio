import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  const { t } = useTranslation("common");
  return <Loader2 className={`animate-spin text-muted-foreground ${className}`} aria-label={t("states.loading")} />;
}
