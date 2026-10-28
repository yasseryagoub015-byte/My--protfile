"use strict";

const path = require("node:path");
const ENV_FILE = path.join(__dirname, ".env");
const dotenvResult = require("dotenv").config({ path: ENV_FILE });
const express = require("express");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";
const RECIPIENT_EMAIL = "yasseryagoub015@gmail.com";
const SMTP_SETTING_NAMES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];
const PROJECT_TYPES = new Set([
  "Website",
  "Mobile app",
  "E-commerce",
  "Software",
  "Other",
]);
const BUDGET_RANGES = new Set([
  "Under $500",
  "$500-$1,500",
  "$1,500-$5,000",
  "$5,000-$10,000",
  "Over $10,000",
  "Not sure yet",
]);
const CONTACT_METHODS = new Set(["Email", "Phone call", "WhatsApp"]);

function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Please submit a valid project request." };
  }

  const fields = [
    "name",
    "email",
    "phone",
    "company",
    "projectType",
    "projectTitle",
    "message",
    "features",
    "requirements",
    "budget",
    "timeline",
    "preferredContact",
    "notes",
    "website",
  ];
  const request = {};
  for (const field of fields) {
    if (typeof body[field] !== "string") {
      return { error: "Please complete all required project details." };
    }
    request[field] = body[field].trim();
  }

  const limits = {
    name: 120,
    email: 254,
    phone: 30,
    company: 160,
    projectType: 40,
    projectTitle: 160,
    message: 3000,
    features: 2000,
    requirements: 2000,
    budget: 40,
    timeline: 160,
    preferredContact: 40,
    notes: 2000,
    website: 200,
  };
  if (Object.entries(limits).some(([field, limit]) => request[field].length > limit)) {
    return { error: "One or more fields exceed the allowed length." };
  }

  const required = [
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
  if (required.some((field) => !request[field])) {
    return { error: "Please complete all required project details." };
  }
  if (request.name.length < 2 || request.message.length < 10) {
    return { error: "Please check your name and project description." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(request.email)) {
    return { error: "Enter a valid email address." };
  }
  if (request.phone.length < 5 || !/\d/.test(request.phone)) {
    return { error: "Enter a valid phone or WhatsApp number." };
  }
  if (!PROJECT_TYPES.has(request.projectType)) {
    return { error: "Choose a valid project type." };
  }
  if (!BUDGET_RANGES.has(request.budget)) {
    return { error: "Choose a valid budget range." };
  }
  if (!CONTACT_METHODS.has(request.preferredContact)) {
    return { error: "Choose a valid preferred contact method." };
  }
  if (request.website) {
    return { error: "Unable to process this request." };
  }

  return { request };
}

function buildEmailText(request) {
  return [
    "New project request",
    "",
    `Full name: ${request.name}`,
    `Email address: ${request.email}`,
    `Phone / WhatsApp: ${request.phone}`,
    `Company: ${request.company || "Not provided"}`,
    "",
    `Project type: ${request.projectType}`,
    `Project name: ${request.projectTitle}`,
    "",
    "Project description:",
    request.message,
    "",
    "Requested features and functionality:",
    request.features,
    "",
    "Recommendations and requirements:",
    request.requirements,
    "",
    `Budget range: ${request.budget}`,
    `Expected timeline: ${request.timeline}`,
    `Preferred contact method: ${request.preferredContact}`,
    "",
    "Additional notes:",
    request.notes || "None",
  ].join("\n");
}

function createApp({ emailConfigured = false, sendEmail, from } = {}) {
  const app = express();
  app.use(express.json({ limit: "20kb" }));

  app.post("/api/contact", async (req, res) => {
    const result = validateRequest(req.body);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    if (!emailConfigured || typeof sendEmail !== "function") {
      return res.status(503).json({
        message:
          "Email delivery is not configured yet. Please email yasseryagoub015@gmail.com directly.",
      });
    }

    const { request } = result;
    try {
      await sendEmail({
        from,
        to: RECIPIENT_EMAIL,
        replyTo: request.email,
        subject: `New project request: ${request.projectTitle.replace(
          /[\r\n]+/g,
          " "
        )}`,
        text: buildEmailText(request),
      });
      return res.status(201).json({
        message: "Thanks — your project request was sent successfully.",
      });
    } catch (error) {
      console.error("Project request email delivery failed:", error);
      return res.status(502).json({
        message:
          "We could not send your request right now. Your information is still here; please try again or email me directly.",
      });
    }
  });

  app.get("/", (req, res) =>
    res.sendFile(path.join(__dirname, "index.html"))
  );
  app.get(
    [
      "/index.html",
      "/app.js",
      "/contact.js",
      "/projects.js",
      "/main.css",
      "/contact.css",
    ],
    (req, res, next) =>
      res.sendFile(path.join(__dirname, req.path.slice(1)), (error) => {
        if (error) next(error);
      })
  );
  app.use(
    "/textures",
    express.static(path.join(__dirname, "textures"), { dotfiles: "deny" })
  );
  app.use((req, res) => {
    res.status(404).json({ message: "Not found." });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status === 413 ? 413 : 400;
    res.status(status).json({
      message:
        status === 413
          ? "The submitted request is too large."
          : "Please submit a valid project request.",
    });
  });

  return app;
}

function findMissingSmtpSettings(environment = process.env) {
  return SMTP_SETTING_NAMES.filter((name) => {
    const value = environment[name];
    return (
      typeof value !== "string" ||
      !value.trim() ||
      /^(your[-_]|replace[-_]|paste[-_]|<.*>|YOUR_)/i.test(value.trim())
    );
  });
}

function createTransport(environment = process.env) {
  const missingSettings = findMissingSmtpSettings(environment);
  if (missingSettings.length > 0) {
    return null;
  }

  const port = Number(environment.SMTP_PORT.trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  const secureSetting = environment.SMTP_SECURE.trim().toLowerCase();
  if (!["true", "false"].includes(secureSetting)) {
    throw new Error('SMTP_SECURE must be "true" or "false".');
  }
  const secure = secureSetting === "true";
  return {
    from: environment.SMTP_FROM.trim(),
    transporter: nodemailer.createTransport({
      host: environment.SMTP_HOST.trim(),
      port,
      secure,
      auth: {
        user: environment.SMTP_USER.trim(),
        pass: environment.SMTP_PASS.trim(),
      },
    }),
  };
}

if (require.main === module) {
  const missingSettings = findMissingSmtpSettings();
  const mailConfig = createTransport();
  const app = createApp({
    emailConfigured: Boolean(mailConfig),
    from: mailConfig && mailConfig.from,
    sendEmail: mailConfig
      ? (message) => mailConfig.transporter.sendMail(message)
      : undefined,
  });

  if (missingSettings.length > 0) {
    const envFileStatus =
      dotenvResult.error && dotenvResult.error.code === "ENOENT"
        ? ` The project-root .env file was not found at ${ENV_FILE}.`
        : "";
    console.warn(
      `SMTP is not configured.${envFileStatus} Set valid values for: ${missingSettings.join(
        ", "
      )}. Credential values are not displayed.`
    );
  }

  app.listen(PORT, HOST, () => {
    console.log(`Portfolio server listening at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  buildEmailText,
  createApp,
  createTransport,
  findMissingSmtpSettings,
  validateRequest,
};
