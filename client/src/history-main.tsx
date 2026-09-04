import React from "react";
import ReactDOM from "react-dom/client";
import { HistoryScreen } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="min-h-full flex items-center justify-center py-12 px-6" style={{ background: "#EAF6F4" }}>
      <HistoryScreen onBack={() => window.close()} />
    </div>
  </React.StrictMode>,
);