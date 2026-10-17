export const defaultAppConfig = {
  logoSrc: "/logo.svg",
  introText:
    "Enter your contact details to enroll. Address 2 is optional. After you continue, you can link a bank and finish.",
};

export function clampIntro(text) {
  return String(text ?? "").slice(0, 200);
}

export async function loadAppConfig() {
  try {
    const response = await fetch("/app-config.json", { cache: "no-store" });
    if (!response.ok) return { ...defaultAppConfig, introText: clampIntro(defaultAppConfig.introText) };
    const data = await response.json();
    return {
      logoSrc: String(data.logoSrc || defaultAppConfig.logoSrc),
      introText: clampIntro(data.introText ?? defaultAppConfig.introText),
    };
  } catch {
    return { ...defaultAppConfig, introText: clampIntro(defaultAppConfig.introText) };
  }
}
