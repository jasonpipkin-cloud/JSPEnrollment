import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { launchBankLinkWidget } from "./aerosyncWidget.js";
import { validContact } from "./testFixtures.js";

vi.mock("./aerosyncWidget.js", () => ({
  launchBankLinkWidget: vi.fn((_session, handlers = {}) => {
    handlers.onLoad?.();
    return { launch: vi.fn() };
  }),
}));

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

const sandboxSession = {
  token: "sandbox-token",
  aeroPassUserUuid: "sandbox-uuid",
  environment: "sandbox",
  configurationId: "",
};

function mockFetch(overrides = {}) {
  return vi.fn((url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const href = String(url);
    if (method === "GET" && href.includes("app-config")) {
      return jsonResponse(200, {
        logoSrc: "/logo.png",
        introText: "Welcome to enrollment. Complete your contact details to continue.",
      });
    }
    if (method === "GET" && href.includes("/api/contacts")) {
      return jsonResponse(200, { contacts: [] });
    }
    if (method === "POST" && href.includes("/api/contacts")) {
      return jsonResponse(201, { ok: true, contact: { id: "1", ...validContact } });
    }
    if (method === "POST" && href.includes("/api/aerosync/widget-session")) {
      if (overrides.widgetSession) return overrides.widgetSession();
      return jsonResponse(200, sandboxSession);
    }
    if (method === "POST" && href.includes("/api/stop")) {
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(500, { message: "unmocked request" });
  });
}

async function fillValidForm(user, overrides = {}) {
  const data = { ...validContact, ...overrides };
  await user.type(screen.getByLabelText(/first name/i), data.firstName);
  await user.type(screen.getByLabelText(/last name/i), data.lastName);
  await user.type(screen.getByLabelText(/address 1/i), data.address1);
  if (data.address2) await user.type(screen.getByLabelText(/address 2/i), data.address2);
  await user.type(screen.getByLabelText(/^city$/i), data.city);
  await user.selectOptions(screen.getByLabelText(/^state$/i), data.state);
  await user.type(screen.getByLabelText(/zip code/i), data.zipCode);
  await user.type(screen.getByLabelText(/mobile phone/i), data.mobilePhone);
}

async function continueToBankLinking(user) {
  await screen.findByRole("button", { name: /continue/i });
  await fillValidForm(user);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  expect(await screen.findByRole("heading", { name: /bank linking/i })).toBeInTheDocument();
}

describe("JSPEnrollment GUI", () => {
  beforeEach(() => {
    launchBankLinkWidget.mockClear();
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Enroll with logo, intro, and Continue", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: /enroll/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/logo/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome to enrollment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("shows required-field errors when Continue is clicked empty", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /enroll/i })).toBeInTheDocument();
    const postCalls = fetch.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(postCalls).toHaveLength(0);
  });

  it("shows a zip validation error without leaving Enroll", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: /continue/i });
    await fillValidForm(user, { zipCode: "9110" });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/12345 or 12345-6789/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /enroll/i })).toBeInTheDocument();
  });

  it("opens Bank Linking and launches the sandbox widget", async () => {
    const user = userEvent.setup();
    render(<App />);
    await continueToBankLinking(user);
    expect(screen.getByTestId("aero-widget-container")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    expect(document.title).toBe("Bank Linking");
    await waitFor(() => expect(launchBankLinkWidget).toHaveBeenCalled());
    expect(launchBankLinkWidget.mock.calls[0][0]).toMatchObject({
      token: "sandbox-token",
      aeroPassUserUuid: "sandbox-uuid",
      environment: "sandbox",
    });
  });

  it("shows Link bank when the sandbox session fails", async () => {
    vi.stubGlobal("fetch", mockFetch({
      widgetSession: () => jsonResponse(503, { message: "Aerosync sandbox is not configured." }),
    }));
    const user = userEvent.setup();
    render(<App />);
    await continueToBankLinking(user);
    expect(await screen.findByText(/not configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link bank/i })).toBeInTheDocument();
    expect(launchBankLinkWidget).not.toHaveBeenCalled();
  });

  it("shows Bank linked after widget success", async () => {
    launchBankLinkWidget.mockImplementation((_session, handlers = {}) => {
      handlers.onSuccess?.();
      return { launch: vi.fn() };
    });
    const user = userEvent.setup();
    render(<App />);
    await continueToBankLinking(user);
    expect(await screen.findByText(/bank linked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });

  it("closes the app from Bank Linking with Done", async () => {
    const user = userEvent.setup();
    render(<App />);
    await continueToBankLinking(user);
    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(await screen.findByText(/application closed/i)).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url, options]) =>
      String(url).includes("/api/stop") && options?.method === "POST"
    )).toBe(true);
  });
});
