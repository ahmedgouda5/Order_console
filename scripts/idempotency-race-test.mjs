import { readFileSync } from "node:fs";

import pg from "pg";

const envFile = readFileSync("apps/api/.env", "utf8").split(/\r?\n/);
const databaseUrl = envFile
  .find((line) => line.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length)
  .trim();

const pool = new pg.Pool({ connectionString: databaseUrl });

const API_URL = "http://localhost:8000/api/orders";
const iterationCount = Number(process.argv[2] ?? 5);
const mode = process.argv[3] ?? "identical";
const requestsPerRace = Number(process.argv[4] ?? 2);

async function postOrder(payload, key) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function rowCount(key) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM orders WHERE idempotency_key = $1",
    [key],
  );
  return rows[0].count;
}

async function orderRowFor(key) {
  const { rows } = await pool.query(
    "SELECT id, order_number, customer_name, amount FROM orders WHERE idempotency_key = $1",
    [key],
  );
  return rows[0] ?? null;
}

const results = [];

for (let iteration = 1; iteration <= iterationCount; iteration++) {
  const key = `${mode}_${requestsPerRace}r_${iteration}_${Date.now()}`;
  const payloadA = {
    customerName: "Race Alice",
    customerEmail: `alice_${key}@example.com`,
    amount: 42.5,
    status: "PENDING",
  };
  const payloadB =
    mode === "different"
      ? { ...payloadA, customerName: "Race Bob", amount: 77.7 }
      : payloadA;

  const rowsBefore = await rowCount(key);

  const responses = await Promise.all(
    Array.from({ length: requestsPerRace }, (_, index) =>
      postOrder(index === 0 ? payloadA : payloadB, key),
    ),
  );

  const rowsAfter = await rowCount(key);
  const storedRow = rowsAfter === 1 ? await orderRowFor(key) : null;

  const statuses = responses.map((r) => r.status);
  const orderIds = responses.map((r) => r.body?.order?.id ?? "-");
  const orderNumbers = responses.map((r) => r.body?.order?.orderNumber ?? "-");
  const allSucceeded = statuses.every((s) => s === 200 || s === 201);
  const idsEqual = new Set(orderIds).size === 1;
  const numbersEqual = new Set(orderNumbers).size === 1;
  const singleRow = rowsBefore === 0 && rowsAfter === 1;

  const verdict =
    allSucceeded && idsEqual && numbersEqual && singleRow ? "PASS" : "FAIL";

  results.push({
    iteration,
    statuses: statuses.join(","),
    idsEqual,
    numbersEqual,
    rowsBefore,
    rowsAfter,
    verdict,
  });

  console.log(
    `#${iteration} key=${key} statuses=[${statuses.join(",")}] ` +
      `idsEqual=${idsEqual} numbersEqual=${numbersEqual} ` +
      `rows ${rowsBefore}->${rowsAfter} -> ${verdict}`,
  );

  if (mode === "different") {
    console.log(
      `   winner payload stored: name=${storedRow?.customer_name} amount=${storedRow?.amount}`,
    );
    console.log(
      `   responses returned same stored row to ALL callers: ${idsEqual}`,
    );
  }
}

await pool.end();

console.log(`\nRun config: mode=${mode} requestsPerRace=${requestsPerRace}`);
console.table(results);
const failed = results.filter((r) => r.verdict !== "PASS");
console.log(
  failed.length === 0
    ? `ALL ${results.length} RACE TESTS PASSED`
    : `${failed.length} of ${results.length} RACE TESTS FAILED`,
);
