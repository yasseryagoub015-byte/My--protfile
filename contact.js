/* Contact panel interactions, validation, and project-request submission. */
(() => {
  "use strict";

  const panel = document.getElementById("contactPanel");
  const trigger = document.getElementById("contactTrigger");
  const form = document.getElementById("contactForm");
  if (!panel || !form) return;

  const statusEl = form.querySelector("[data-contact-status]");
  const submitBtn = form.querySelector("[type=submit]");
  const submitLabel = submitBtn.querySelector("span");
  const scroller = panel.querySelector(".contactPanel__inner");
  const fieldNames = [
    "name",
    "email",
    "phone",
    "projectType",
    "projectTitle",
    "message",
    "features",
    "requirements",
    "budget",
    "timeline",
    "preferredContact",
  ];
  const fields = Object.fromEntries(
    [...fieldNames, "company", "notes"].map((name) => [
      name,
      form.elements.namedItem(name),
    ])
  );
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  const rules = {
    name: (value) =>
      value.trim().length < 2 ? "Please enter your full name" : "",
    email: (value) =>
      !EMAIL_PATTERN.test(value.trim()) ? "Enter a valid email address" : "",
    phone: (value) =>
      value.trim().length < 5 || !/\d/.test(value)
        ? "Enter a valid phone or WhatsApp number"
        : "",
    projectType: (value) => (!value ? "Choose a project type" : ""),
    projectTitle: (value) =>
      value.trim().length < 2 ? "Enter a project name or title" : "",
    message: (value) =>
      value.trim().length < 10
        ? "Describe your project in at least 10 characters"
        : "",
    features: (value) =>
      value.trim().length === 0 ? "List the features you need" : "",
    requirements: (value) =>
      value.trim().length === 0
        ? "Add your recommendations or requirements"
        : "",
    budget: (value) => (!value ? "Choose a budget range" : ""),
    timeline: (value) =>
      value.trim().length === 0 ? "Add an expected timeline" : "",
    preferredContact: (value) =>
      !value ? "Choose a preferred contact method" : "",
  };

  let lastFocused = null;
  let submitAttempted = false;
  let isSubmitting = false;

  function openPanel() {
    lastFocused = document.activeElement;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    window.setTimeout(() => fields.name.focus({ preventScroll: true }), 450);
  }

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.classList.remove("is-success", "is-error");
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    clearStatus();
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function revealInPanel(element) {
    if (!scroller || !element) return;
    const box = scroller.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const margin = 24;
    if (rect.top < box.top) {
      scroller.scrollTop -= box.top - rect.top + margin;
    } else if (rect.bottom > box.bottom) {
      scroller.scrollTop += rect.bottom - box.bottom + margin;
    }
  }

  function showStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    statusEl.classList.add(kind === "success" ? "is-success" : "is-error");
    revealInPanel(statusEl);
  }

  function setFieldState(name, error) {
    const input = fields[name];
    const field = input.closest(".field");
    const errorEl = field.querySelector("[data-field-error]");
    field.classList.toggle("is-invalid", Boolean(error));
    field.classList.toggle("is-filled", input.value.trim().length > 0);
    input.setAttribute("aria-invalid", error ? "true" : "false");
    if (errorEl) errorEl.textContent = error || "";
    return !error;
  }

  function validateField(name) {
    return setFieldState(name, rules[name](fields[name].value));
  }

  function validateForm() {
    submitAttempted = true;
    return Object.keys(rules).map(validateField).every(Boolean);
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute("aria-busy", String(isLoading));
    submitLabel.textContent = isLoading
      ? "Sending project request..."
      : "Send Project Request";
  }

  function buildPayload() {
    return Object.fromEntries(
      [...fieldNames, "company", "notes", "website"].map((name) => {
        const value = form.elements.namedItem(name).value;
        return [name, value.trim()];
      })
    );
  }

  if (trigger) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openPanel();
    });
  }

  panel.querySelectorAll("[data-contact-close]").forEach((element) => {
    element.addEventListener("click", closePanel);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      closePanel();
    }
  });

  ["wheel", "touchmove"].forEach((eventName) => {
    panel.addEventListener(
      eventName,
      (event) => {
        if (event.target.closest(".contactPanel__inner")) {
          event.stopPropagation();
          return;
        }
        event.preventDefault();
      },
      { passive: false }
    );
  });

  Object.entries(fields).forEach(([name, input]) => {
    if (!input) return;
    input.addEventListener("input", () => {
      const field = input.closest(".field");
      field.classList.toggle("is-filled", input.value.trim().length > 0);
      if (field.classList.contains("is-invalid") && rules[name]) {
        validateField(name);
      }
    });
    input.addEventListener("change", () => {
      if (fieldNames.includes(name) && submitAttempted) validateField(name);
    });
    input.addEventListener("blur", () => {
      input.closest(".field").classList.remove("is-focused");
      if (rules[name] && (submitAttempted || input.value.trim())) {
        validateField(name);
      }
    });
    input.addEventListener("focus", () =>
      input.closest(".field").classList.add("is-focused")
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      showStatus("Please fix the highlighted fields", "error");
      const firstInvalid = form.querySelector(
        ".is-invalid .field__control"
      );
      if (firstInvalid) {
        revealInPanel(firstInvalid);
        firstInvalid.focus({ preventScroll: true });
      }
      return;
    }

    isSubmitting = true;
    setLoading(true);
    clearStatus();

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (result && result.message) ||
            "Your request could not be sent. Please try again."
        );
      }
      if (!result || typeof result.message !== "string") {
        throw new Error(
          "The server did not confirm your request. Please try again."
        );
      }

      showStatus(result.message, "success");
      form.reset();
      submitAttempted = false;
      Object.keys(rules).forEach((name) => setFieldState(name, ""));
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Unable to send your request right now. Please try again.",
        "error"
      );
    } finally {
      isSubmitting = false;
      setLoading(false);
    }
  });

  if (window.location.hash === "#contact") openPanel();
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#contact") openPanel();
  });
})();
