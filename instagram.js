// GET /api/instagram?url=<Instagram রিল/পোস্ট লিংক>&provider=<ঐচ্ছিক টেমপ্লেট URL>
//
// ⚠️ একই সততার নোট যা facebook.js-এ আছে — কোনো যাচাই-করা ফ্রি পাবলিক
// Instagram resolver API এখনো বসানো হয়নি। provider টেমপ্লেট সিস্টেম দিয়ে
// পরে যেকোনো কাজ-করা API সহজে যোগ করা যাবে।
//
// provider = https://example-api.com/igdl?url={url}
// স্থায়ীভাবে সেট করতে Vercel env var: IG_RESOLVER_TEMPLATE

const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { url, provider } = req.query;
    if (!url) return res.status(400).json({ ok: false, error: "url প্যারামিটার লাগবে" });

    const template = provider || process.env.IG_RESOLVER_TEMPLATE;
    if (!template) {
      return res.status(501).json({
        ok: false,
        error: "Instagram resolver এখনো কনফিগার করা হয়নি — একটা কাজ-করা resolver API পেলে ?provider=<template with {url}> দিন, অথবা Vercel env var IG_RESOLVER_TEMPLATE-এ বসান",
      });
    }

    const targetUrl = template.replace("{url}", encodeURIComponent(url));
    const r = await axios.get(targetUrl, { timeout: 15000 });
    const d = r.data?.data || r.data;
    return res.json({
      ok: true,
      url: d?.url || d?.downloadUrl || d?.video || null,
      title: d?.title || d?.caption || null,
      thumbnail: d?.thumbnail || d?.cover || null,
      raw: d,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
