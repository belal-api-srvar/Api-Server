// GET /api/youtube?action=search&q=বাংলা+গান
// GET /api/youtube?action=resolve&id=VIDEO_ID&format=mp4|mp3
//
// এটা শুধু লিংক/তথ্য খুঁজে বের করে দেয় (হালকা, দ্রুত) — আসল ভিডিও ফাইলটা
// এই endpoint কখনো ডাউনলোড করে না, তাই Vercel-এর ব্যান্ডউইথ কোটা বাঁচে।
// আপনার বট (Render) নিজে resolved URL থেকে সরাসরি ফাইল টানবে।

const axios = require("axios");

const SEARCH_APIS = [
  "https://kaiz-apis.gleeze.com/api",
  "https://www.noobs-api.rf.gd/dipto",
  "https://api-aroniix.koyeb.app",
];

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt.api.timelessnesses.me",
];

async function raceGet(bases, pathFn, timeoutMs = 12000) {
  const attempts = bases.map((base) => axios.get(pathFn(base), { timeout: timeoutMs }));
  const results = await Promise.allSettled(attempts);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.data) return r.value.data;
  }
  const reasons = results.map((r) => (r.status === "rejected" ? (r.reason?.message || String(r.reason)) : "empty")).join(" | ");
  throw new Error("সব সোর্স ব্যর্থ: " + reasons);
}

async function resolveCobalt(youtubeUrl, fmt) {
  const attempts = COBALT_INSTANCES.map((base) =>
    axios.post(
      base,
      {
        url: youtubeUrl,
        videoQuality: "720",
        audioFormat: "mp3",
        downloadMode: fmt === "mp3" ? "audio" : "auto",
        filenameStyle: "basic",
      },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 12000 }
    ).then((r) => {
      const url = r.data?.url || r.data?.audio;
      if (!url) throw new Error("no url");
      return { url, title: null, quality: "720p" };
    })
  );
  return Promise.any(attempts);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { action, q, id, format } = req.query;

    if (action === "search") {
      if (!q) return res.status(400).json({ ok: false, error: "q প্যারামিটার লাগবে" });
      const data = await raceGet(SEARCH_APIS, (base) => `${base}/ytFullSearch?songName=${encodeURIComponent(q)}`);
      return res.json({ ok: true, results: (Array.isArray(data) ? data : data?.data || []).slice(0, 10) });
    }

    if (action === "resolve") {
      if (!id) return res.status(400).json({ ok: false, error: "id (video ID) প্যারামিটার লাগবে" });
      const fmt = format === "mp3" ? "mp3" : "mp4";
      const youtubeUrl = `https://www.youtube.com/watch?v=${id}`;

      // Cobalt আর fallback API — একসাথে race, যেটা আগে সাড়া দেয় সেটাই ব্যবহার হবে
      const cobaltP = resolveCobalt(youtubeUrl, fmt).catch((e) => ({ _failed: true, reason: `cobalt: ${e.message}` }));
      const fallbackP = raceGet(SEARCH_APIS, (base) => `${base}/ytDl3?link=${encodeURIComponent(youtubeUrl)}&format=${fmt}&quality=3`)
        .then((d) => {
          if (!d?.downloadLink) throw new Error("no downloadLink");
          return { url: d.downloadLink, title: d.title, quality: d.quality };
        })
        .catch((e) => ({ _failed: true, reason: `fallback: ${e.message}` }));

      const results = await Promise.allSettled([cobaltP, fallbackP]);
      for (const r of results) {
        if (r.status === "fulfilled" && r.value && !r.value._failed) {
          return res.json({ ok: true, ...r.value });
        }
      }
      const reasons = results.map((r) => (r.status === "fulfilled" ? r.value.reason : r.reason?.message)).join(" | ");
      return res.status(502).json({ ok: false, error: "রিজলভ ব্যর্থ: " + reasons });
    }

    return res.status(400).json({ ok: false, error: "action=search অথবা action=resolve দিন" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
