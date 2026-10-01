// GET /api/facebook?url=<Facebook ভিডিও লিংক>&provider=<ঐচ্ছিক টেমপ্লেট URL>
//
// ⚠️ সততার সাথে জানানো: কোনো যাচাই-করা, নির্ভরযোগ্য ফ্রি পাবলিক Facebook
// ভিডিও-রিজলভার API আমি এখনো পাইনি (যা পাওয়া গেছে সব পেইড/API-কী লাগে)।
// তাই এখানে একটা সরাসরি কার্যকরী URL বসিয়ে দেওয়া হয়নি — বরং একটা
// "provider template" সিস্টেম রাখা হয়েছে, যাতে আপনি যখনই একটা কাজ-করা
// FB resolver API পাবেন (অথবা পেইড কিনবেন), সেটা এখানে বা ওয়েবসাইটের
// Settings-এ বসিয়ে সাথে সাথে চালু করতে পারবেন — কোড আবার লেখা লাগবে না।
//
// provider টেমপ্লেটে {url} লিখুন, যেখানে আসল ফেসবুক লিংকটা বসবে। যেমন:
//   provider = https://example-api.com/fbdl?link={url}
//
// স্থায়ীভাবে সেট করতে চাইলে Vercel-এর Environment Variables-এ
// FB_RESOLVER_TEMPLATE নামে এই টেমপ্লেটটা বসিয়ে দিন — তাহলে প্রতিবার
// provider প্যারামিটার পাঠানো লাগবে না।

const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { url, provider } = req.query;
    if (!url) return res.status(400).json({ ok: false, error: "url প্যারামিটার লাগবে" });

    const template = provider || process.env.FB_RESOLVER_TEMPLATE;
    if (!template) {
      return res.status(501).json({
        ok: false,
        error: "Facebook resolver এখনো কনফিগার করা হয়নি — একটা কাজ-করা resolver API পেলে ?provider=<template with {url}> দিন, অথবা Vercel env var FB_RESOLVER_TEMPLATE-এ বসান",
      });
    }

    const targetUrl = template.replace("{url}", encodeURIComponent(url));
    const r = await axios.get(targetUrl, { timeout: 15000 });
    // প্রোভাইডারভেদে রেসপন্সের শেপ আলাদা হতে পারে — যতটা সম্ভব সাধারণ ফিল্ডগুলো বের করার চেষ্টা
    const d = r.data?.data || r.data;
    return res.json({
      ok: true,
      url: d?.url || d?.downloadUrl || d?.hd || d?.sd || null,
      title: d?.title || null,
      thumbnail: d?.thumbnail || d?.cover || null,
      raw: d,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
