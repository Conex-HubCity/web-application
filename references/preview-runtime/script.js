"use strict";

const splash = document.querySelector(".cnx-splash");
const notice = document.querySelector(".preview-notice");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const sessionKey = "conex:standalone:introduction-seen:v1";
const originalOverflow = document.body.style.overflow;
let endTimer;
let exitTimer;
let noticePending = true;

function updateScrollLock() {
  document.body.style.overflow = splash.open || notice.open ? "hidden" : originalOverflow;
}

function showNotice() {
  if (noticePending && !notice.open) notice.showModal();
  updateScrollLock();
}

function dismissSplash() {
  clearTimeout(endTimer);
  if (!splash.open || splash.dataset.leaving === "true") return;
  try { sessionStorage.setItem(sessionKey, "true"); } catch { /* Optional storage. */ }
  splash.dataset.leaving = "true";
  exitTimer = setTimeout(() => {
    splash.close();
    showNotice();
  }, reducedMotion.matches ? 0 : 500);
}

function playSplash() {
  clearTimeout(endTimer);
  clearTimeout(exitTimer);
  if (splash.open) splash.close();
  splash.dataset.leaving = "false";
  splash.getBoundingClientRect();
  splash.showModal();
  updateScrollLock();
  endTimer = setTimeout(dismissSplash, reducedMotion.matches ? 1000 : 4900);
}

splash.addEventListener("cancel", event => { event.preventDefault(); dismissSplash(); });
document.querySelector(".splash-skip").addEventListener("click", dismissSplash);
document.querySelector(".intro-replay").addEventListener("click", playSplash);
notice.addEventListener("close", () => {
  noticePending = false;
  updateScrollLock();
  document.querySelector(".welcome-nav a")?.focus({ preventScroll: true });
});
document.querySelector(".preview-accept").addEventListener("click", () => notice.close());

function selectJourney(role) {
  const journey = journeys[role];
  if (!journey) return;
  document.querySelectorAll(".cnx-journey-switch button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.journey === role));
  });
  const image = document.querySelector(".cnx-journey-photo img");
  image.src = `./assets/${journey.image}`;
  const caption = document.querySelector(".cnx-journey-photo p");
  caption.replaceChildren();
  const symbol = document.createElement("span");
  symbol.setAttribute("aria-hidden", "true"); symbol.textContent = "✳";
  caption.append(symbol, document.createTextNode(journey.caption));
  document.querySelector("#journey-role-title").textContent = journey.heading;
  const list = document.querySelector(".cnx-journey-steps");
  list.replaceChildren(...journey.steps.map(([title, text], index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = "cnx-step-number"; number.textContent = String(index + 1).padStart(2, "0");
    const content = document.createElement("div");
    const heading = document.createElement("h4"); heading.textContent = title;
    const paragraph = document.createElement("p"); paragraph.textContent = text;
    content.append(heading, paragraph); item.append(number, content); return item;
  }));
}
document.querySelectorAll("[data-journey]").forEach(control => {
  control.addEventListener("click", () => selectJourney(control.dataset.journey));
});

let seen = false;
try { seen = sessionStorage.getItem(sessionKey) === "true"; } catch { /* file:// can disable storage. */ }
if (seen) showNotice(); else playSplash();
