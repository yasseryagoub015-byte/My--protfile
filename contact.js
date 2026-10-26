/* Contact panel: open/close, validation, and email delivery via Web3Forms.
 * Only CONTACT_ACCESS_KEY needs to be filled in — see README instructions.
 */
(() => {
  "use strict";

  // ---- 1. Paste your Web3Forms access key here (https://web3forms.com) ----
  const CONTACT_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";
  const CONTACT_ENDPOINT = "https://api.web3forms.com/submit";
  const RECIPIENT_EMAIL = "yasseryagoub015@gmail.com";
  // -------------------------------------------------------------------------

  const KEY_IS_CONFIGURED =
    CONTACT_ACCESS_KEY &&
    CONTACT_ACCESS_KEY !== "YOUR_WEB3FORMS_ACCESS_KEY" &&
    /^[A-Za-z0-9-]{16,}$/.test(CONTACT_ACCESS_KEY);

  const panel = document.getElementById("contactPanel");
  const trigger = document.getElementById("contactTrigger");
  const form = document.getElementById("contactForm");
  if (!panel || !form) return;

  const statusEl = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector("[type=submit]");
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    message: form.elements.message,
  };

  /* ------------------------------ open / close ----------------------------- */

  let lastFocused = null;

  function openPanel() {
    lastFocused = document.activeElement;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    window.setTimeout(() => fields.name.focus({ preventScroll: true }), 450);
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    clearStatus();
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel();
    });
  }

  panel.querySelectorAll("[data-contact-close]").forEach((el) => {
    el.addEventListener("click", closePanel);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
  });

  // Keep the smooth-scroll page from moving while the form is being used.
  ["wheel", "touchmove"].forEach((evt) => {
    panel.addEventListener(
      evt,
      (e) => {
        if (e.target.closest(".contactPanel__inner")) {
          e.stopPropagation();
          return;
        }
        e.preventDefault();
      },
      { passive: false }
    );
  });

  /* ------------------------------- validation ------------------------------ */

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  const RULES = {
    name: (v) =>
      v.trim().length === 0
        ? "Please enter your name"
        : v.trim().length < 2
        ? "Your name is too short"
        : "",
    email: (v) =>
      v.trim().length === 0
        ? "Please enter your email"
        : EMAIL_PATTERN.test(v.trim())
        ? ""
        : "That email doesn't look right",
    message: (v) =>
      v.trim().length === 0
        ? "Please describe what you want built"
        : v.trim().length < 10
        ? "A few more details, please (min. 10 characters)"
        : v.trim().length > 3000
        ? "Please keep it under 3000 characters"
        : "",
  };

  function setFieldState(name, error) {
    const field = fields[name].closest(".field");
    const errorEl = field.querySelector("[data-field-error]");
    field.classList.toggle("is-invalid", Boolean(error));
    field.classList.toggle("is-filled", fields[name].value.trim().length > 0);
    fields[name].setAttribute("aria-invalid", error ? "true" : "false");
    if (errorEl) errorEl.textContent = error || "";
    return !error;
  }

  function validateField(name) {
    return setFieldState(name, RULES[name](fields[name].value));
  }

  let submitAttempted = false;

  function validateForm() {
    submitAttempted = true;
    return Object.keys(RULES).map(validateField).every(Boolean);
  }

  Object.keys(RULES).forEach((name) => {
    const input = fields[name];
    input.addEventListener("input", () => {
      const field = input.closest(".field");
      field.classList.toggle("is-filled", input.value.trim().length > 0);
      // Re-validate only once an error is showing, so typing feels free.
      if (field.classList.contains("is-invalid")) validateField(name);
    });
    // Don't scold a visitor for a field they never wrote in.
    input.addEventListener("blur", () => {
      input.closest(".field").classList.remove("is-focused");
      if (submitAttempted || input.value.trim().length > 0) validateField(name);
    });
    input.addEventListener("focus", () =>
      input.closest(".field").classList.add("is-focused")
    );
  });

  /* --------------------------------- status -------------------------------- */

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.classList.remove("is-success", "is-error");
  }

  function showStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    statusEl.classList.add(kind === "success" ? "is-success" : "is-error");
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.querySelector("span").textContent = isLoading
      ? "SENDING"
      : "SEND MESSAGE";
  }

  function buildPayload() {
    return {
      access_key: CONTACT_ACCESS_KEY,
      subject: "New build request from " + fields.name.value.trim(),
      from_name: fields.name.value.trim(),
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      message: fields.message.value.trim(),
      botcheck: form.elements.website.value,
    };
  }

  // Opens the visitor's mail client pre-filled — used when no key is
  // configured yet, or when the network request fails.
  function mailtoFallback(payload) {
    const body =
      "Name: " +
      payload.name +
      "\nEmail: " +
      payload.email +
      "\n\nMessage:\n" +
      payload.message;
    const href =
      "mailto:" +
      RECIPIENT_EMAIL +
      "?subject=" +
      encodeURIComponent("Build request from " + payload.name) +
      "&body=" +
      encodeURIComponent(body);
    window.location.href = href;
  }

  async function sendViaWeb3Forms(payload) {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json().catch(() => ({})) };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (form.elements.website.value) return; // bot
    if (!validateForm()) {
      showStatus("Please fix the highlighted fields", "error");
      const firstInvalid = form.querySelector(".is-invalid .field__control");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const payload = buildPayload();

    if (!KEY_IS_CONFIGURED) {
      mailtoFallback(payload);
      showStatus(
        "Opening your mail app to send to " + RECIPIENT_EMAIL,
        "success"
      );
      return;
    }

    setLoading(true);
    clearStatus();

    try {
      const { ok, data } = await sendViaWeb3Forms(payload);
      if (ok && data.success) {
        showStatus("Message sent — I'll reply within 24h.", "success");
        form.reset();
        Object.keys(RULES).forEach((name) =>
          setFieldState(name, "")
        );
      } else {
        showStatus(
          data.message || "Something went wrong. Please try again.",
          "error"
        );
      }
    } catch (err) {
      mailtoFallback(payload);
      showStatus("Network issue — opened your mail app instead.", "error");
    } finally {
      setLoading(false);
    }
  });

  // Deep-link support: index.html#contact opens the panel (e.g. from a card).
  if (window.location.hash === "#contact") openPanel();
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#contact") openPanel();
  });
})();
