import crypto from "crypto";
import clientPromise from "../lib/db.js";

export default async function handler(req, res) {

  // 🔥 CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "https://elitecart.pro");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { name, email, phone, amount } = req.body;

  const key = process.env.PAYU_KEY;
  const salt = process.env.PAYU_SALT;

  const txnid = "TXN" + Date.now();
  const productinfo = "EliteCart Order";

  const hashString =
    key + "|" + txnid + "|" + amount + "|" +
    productinfo + "|" + name + "|" + email +
    "|||||||||||" + salt;

  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  const client = await clientPromise;
  const db = client.db("elitecart");

  await db.collection("orders").insertOne({
    txnid,
    name,
    email,
    phone,
    amount,
    status: "pending",
    createdAt: new Date()
  });

  const form = `
  <html>
  <body onload="document.forms[0].submit()">
    <form method="post" action="https://secure.payu.in/_payment">
      <input type="hidden" name="key" value="${key}" />
      <input type="hidden" name="txnid" value="${txnid}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="productinfo" value="${productinfo}" />
      <input type="hidden" name="firstname" value="${name}" />
      <input type="hidden" name="email" value="${email}" />
      <input type="hidden" name="phone" value="${phone}" />
      <input type="hidden" name="surl" value="https://elitecart-backend.vercel.app/api/success" />
      <input type="hidden" name="furl" value="https://elitecart.pro/payment-failed.html" />
      <input type="hidden" name="hash" value="${hash}" />
    </form>
  </body>
  </html>
  `;

  res.status(200).send(form);
}
