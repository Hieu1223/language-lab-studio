import { createRoot } from "react-dom/client";
// Imported before App so i18next has registered its translator by the time
// module-scope `translate()` calls (e.g. lib/settings/schema.ts) evaluate.
import "@/i18n";
import App from "./app/App.tsx";
import "./index.css";
import "@/styles/tokens.css";
import "@/styles/reset.css";

createRoot(document.getElementById("root")!).render(<App />);
