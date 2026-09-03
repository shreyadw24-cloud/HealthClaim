import { BUTTON_CSS, injectFontLink } from "./styles";

export type ButtonState = "idle" | "loading" | "no-claim";

export interface VerifyButtonHandle {
  /** The element to insert into the page (a custom element hosting a shadow root). */
  el: HTMLElement;
  setState: (state: ButtonState) => void;
}

const ICON_SHIELD = `
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5l5.5 2v4c0 3.6-2.3 6.4-5.5 7-3.2-.6-5.5-3.4-5.5-7v-4l5.5-2z" fill="#2DD4BF" opacity="0.9"/>
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