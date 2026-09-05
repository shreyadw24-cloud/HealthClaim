import type { VerifyResult } from "../content/types";

// Same shape as HistoryItem in App.tsx, so entries logged from the content
// script show up correctly in the popup's History tab.
type Status = "supported" | "partial" | "insufficient" | "harmful";
type HistoryItem = { id: number; claim: string; status: Status; time: string; source: string };

function verdictToStatus(v: VerifyResult["verdict"]): Status {
  if (v === "Supported") return "supported";
  if (v === "Partially Supported") return "partial";
  if (v === "Insufficient Evidence") return "insufficient";
  return "harmful";
}

// Keeps chrome.storage.local from growing forever over months of use —
// 300 entries is far more than the popup's History tab needs to show, and
// keeps well under the storage quota.
const MAX_HISTORY_ITEMS = 300;

export async function saveToHistory(claim: string, result: VerifyResult, source: string) {
  const item: HistoryItem = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    claim,
    status: verdictToStatus(result.verdict),
    time: "Just now",
    source,
  };
  const stored = await chrome.storage.local.get<{ history?: HistoryItem[] }>("history");
  const list: HistoryItem[] = stored?.history ?? [];
  await chrome.storage.local.set({ history: [item, ...list].slice(0, MAX_HISTORY_ITEMS) });
}