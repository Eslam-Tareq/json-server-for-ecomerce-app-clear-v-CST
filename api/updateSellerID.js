const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

async function updateSeller() {
  await client.connect();

  const db = client.db("mydb");
  const col = db.collection("data");

  const doc = await col.findOne({ _id: "db" });

  const data = doc.data;

  const OLD = "3";
  const NEW = "1bbd05ef-914f-4b3a-bdf1-bcd2990369e1";

  // update products
  data.products = data.products.map((p) => {
    if (p.sellerId === OLD) {
      p.sellerId = NEW;
    }
    return p;
  });

  // update orders -> suborders
  data.orders = data.orders.map((order) => {
    order.suborders = order.suborders.map((sub) => {
      if (sub.sellerId === OLD) {
        sub.sellerId = NEW;
      }
      return sub;
    });
    return order;
  });

  await col.updateOne({ _id: "db" }, { $set: { data } });

  console.log("✅ All sellerId updated");

  await client.close();
}

updateSeller();
