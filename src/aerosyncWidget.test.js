import { initAeroSyncWidget } from "aerosync-web-sdk";
import { launchBankLinkWidget } from "./aerosyncWidget.js";

vi.mock("aerosync-web-sdk", () => ({
  initAeroSyncWidget: vi.fn(() => ({ launch: vi.fn() })),
}));

describe("launchBankLinkWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="aero-widget-container"></div>';
    initAeroSyncWidget.mockClear();
  });

  it("launches the widget in sandbox only", () => {
    launchBankLinkWidget({
      token: "sandbox-token",
      aeroPassUserUuid: "sandbox-uuid",
      environment: "sandbox",
      configurationId: "config-1",
    });

    expect(initAeroSyncWidget).toHaveBeenCalledWith(expect.objectContaining({
      elementId: "aero-widget-container",
      environment: "sandbox",
      token: "sandbox-token",
      aeroPassUserUuid: "sandbox-uuid",
      widgetLaunchType: "host",
      handleMFA: false,
    }));
    expect(initAeroSyncWidget.mock.calls[0][0].environment).not.toBe("production");
  });

  it("rejects a production environment", () => {
    expect(() => launchBankLinkWidget({
      token: "token",
      aeroPassUserUuid: "uuid",
      environment: "production",
    })).toThrow(/production environment is not allowed/i);
    expect(initAeroSyncWidget).not.toHaveBeenCalled();
  });
});
