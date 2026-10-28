"use strict";

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");
const {
  createApp,
  createTransport,
  findMissingSmtpSettings,
} = require("../server");

const projectRequest = {
  name: "Taylor Example",
  email: "taylor@example.com",
  phone: "+1 555 0100",
  company: "Example Studio",
  projectType: "Website",
  projectTitle: "Studio website",
  message: "A website for my design studio.",
  features: "Portfolio, contact form, and project gallery.",
  requirements: "Accessible, responsive, and easy to update.",
  budget: "$1,500-$5,000",
  timeline: "Within three months",
  preferredContact: "Email",
  notes: "Please contact me in the afternoon.",
  website: "",
};

test("reports missing SMTP setting names without exposing credential values", () => {
  const missing = findMissingSmtpSettings({});

  assert.deepEqual(missing, [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ]);
});

test("treats the example SMTP password placeholder as missing", () => {
  const missing = findMissingSmtpSettings({
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "sender@gmail.com",
    SMTP_PASS: "PASTE_YOUR_REAL_APP_PASSWORD",
    SMTP_FROM: "sender@gmail.com",
  });

  assert.deepEqual(missing, ["SMTP_PASS"]);
});

test("detects complete SMTP settings and passes the app password to Nodemailer", () => {
  const environment = {
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "sender@gmail.com",
    SMTP_PASS: "test-app-password",
    SMTP_FROM: "sender@gmail.com",
  };

  assert.deepEqual(findMissingSmtpSettings(environment), []);
  assert.ok(createTransport(environment));
});

async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("sends every project field to the fixed recipient after mail delivery succeeds", async () => {
  let email;
  const app = createApp({
    emailConfigured: true,
    from: "portfolio@example.com",
    sendEmail: async (message) => {
      email = message;
    },
  });

  await withServer(app, async (origin) => {
    const response = await fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectRequest),
    });

    assert.equal(response.status, 201);
    assert.match((await response.json()).message, /sent successfully/i);
  });

  assert.equal(email.to, "yasseryagoub015@gmail.com");
  assert.equal(email.replyTo, projectRequest.email);
  assert.equal(email.subject, "New project request: Studio website");
  for (const value of Object.values(projectRequest)) {
    if (value) assert.ok(email.text.includes(value), `email missing: ${value}`);
  }
  assert.match(email.text, /Company: Example Studio/);
  assert.match(email.text, /Additional notes:\nPlease contact me in the afternoon\./);
});

test("rejects invalid required fields before attempting email delivery", async () => {
  let attemptedDelivery = false;
  const app = createApp({
    emailConfigured: true,
    sendEmail: async () => {
      attemptedDelivery = true;
    },
  });

  await withServer(app, async (origin) => {
    const response = await fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...projectRequest, email: "not-an-email" }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /valid email/i);
  });

  assert.equal(attemptedDelivery, false);
});

test("reports missing SMTP setup without claiming a successful submission", async () => {
  const app = createApp();

  await withServer(app, async (origin) => {
    const response = await fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectRequest),
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /not configured/i);
  });
});

test("reports SMTP failures and keeps the request unsuccessful", async () => {
  const app = createApp({
    emailConfigured: true,
    sendEmail: async () => {
      throw new Error("simulated SMTP failure");
    },
  });

  await withServer(app, async (origin) => {
    const response = await fetch(`${origin}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectRequest),
    });

    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /could not send/i);
  });
});

test("serves the site entry point and its local project script", async () => {
  const app = createApp();

  await withServer(app, async (origin) => {
    for (const file of ["/", "/projects.js", "/contact.js"]) {
      const response = await fetch(`${origin}${file}`);
      assert.equal(response.status, 200, `${file} should be served`);
    }
  });
});
