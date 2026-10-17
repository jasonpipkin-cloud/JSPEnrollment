export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "JSPEnrollment API",
    version: "1.0.0",
    description: "Create and list validated contact records stored in SQL Server.",
  },
  servers: [{ url: "/", description: "This server" }],
  paths: {
    "/api/contacts": {
      get: {
        summary: "List contacts",
        description: "Returns the 50 most recent contacts.",
        responses: {
          200: {
            description: "Contact list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContactList" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create contact",
        description: "Validates and stores a contact. Address 2 is optional.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactInput" },
              example: {
                firstName: "Ada",
                lastName: "Lovelace",
                address1: "10 St James Square",
                address2: "Suite 1",
                city: "Pasadena",
                state: "CA",
                zipCode: "91101",
                mobilePhone: "4155550100",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Contact saved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateContactResponse" },
              },
            },
          },
          400: {
            description: "Validation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/api/aerosync/widget-session": {
      post: {
        summary: "Create Aerosync sandbox widget session",
        description: "Returns a sandbox widget token. Never calls production Aerosync hosts.",
        responses: {
          200: {
            description: "Sandbox widget session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AerosyncWidgetSession" },
              },
            },
          },
          502: {
            description: "Aerosync sandbox error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          503: {
            description: "Sandbox credentials are not configured",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ContactInput: {
        type: "object",
        required: ["firstName", "lastName", "address1", "city", "state", "zipCode", "mobilePhone"],
        properties: {
          firstName: { type: "string", minLength: 1, maxLength: 50, example: "Ada" },
          lastName: { type: "string", minLength: 1, maxLength: 50, example: "Lovelace" },
          address1: { type: "string", minLength: 3, maxLength: 100, example: "10 St James Square" },
          address2: { type: "string", maxLength: 100, example: "Suite 1" },
          city: { type: "string", minLength: 1, maxLength: 80, example: "Pasadena" },
          state: { type: "string", minLength: 2, maxLength: 2, example: "CA" },
          zipCode: { type: "string", pattern: "^\\d{5}(-\\d{4})?$", example: "91101" },
          mobilePhone: { type: "string", example: "4155550100" },
        },
      },
      Contact: {
        allOf: [
          { $ref: "#/components/schemas/ContactInput" },
          {
            type: "object",
            properties: {
              id: { type: "string", example: "1" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      ContactList: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: { $ref: "#/components/schemas/Contact" },
          },
        },
      },
      CreateContactResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          contact: { $ref: "#/components/schemas/Contact" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          message: { type: "string" },
          errors: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
      ErrorMessage: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      AerosyncWidgetSession: {
        type: "object",
        required: ["token", "aeroPassUserUuid", "environment"],
        properties: {
          token: { type: "string" },
          aeroPassUserUuid: { type: "string" },
          connectionId: { type: "string" },
          userId: { type: "string" },
          environment: { type: "string", enum: ["sandbox"], example: "sandbox" },
          configurationId: { type: "string" },
        },
      },
    },
  },
};
