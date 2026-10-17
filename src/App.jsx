import { useEffect, useState } from "react";
import BankLinkingPage from "./BankLinkingPage.jsx";
import { clampIntro, defaultAppConfig, loadAppConfig } from "./appConfig.js";
import { emptyForm, US_STATES, validateContact } from "./validation.js";
import "./App.css";

function Field({ id, label, error, children }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="error" role="alert">{error}</span> : null}
    </label>
  );
}

function PageHeader({ config }) {
  const intro = clampIntro(config.introText);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="brand">
      <div className="logo-slot" aria-label="Logo">
        {config.logoSrc && !logoFailed ? (
          <img
            src={config.logoSrc}
            alt="Logo"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="logo-placeholder">Logo</span>
        )}
      </div>
      {intro ? <p className="intro">{intro}</p> : null}
    </header>
  );
}

export default function App() {
  const [page, setPage] = useState("enroll");
  const [closed, setClosed] = useState(false);
  const [config, setConfig] = useState({
    ...defaultAppConfig,
    introText: clampIntro(defaultAppConfig.introText),
  });
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    loadAppConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (closed) document.title = "Application closed";
    else if (page === "bank-linking") document.title = "Bank Linking";
    else document.title = "Enroll";
  }, [page, closed]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus("idle");
  }

  async function handleContinue(event) {
    event.preventDefault();
    const result = validateContact(form);
    setErrors(result.errors);
    if (!result.ok) {
      setStatus("invalid");
      return;
    }

    setStatus("saving");
    setServerMessage("");
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body.errors ?? {});
        setServerMessage(body.message ?? "Please correct the highlighted fields.");
        setStatus("invalid");
        return;
      }
      setStatus("saved");
      setPage("bank-linking");
    } catch {
      setServerMessage("Could not reach the server. Try again.");
      setStatus("error");
    }
  }

  async function handleDone() {
    setClosed(true);
    try {
      await fetch("/api/stop", { method: "POST" });
    } catch {
      // The server exits immediately; a failed fetch is expected.
    }
  }

  if (closed) {
    return (
      <main className="page">
        <p className="closed">Application closed.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader config={config} />

      {page === "enroll" ? (
        <>
          <h1>Enroll</h1>
          <p className="hint">All fields are required except Address 2.</p>
          <p className="docs-link"><a href="/api-docs">API docs (Swagger)</a></p>

          <form className="form" onSubmit={handleContinue} noValidate>
            <div className="row">
              <Field id="firstName" label="First name" error={errors.firstName}>
                <input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  aria-invalid={Boolean(errors.firstName)}
                />
              </Field>
              <Field id="lastName" label="Last name" error={errors.lastName}>
                <input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  autoCapitalize="words"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  aria-invalid={Boolean(errors.lastName)}
                />
              </Field>
            </div>

            <Field id="address1" label="Address 1" error={errors.address1}>
              <input
                id="address1"
                name="address1"
                autoComplete="address-line1"
                value={form.address1}
                onChange={(e) => update("address1", e.target.value)}
                aria-invalid={Boolean(errors.address1)}
              />
            </Field>

            <Field id="address2" label="Address 2" error={errors.address2}>
              <input
                id="address2"
                name="address2"
                autoComplete="address-line2"
                value={form.address2}
                onChange={(e) => update("address2", e.target.value)}
                aria-invalid={Boolean(errors.address2)}
              />
            </Field>

            <Field id="city" label="City" error={errors.city}>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                autoCapitalize="words"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                aria-invalid={Boolean(errors.city)}
              />
            </Field>

            <div className="row">
              <Field id="state" label="State" error={errors.state}>
                <select
                  id="state"
                  name="state"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  aria-invalid={Boolean(errors.state)}
                >
                  <option value="">Select</option>
                  {US_STATES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </Field>
              <Field id="zipCode" label="ZIP code" error={errors.zipCode}>
                <input
                  id="zipCode"
                  name="zipCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  value={form.zipCode}
                  onChange={(e) => update("zipCode", e.target.value)}
                  aria-invalid={Boolean(errors.zipCode)}
                />
              </Field>
            </div>

            <Field id="mobilePhone" label="Mobile phone" error={errors.mobilePhone}>
              <input
                id="mobilePhone"
                name="mobilePhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.mobilePhone}
                onChange={(e) => update("mobilePhone", e.target.value)}
                aria-invalid={Boolean(errors.mobilePhone)}
              />
            </Field>

            {serverMessage ? <p className="notice">{serverMessage}</p> : null}

            <div className="page-actions">
              <button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Continue"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <BankLinkingPage onDone={handleDone} />
      )}
    </main>
  );
}
