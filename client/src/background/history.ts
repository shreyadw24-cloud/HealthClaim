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

export async function saveToHistory(claim: string, result: VerifyResult, source: string) {
  const item: HistoryItem = {
    id: Date.now(),
    claim,
    status: verdictToStatus(result.verdict),
    time: "Just now",
    source,
  };
  const stored = await chrome.storage.local.get<{ history?: HistoryItem[] }>("history");
  const list: HistoryItem[] = stored?.history ?? [];
  await chrome.storage.local.set({ history: [item, ...list] });
}