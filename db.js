import sql from "mssql";

const dbName = process.env.SQL_DATABASE || "JSPEnrollment";
const readyWaitMs = Number(process.env.SQL_READY_WAIT_MS) || 180000;

if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  throw new Error("SQL_DATABASE must be letters, numbers, or underscore only.");
}

let pool;

function config(database) {
  return {
    server: process.env.SQL_SERVER || "localhost",
    port: Number(process.env.SQL_PORT) || 1433,
    user: process.env.SQL_USER || "sa",
    password: process.env.SQL_PASSWORD,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 15000,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapRow(row) {
  return {
    id: String(row.Id),
    firstName: row.FirstName,
    lastName: row.LastName,
    address1: row.Address1,
    address2: row.Address2 ?? "",
    city: row.City,
    state: row.State,
    zipCode: row.ZipCode,
    mobilePhone: row.MobilePhone,
    createdAt: row.CreatedAt instanceof Date ? row.CreatedAt.toISOString() : row.CreatedAt,
  };
}

export async function initDb() {
  if (!process.env.SQL_PASSWORD) {
    throw new Error("SQL_PASSWORD is required.");
  }

  const deadline = Date.now() + readyWaitMs;
  let lastError;

  while (Date.now() < deadline) {
    let master;
    try {
      master = await sql.connect(config("master"));
      await master.request().query(`
        IF DB_ID(N'ContactIntake') IS NOT NULL AND DB_ID(N'${dbName}') IS NULL
        BEGIN
          ALTER DATABASE [ContactIntake] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          ALTER DATABASE [ContactIntake] MODIFY NAME = [${dbName}];
          ALTER DATABASE [${dbName}] SET MULTI_USER;
        END
        IF DB_ID(N'${dbName}') IS NULL CREATE DATABASE [${dbName}];
      `);
      await master.close();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (master) {
        try { await master.close(); } catch { /* ignore */ }
      }
      console.log(`Waiting for SQL Server: ${error.message}`);
      await sleep(4000);
    }
  }

  if (lastError) {
    throw lastError;
  }

  pool = await sql.connect(config(dbName));
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.Contacts', N'U') IS NULL
    CREATE TABLE dbo.Contacts (
      Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      FirstName NVARCHAR(50) NOT NULL,
      LastName NVARCHAR(50) NOT NULL,
      Address1 NVARCHAR(100) NOT NULL,
      Address2 NVARCHAR(100) NULL,
      City NVARCHAR(80) NOT NULL,
      State CHAR(2) NOT NULL,
      ZipCode NVARCHAR(10) NOT NULL,
      MobilePhone NVARCHAR(10) NOT NULL,
      CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Contacts_CreatedAt DEFAULT SYSUTCDATETIME()
    );
  `);
  console.log(`SQL ready: ${dbName}.dbo.Contacts`);
}

export async function insertContact(value) {
  const result = await pool.request()
    .input("firstName", sql.NVarChar(50), value.firstName)
    .input("lastName", sql.NVarChar(50), value.lastName)
    .input("address1", sql.NVarChar(100), value.address1)
    .input("address2", sql.NVarChar(100), value.address2 || null)
    .input("city", sql.NVarChar(80), value.city)
    .input("state", sql.Char(2), value.state)
    .input("zipCode", sql.NVarChar(10), value.zipCode)
    .input("mobilePhone", sql.NVarChar(10), value.mobilePhone)
    .query(`
      INSERT INTO dbo.Contacts
        (FirstName, LastName, Address1, Address2, City, State, ZipCode, MobilePhone)
      OUTPUT INSERTED.Id, INSERTED.FirstName, INSERTED.LastName, INSERTED.Address1,
             INSERTED.Address2, INSERTED.City, INSERTED.State, INSERTED.ZipCode,
             INSERTED.MobilePhone, INSERTED.CreatedAt
      VALUES
        (@firstName, @lastName, @address1, @address2, @city, @state, @zipCode, @mobilePhone);
    `);
  return mapRow(result.recordset[0]);
}

export async function listContacts() {
  const result = await pool.request().query(`
    SELECT TOP 50
      Id, FirstName, LastName, Address1, Address2, City, State, ZipCode, MobilePhone, CreatedAt
    FROM dbo.Contacts
    ORDER BY Id DESC;
  `);
  return result.recordset.map(mapRow);
}
