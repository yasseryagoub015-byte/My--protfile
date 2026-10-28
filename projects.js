
"use strict";

const EVENT_APP_URL = "https://yasseryagoub015-byte.github.io/Events";
const MONEY_MANAGEMENT_APP_URL = "https://yasseryagoub015-byte.github.io/money-manager";

const projectUrls = {
  event: EVENT_APP_URL,
  money: MONEY_MANAGEMENT_APP_URL,
};

document.querySelectorAll("[data-project-link]").forEach((card) => {
  const url = projectUrls[card.dataset.projectLink];
  if (!url) return;

  let destination;

  try {
    destination = new URL(url);
  } catch {
    throw new Error(
      `Invalid application URL for ${card.dataset.projectLink}`
    );
  }

  if (!["http:", "https:"].includes(destination.protocol)) {
    throw new Error("Application URLs must use HTTP or HTTPS");
  }

  card.href = destination.href;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.tabIndex = 0;
  card.setAttribute("aria-disabled", "false");
  card.classList.add("is-configured");

  const action = card.querySelector(".portfolioProjectCard__action");
  if (action) action.textContent = "Open application";
});
