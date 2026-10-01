// GET /api/resolve?url=<যেকোনো YouTube/TikTok/Facebook/Instagram লিংক>&format=mp4|mp3
//
// নতুন কমান্ড ফাইল বানালে এখন থেকে শুধু এই একটা endpoint কল করলেই হবে —
// প্ল্যাটফর্ম কোনটা সেটা URL দেখেই বোঝা হয়, তারপর সেই প্ল্যাটফর্মের নিজস্ব
// resolver-এ পাঠানো হয়। এতে প্রতিটা কমান্ড ফাইলে আলাদা করে platform-detect
// লজিক লেখার দরকার নেই।

const axios = require("axios");

function detectPlatform(url) {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  if (/instagram\.com/i.test(url)) return "instagram";
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { url, format } = req.query;
    if (!url) return res.status(400).json({ ok: false, error: "url প্যারামিটার লাগবে" });

    const platform = detectPlatform(url);
    if (!platform) return res.status(400).json({ ok: false, error: "চেনা যায়নি — YouTube/TikTok/Facebook/Instagram লিংক দিন" });

    const base = `https://${req.headers.host}`;

    if (platform === "youtube") {
      const idMatch = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
      if (!idMatch) return res.status(400).json({ ok: false, error: "YouTube video ID বের করা গেল না" });
      const r = await axios.get(`${base}/api/youtube?action=resolve&id=${idMatch[1]}&format=${format || "mp4"}`);
      return res.json({ ok: r.data.ok, platform, ...r.data });
    }

    if (platform === "tiktok") {
      const r = await axios.get(`${base}/api/tiktok?action=video&url=${encodeURIComponent(url)}`);
      return res.json({ ok: r.data.ok, platform, url: r.data.playUrl, title: r.data.title, thumbnail: r.data.cover });
    }

    if (platform === "facebook" || platform === "instagram") {
      const r = await axios.get(`${base}/api/${platform}?url=${encodeURIComponent(url)}`);
      return res.json({ ok: r.data.ok, platform, ...r.data });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
