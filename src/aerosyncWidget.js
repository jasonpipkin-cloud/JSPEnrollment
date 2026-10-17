import { initAeroSyncWidget } from "aerosync-web-sdk";

const WIDGET_HOST_ID = "aero-widget-container";

export function clearWidgetHost() {
  const host = document.getElementById(WIDGET_HOST_ID);
  if (host) host.replaceChildren();
}

export function launchBankLinkWidget(session, handlers = {}) {
  if (!session?.token || !session?.aeroPassUserUuid) {
    throw new Error("Missing Aerosync sandbox widget session.");
  }
  if (session.environment && session.environment !== "sandbox") {
    throw new Error("Aerosync production environment is not allowed.");
  }

  clearWidgetHost();

  const widget = initAeroSyncWidget({
    elementId: WIDGET_HOST_ID,
    iframeTitle: "Connect",
    environment: "sandbox",
    token: session.token,
    aeroPassUserUuid: session.aeroPassUserUuid,
    configurationId: session.configurationId || "",
    connectionId: session.connectionId,
    widgetLaunchType: "host",
    handleMFA: false,
    onLoad: handlers.onLoad || (() => {}),
    onSuccess: handlers.onSuccess || (() => {}),
    onError: handlers.onError || (() => {}),
    onClose: handlers.onClose || (() => {}),
    onEvent: handlers.onEvent || (() => {}),
  });

  widget.launch();
  return widget;
}
