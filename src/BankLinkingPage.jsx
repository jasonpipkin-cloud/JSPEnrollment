import { useEffect, useRef, useState } from "react";
import { launchBankLinkWidget } from "./aerosyncWidget.js";

function errorText(value) {
  if (!value) return "Could not start bank linking.";
  if (typeof value === "string") return value;
  return value.message || value.Message || "Could not start bank linking.";
}

export default function BankLinkingPage({ onDone }) {
  const [linkStatus, setLinkStatus] = useState("loading");
  const [message, setMessage] = useState("Starting sandbox bank linking…");
  const linkedRef = useRef(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    linkedRef.current = false;

    async function start() {
      setLinkStatus("loading");
      setMessage("Starting sandbox bank linking…");
      try {
        const response = await fetch("/api/aerosync/widget-session", { method: "POST" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.message || "Could not start bank linking.");
        }
        if (cancelled) return;

        launchBankLinkWidget(body, {
          onLoad() {
            if (!cancelled && !linkedRef.current) {
              setLinkStatus("ready");
              setMessage("");
            }
          },
          onSuccess() {
            if (!cancelled) {
              linkedRef.current = true;
              setLinkStatus("success");
              setMessage("Bank linked.");
            }
          },
          onError(event) {
            if (!cancelled && !linkedRef.current) {
              setLinkStatus("error");
              setMessage(errorText(event));
            }
          },
          onClose() {
            if (!cancelled && !linkedRef.current) {
              setLinkStatus("error");
              setMessage("Bank linking was closed.");
            }
          },
        });
      } catch (error) {
        if (!cancelled) {
          setLinkStatus("error");
          setMessage(errorText(error));
        }
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  function retry() {
    setRetryNonce((value) => value + 1);
  }

  return (
    <>
      <h1>Bank Linking</h1>
      <p className="hint">Link a bank in Aerosync sandbox to finish enrollment.</p>
      {message ? (
        <p className={linkStatus === "success" ? "notice success" : "notice"} role="status">
          {message}
        </p>
      ) : null}
      <div
        id="aero-widget-container"
        className="widget-host"
        hidden={linkStatus === "success"}
        data-testid="aero-widget-container"
      />
      <div className="page-actions">
        {linkStatus === "error" ? (
          <button type="button" onClick={retry}>
            Link bank
          </button>
        ) : null}
        <button type="button" className="done" onClick={onDone}>
          Done
        </button>
      </div>
    </>
  );
}
