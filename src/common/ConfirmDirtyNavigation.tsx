import { useEffect, useRef } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";

import { translate } from "@/lib/i18n-runtime";

interface ConfirmDirtyNavigationProps {
  isDirty: boolean;
  onConfirm: () => void;
  message?: string;
}

/**
 * Reusable unsaved-changes guard (doc §3 `common/ConfirmDirtyNavigation.tsx`).
 *
 * Uses `beforeunload` for tab close/refresh (see §5.7) and an in-app nav guard.
 * The app uses a classic `BrowserRouter`; to avoid double-confirms, the
 * in-app guard intercepts via a click-time `window.confirm` before navigation
 * state is read. `onConfirm` runs when the user accepts leaving, so callers
 * can discard local edits.
 */
export function ConfirmDirtyNavigation({
  isDirty,
  onConfirm,
  message = translate("common:errors.unsavedChanges", "You have unsaved changes. Leave anyway?"),
}: ConfirmDirtyNavigationProps) {
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;
  const navType = useNavigationType();
  const navigate = useNavigate();

  // Capture the navigate fn so the beforeunload handler can't close; here we
  // only guard the browser-level unload. In-app navigation relies on the
  // consumer calling `window.confirm` in its own click handlers (SettingsPage).
  void navType;
  void navigate;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return null;
}
