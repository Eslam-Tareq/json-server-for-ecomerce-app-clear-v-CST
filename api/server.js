const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const jsonServer = require("json-server");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const server = jsonServer.create();
const dbPath = path.resolve(__dirname, "../newdb.json");

const client = new MongoClient(process.env.MONGODB_URI);

const getDb = async () => {
  await client.connect();
  const db = client.db("mydb");
  const col = db.collection("data");
  const doc = await col.findOne({ _id: "db" });
  if (doc) return doc.data;

  const seed = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  await col.insertOne({ _id: "db", data: seed });
  return seed;
};

const saveDb = async (data) => {
  await client.connect();
  const db = client.db("mydb");
  await db
    .collection("data")
    .updateOne({ _id: "db" }, { $set: { data } }, { upsert: true });
};

server.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Full json-server middlewares (logging, static, cors, no-cache)
server.use(jsonServer.defaults({ noCors: true }));

// Body parser — required for POST/PUT/PATCH
server.use(jsonServer.bodyParser);

// Custom rewriter (optional — same as json-server's routes.json)
// server.use(jsonServer.rewriter({ "/api/*": "/$1" }));

server.use(async (req, res, next) => {
  try {
    const data = await getDb();
    const router = jsonServer.router(data);

    // Give router access to all json-server query features:
    // ?_page, ?_limit, ?_sort, ?_order, ?_embed, ?_expand
    // ?q (full-text search), ?field=value (filtering)
    router.db.write = async () => {
      const updatedData = router.db.getState();
      await saveDb(updatedData);
      console.log("✅ Saved to MongoDB");
    };

    // Forward all json-server headers (X-Total-Count, Link pagination, etc.)
    router(req, res, next);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = server;
