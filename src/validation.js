export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const NAME = /^[A-Za-z][A-Za-z .'-]{0,49}$/;
const CITY = /^[A-Za-z][A-Za-z .'-]{0,79}$/;
const ZIP = /^\d{5}(-\d{4})?$/;

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function emptyForm() {
  return {
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    mobilePhone: "",
  };
}

export function validateContact(input) {
  const errors = {};
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const address1 = String(input.address1 ?? "").trim();
  const address2 = String(input.address2 ?? "").trim();
  const city = String(input.city ?? "").trim();
  const state = String(input.state ?? "").trim().toUpperCase();
  const zipCode = String(input.zipCode ?? "").trim();
  const phoneDigits = digitsOnly(input.mobilePhone);

  if (!firstName) errors.firstName = "First name is required.";
  else if (!NAME.test(firstName)) errors.firstName = "Use letters, spaces, hyphens, or apostrophes.";

  if (!lastName) errors.lastName = "Last name is required.";
  else if (!NAME.test(lastName)) errors.lastName = "Use letters, spaces, hyphens, or apostrophes.";

  if (!address1) errors.address1 = "Address 1 is required.";
  else if (address1.length < 3 || address1.length > 100) errors.address1 = "Enter 3 to 100 characters.";

  if (address2.length > 100) errors.address2 = "Address 2 must be 100 characters or fewer.";

  if (!city) errors.city = "City is required.";
  else if (!CITY.test(city)) errors.city = "Use letters, spaces, hyphens, or apostrophes.";

  if (!state) errors.state = "State is required.";
  else if (!US_STATES.includes(state)) errors.state = "Select a valid US state.";

  if (!zipCode) errors.zipCode = "ZIP code is required.";
  else if (!ZIP.test(zipCode)) errors.zipCode = "Use 12345 or 12345-6789.";

  if (!phoneDigits) errors.mobilePhone = "Mobile phone is required.";
  else if (phoneDigits.length === 11 && phoneDigits.startsWith("1")) {
    if (!/^\d{10}$/.test(phoneDigits.slice(1))) errors.mobilePhone = "Enter a 10-digit US mobile number.";
  } else if (phoneDigits.length !== 10) {
    errors.mobilePhone = "Enter a 10-digit US mobile number.";
  }

  const normalized = {
    firstName,
    lastName,
    address1,
    address2,
    city,
    state,
    zipCode,
    mobilePhone: phoneDigits.length === 11 && phoneDigits.startsWith("1")
      ? phoneDigits.slice(1)
      : phoneDigits,
  };

  return { ok: Object.keys(errors).length === 0, errors, value: normalized };
}
