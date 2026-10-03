(() => {
  "use strict";

  const site = window.GAS_SITE || {};
  const lead = document.getElementById("authLead");
  const status = document.getElementById("authStatus");
  const done = document.getElementById("authDone");
  const buttonHost = document.getElementById("googleButton");
  const params = new URLSearchParams(window.location.search);
  const fromExtension = params.get("ext") === "1";

  if (params.get("gas_session")) {
    setStatus("Signed in. Return to the extension.");
    if (done) done.hidden = false;
    if (buttonHost) buttonHost.hidden = true;
    return;
  }

  if (!site.googleAuthEnabled || !site.googleClientId) {
    if (lead) {
      lead.textContent = "Google sign-in is turned off. Use the GAS1 license key from your checkout email.";
    }
    return;
  }

  window.onGoogleLibraryLoad = renderButton;
  if (window.google && google.accounts && google.accounts.id) renderButton();

  function renderButton() {
    if (!buttonHost || buttonHost.dataset.ready === "1") return;
    if (!window.google || !google.accounts || !google.accounts.id) return;
    buttonHost.dataset.ready = "1";
    google.accounts.id.initialize({
      client_id: site.googleClientId,
      callback: handleCredential
    });
    google.accounts.id.renderButton(buttonHost, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 280
    });
  }

  async function handleCredential(response) {
    const idToken = response && response.credential;
    if (!idToken) {
      setStatus("Google did not return a sign-in token.");
      return;
    }
    setStatus("Signing in…");
    try {
      const result = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const body = await result.json();
      if (!result.ok || !body.ok) {
        setStatus(body.error || "Could not sign in.");
        return;
      }
      if (fromExtension && body.token) {
        const next = new URL(window.location.href);
        next.searchParams.set("ext", "1");
        next.searchParams.set("gas_session", body.token);
        window.location.replace(next.toString());
        return;
      }
      setStatus(body.pro
        ? "Signed in. Pro is on this account."
        : "Signed in. Buy Pro with this same Google email to unlock unlimited Batch.");
      if (done) done.hidden = false;
    } catch (_error) {
      setStatus("Could not reach the account service. Try again.");
    }
  }

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  document.addEventListener("DOMContentLoaded", renderButton);
})();
