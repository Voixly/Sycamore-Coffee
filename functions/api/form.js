/*
  Cloudflare Pages Function serving POST /api/form.

  Every form on the site posts here and this hands the submission to Resend.
  It has to run server-side: the Resend API blocks browser calls by design so
  the API key is never shipped to the client.

  Field names differ from form to form, so nothing here is hardcoded to a
  single form. Anything submitted is emailed except keys starting with "_",
  which are reserved for control fields. Adding a field to a form needs no
  change here.

  Required Pages environment variables:
    RESEND_API_KEY  secret, sending permission is enough
    FORM_TO         recipient(s), comma separated
    FORM_FROM       sender, must be on a domain verified in Resend
*/

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SUCCESS_PATH = "/thank-you/";
const FAILURE_PATH = "/message-failed/";
const DEFAULT_SUBJECT = "Sycamore Coffee Co website form";

/* Long enough for the vendor product and permit textareas, short enough that
   a bot cannot post a megabyte of link spam. */
const MAX_FIELD_LEN = 5000;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const toLabel = (key) => {
  const words = key.replace(/[_-]+/g, " ").trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

const goTo = (request, path, why) => {
  const url = new URL(path, request.url);

  /* Preview hosts only: names the failure without leaking Resend's body. */
  if (why && url.hostname.endsWith("pages.dev")) {
    url.searchParams.set("why", why);
  }

  return Response.redirect(url.toString(), 303);
};

/* Checkbox and radio groups can repeat a key; join rather than drop. */
const collect = (form) => {
  const fields = new Map();

  for (const [key, raw] of form.entries()) {
    if (key.startsWith("_")) {
      continue;
    }

    const value = String(raw).trim().slice(0, MAX_FIELD_LEN);

    if (!value) {
      continue;
    }

    const existing = fields.get(key);
    fields.set(key, existing ? `${existing}, ${value}` : value);
  }

  return fields;
};

const emailSubject = (form, fields) => {
  const theirs = String(fields.get("subject") || "").trim();

  if (theirs) {
    return theirs.slice(0, 200);
  }

  const preset = String(form.get("_subject") || DEFAULT_SUBJECT).trim();
  const service = String(fields.get("service") || "").trim();

  if (preset === "Request to Book" && service) {
    return `Request to Book (${service})`.slice(0, 200);
  }

  return (preset || DEFAULT_SUBJECT).slice(0, 200);
};

const buildText = (fields) => {
  const lines = [];

  for (const [key, value] of fields) {
    lines.push(`${toLabel(key)}: ${value}`);
  }

  return lines.join("\n");
};

const buildHtml = (fields, subject) => {
  const rows = [];

  for (const [key, value] of fields) {
    rows.push(
      `<tr>
         <th align="left" valign="top" style="padding:6px 14px 6px 0;color:#336882;font:600 13px/1.4 system-ui,sans-serif;white-space:nowrap">${escapeHtml(
           toLabel(key)
         )}</th>
         <td valign="top" style="padding:6px 0;color:#1e4152;font:400 15px/1.5 system-ui,sans-serif">${escapeHtml(
           value
         ).replaceAll("\n", "<br>")}</td>
       </tr>`
    );
  }

  return `<div style="background:#fff8eb;padding:24px">
      <h1 style="margin:0 0 16px;color:#1e4152;font:700 18px/1.3 system-ui,sans-serif">${escapeHtml(
        subject
      )}</h1>
      <table cellpadding="0" cellspacing="0" role="presentation">${rows.join(
        ""
      )}</table>
    </div>`;
};

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    console.error("form: RESEND_API_KEY is not set");

    return goTo(request, FAILURE_PATH, "missing-key");
  }

  let form;

  try {
    form = await request.formData();
  } catch (err) {
    console.error("form: unreadable body", err);

    return goTo(request, FAILURE_PATH, "bad-body");
  }

  /* Bots fill the hidden honeypot. Report success so they do not retune and
     retry, but send nothing. */
  if (String(form.get("_honey") || "").trim()) {
    return goTo(request, SUCCESS_PATH);
  }

  const fields = collect(form);

  if (fields.size === 0) {
    return goTo(request, FAILURE_PATH, "empty");
  }

  const subject = emailSubject(form, fields);
  const sender = fields.get("email");

  const payload = {
    from: env.FORM_FROM,
    to: String(env.FORM_TO || "")
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean),
    subject,
    text: buildText(fields),
    html: buildHtml(fields, subject),
  };

  /* Lets staff reply straight to the person who filled the form. */
  if (sender && isEmail(sender)) {
    payload.reply_to = sender;
  }

  if (!payload.from || payload.to.length === 0) {
    console.error("form: FORM_FROM or FORM_TO is not set");

    return goTo(request, FAILURE_PATH, "missing-from");
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`form: Resend returned ${res.status}`, await res.text());

    return goTo(request, FAILURE_PATH, `resend-${res.status}`);
  }

  return goTo(request, SUCCESS_PATH);
}
