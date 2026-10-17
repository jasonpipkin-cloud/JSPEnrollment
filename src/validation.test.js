import { emptyForm, validateContact } from "./validation.js";
import { validContact } from "./testFixtures.js";

describe("validateContact", () => {
  it("accepts a complete valid contact", () => {
    const result = validateContact(validContact);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.value).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      state: "CA",
      zipCode: "91101",
      mobilePhone: "4155550100",
    });
  });

  it("requires all fields except address 2", () => {
    const result = validateContact(emptyForm());
    expect(result.ok).toBe(false);
    expect(result.errors.firstName).toMatch(/required/i);
    expect(result.errors.lastName).toMatch(/required/i);
    expect(result.errors.address1).toMatch(/required/i);
    expect(result.errors.city).toMatch(/required/i);
    expect(result.errors.state).toMatch(/required/i);
    expect(result.errors.zipCode).toMatch(/required/i);
    expect(result.errors.mobilePhone).toMatch(/required/i);
    expect(result.errors.address2).toBeUndefined();
  });

  it("allows a blank address 2", () => {
    const result = validateContact({ ...validContact, address2: "" });
    expect(result.ok).toBe(true);
    expect(result.value.address2).toBe("");
  });

  it("rejects invalid zip codes", () => {
    const result = validateContact({ ...validContact, zipCode: "9110" });
    expect(result.ok).toBe(false);
    expect(result.errors.zipCode).toMatch(/12345/);
  });

  it("accepts ZIP+4", () => {
    const result = validateContact({ ...validContact, zipCode: "91101-1234" });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown state", () => {
    const result = validateContact({ ...validContact, state: "ZZ" });
    expect(result.ok).toBe(false);
    expect(result.errors.state).toMatch(/valid US state/i);
  });

  it("normalizes lowercase state to uppercase", () => {
    const result = validateContact({ ...validContact, state: "ca" });
    expect(result.ok).toBe(true);
    expect(result.value.state).toBe("CA");
  });

  it("strips a leading 1 from an 11-digit US phone number", () => {
    const result = validateContact({ ...validContact, mobilePhone: "1 (415) 555-0100" });
    expect(result.ok).toBe(true);
    expect(result.value.mobilePhone).toBe("4155550100");
  });

  it("rejects a short phone number", () => {
    const result = validateContact({ ...validContact, mobilePhone: "5550100" });
    expect(result.ok).toBe(false);
    expect(result.errors.mobilePhone).toMatch(/10-digit/i);
  });

  it("rejects names with digits", () => {
    const result = validateContact({ ...validContact, firstName: "Ada2" });
    expect(result.ok).toBe(false);
    expect(result.errors.firstName).toMatch(/letters/i);
  });
});
