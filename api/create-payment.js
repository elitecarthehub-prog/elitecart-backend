import crypto from "crypto";
import clientPromise from "../lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://elitecart.pro");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { name, email, phone, amount, lastName, address, cart, discount, subtotal } = req.body;

  const key         = process.env.PAYU_KEY;
  const salt        = process.env.PAYU_SALT;
  const txnid       = "EC" + Date.now(); // EC prefix rakho consistent
  const productinfo = "EliteCart Order"; // ✅ Fixed — dynamic mat rakho

  const formattedAmount = parseFloat(amount).toFixed(2);
  const formattedPhone  = String(phone).replace(/\D/g, "").slice(-10);

  // ✅ Hash backend pe ban raha hai — salt safe
  const hashString =
    key + "|" + txnid + "|" + formattedAmount + "|" +
    productinfo + "|" + name + "|" + email +
    "|||||||||||" + salt;

  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  // DB mein save karo
  try {
    const client = await clientPromise;
    const db = client.db("elitecart");
    await db.collection("orders").insertOne({
      txnid, name, email,
      phone     : formattedPhone,
      amount    : formattedAmount,
      lastName, address, cart, discount, subtotal,
      status    : "pending",
      createdAt : new Date()
    });
  } catch(e) {
    console.error("DB error:", e);
  }

  // ✅ JSON return karo — HTML form nahi
  return res.status(200).json({
    success     : true,
    key, txnid,
    productinfo,
    amount      : formattedAmount,
    hash,
    surl        : "https://elitecart-backend.vercel.app/api/success",
    furl        : "https://elitecart.pro/payment-failed.html"
  });
}
