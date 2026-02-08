import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE;

if (!uri || !username || !password) {
  throw new Error("Missing Neo4j connection environment variables.");
}

export const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

export const runQuery = async (query, params = {}) => {
  const session = driver.session({ database });
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
};

const normalizeValue = (value) => {
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object" && value.constructor?.name === "Node") {
    return mapNode(value);
  }
  return value;
};

export const mapProperties = (properties) => {
  const entries = Object.entries(properties || {}).map(([key, value]) => [
    key,
    normalizeValue(value),
  ]);
  return Object.fromEntries(entries);
};

export const mapNode = (node) => ({
  ...mapProperties(node.properties),
});

export const toSingleNode = (result, key) => {
  if (!result.records.length) return null;
  const record = result.records[0];
  const node = record.get(key);
  return node ? mapNode(node) : null;
};

export const toNodes = (result, key) =>
  result.records.map((record) => {
    const node = record.get(key);
    return node ? mapNode(node) : null;
  }).filter(Boolean);

export const closeDriver = async () => {
  await driver.close();
};
