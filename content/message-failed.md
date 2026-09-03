---
title: That message did not send
url: /message-failed/
description: Something went wrong sending your message. Please email or call us instead.
noindex: true
sitemap:
  disable: true
---

Something went wrong on our end and your message was not sent. Nothing you did
caused this, and unfortunately we did not receive it.

Please email [info@sycamorecoffeeco.com](mailto:info@sycamorecoffeeco.com) or
call [(936) 520-7073](tel:+19365207073) and we will pick it up from there.

<p id="form-why" hidden></p>
<script>
(() => {
  const why = new URLSearchParams(location.search).get("why");
  const notes = {
    "missing-key": "RESEND_API_KEY is not set on this Cloudflare environment (Production and Preview are separate).",
    "missing-from": "FORM_FROM or FORM_TO is not set on this Cloudflare environment.",
    "bad-email": "Email must include @ and a domain, like name@example.com.",
    "turnstile-missing": "Complete the spam check before sending.",
    "turnstile-error": "The spam check could not reach Cloudflare. Try again in a moment.",
    "resend-401": "Resend rejected the API key (401). Check RESEND_API_KEY.",
    "resend-403": "Resend rejected the From address (403). Verify sycamorecoffeeco.com in Resend, or until then send from onboarding@resend.dev to your Resend account email only.",
    "resend-422": "Resend rejected the payload (422). Check FORM_FROM and FORM_TO are valid addresses.",
  };
  const el = document.getElementById("form-why");
  if (!why || !el) {
    return;
  }
  el.hidden = false;
  el.textContent = notes[why] || ("Send failed (" + why + "). Check Pages Function logs.");
})();
</script>
