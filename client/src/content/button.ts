import { BUTTON_CSS, injectFontLink } from "./styles";

export type ButtonState = "idle" | "loading" | "no-claim";

export interface VerifyButtonHandle {
  /** The element to insert into the page (a custom element hosting a shadow root). */
  el: HTMLElement;
  setState: (state: ButtonState) => void;
}

const ICON_SHIELD = `
  <svg width="13" height="7" viewBox="0 0 92 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="0,24 16,24 22,10 28,38 34,4 40,24 92,24" stroke="#20B2AA" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>
`;

/**
 * Builds a "Verify Health Claim" button, isolated inside its own shadow root
 * so it never inherits (or leaks) styles on the host page.
 */
export function createVerifyButton(onClick: () => void): VerifyButtonHandle {
  const host = document.createElement("healthclaim-button");
  host.style.setProperty("visibility", "visible", "important");
  host.style.setProperty("display", "inline-flex", "important");
  host.style.display = "inline-flex";
  host.style.verticalAlign = "middle";
  host.style.marginLeft = "6px";

  const shadow = host.attachShadow({ mode: "open" });
  injectFontLink(shadow);

  const style = document.createElement("style");
  style.textContent = BUTTON_CSS;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "hc-root";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "hc-btn";
  button.innerHTML = `${ICON_SHIELD}<span class="hc-btn-label">Verify Health Claim</span>`;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  root.appendChild(button);
  shadow.appendChild(root);

  const setState = (state: ButtonState) => {
    if (state === "loading") {
      button.disabled = true;
      button.innerHTML = `<span class="hc-btn-spinner"></span><span class="hc-btn-label">Verifying…</span>`;
    } else if (state === "no-claim") {
      button.disabled = false;
      button.innerHTML = `${ICON_SHIELD}<span class="hc-btn-label">No claim detected</span>`;
      setTimeout(() => setState("idle"), 2200);
    } else {
      button.disabled = false;
      button.innerHTML = `${ICON_SHIELD}<span class="hc-btn-label">Verify Health Claim</span>`;
    }
  };

  return { el: host, setState };
}