import crypto from "crypto";
import clientPromise from "../lib/db.js";

export default async function handler(req, res) {

  const salt = process.env.PAYU_SALT;

  const {
    status,
    firstname,
    amount,
    txnid,
    key,
    productinfo,
    email,
    hash
  } = req.body;

  const hashString =
    salt +
    "|" +
    status +
    "|||||||||||" +
    email +
    "|" +
    firstname +
    "|" +
    productinfo +
    "|" +
    amount +
    "|" +
    txnid +
    "|" +
    key;

  const generatedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  if (generatedHash === hash && status === "success") {

    const client = await clientPromise;
    const db = client.db("elitecart");

    await db.collection("orders").updateOne(
      { txnid },
      { $set: { status: "paid", paidAt: new Date() } }
    );

    return res.redirect("https://yourgithubusername.github.io/thankyou.html");
  }

  return res.redirect("https://yourgithubusername.github.io/payment-failed.html");
}
