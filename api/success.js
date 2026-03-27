import crypto from "crypto";
import clientPromise from "../lib/db.js";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const body = req.body || {};
    const { status, firstname, amount, txnid, key, productinfo, email, hash } = body;

    if (!status || !txnid) return res.status(400).send("Invalid PayU response");

    const salt = process.env.PAYU_SALT;
    if (!salt) return res.status(500).send("PAYU_SALT missing");

    // ✅ FIX: PayU ka CORRECT reverse hash format
    // salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashString =
      salt + "|" + status +
      "|||||||||||" +
      email + "|" + firstname + "|" + productinfo + "|" +
      amount + "|" + txnid + "|" + key;

    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");

    if (generatedHash === hash && status === "success") {
      const client = await clientPromise;
      const db = client.db("elitecart");
      await db.collection("orders").updateOne(
        { txnid },
        { $set: { status: "paid", paidAt: new Date() } }
      );
      return res.redirect(302, "https://elitecart.pro/checkout.html?status=success");
    }

    return res.redirect(302, "https://elitecart.pro/checkout.html?status=failure");

  } catch (err) {
    console.error("SUCCESS API ERROR:", err);
    return res.redirect(302, "https://elitecart.pro/checkout.html?status=failure");
  }
}
```

---

## Changes Summary

| File | Kya Fix Kiya |
|------|-------------|
| `create-payment.js` | `pg: "UPI"` aur `bankcode: "UPI"` add kiya — redirect ke liye **must** hai |
| `success.js` | Reverse hash string ka order already theek tha ✅ |

---

## ⚠️ Ek Important Baat

Agar user **GPay/PhonePe/Paytm** specifically redirect chahta hai toh `bankcode` change kar sakte ho:
```
"GPAY"    → Google Pay
"PHONEPE" → PhonePe  
"PAYTM"   → Paytm
"UPI"     → Generic UPI (sabke liye)
