import { clampIntro } from "./appConfig.js";

describe("appConfig", () => {
  it("limits introduction text to 200 characters", () => {
    const text = "x".repeat(250);
    expect(clampIntro(text)).toHaveLength(200);
  });
});
