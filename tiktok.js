// GET /api/tiktok?action=user&username=someusername   → ওই আইডির সাম্প্রতিক ভিডিও লিস্ট
// GET /api/tiktok?action=video&url=<TikTok ভিডিও লিংক>  → একটা নির্দিষ্ট ভিডিওর ডাউনলোড লিংক (watermark ছাড়া)
//
// tikwm.com-এর পাবলিক (unofficial, কিন্তু বহুল-ব্যবহৃত) API wrap করা হয়েছে।
// নির্দিষ্ট কিছু আইডি কমান্ড ফাইলে বসিয়ে রাখতে চাইলে — bot-এর কমান্ড ফাইলেই
// সেই username/id-গুলোর array রাখবেন, আর প্রতিটার জন্য এই endpoint কল করবেন।

const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { action, username, url } = req.query;

    if (action === "user") {
      if (!username) return res.status(400).json({ ok: false, error: "username প্যারামিটার লাগবে" });
      const { data } = await axios.get("https://www.tikwm.com/api/user/posts", {
        params: { unique_id: username, count: 12 },
        timeout: 12000,
      });
      if (!data?.data?.videos) return res.status(502).json({ ok: false, error: "ইউজারের ভিডিও পাওয়া গেল না" });
      const videos = data.data.videos.map((v) => ({
        id: v.video_id,
        title: v.title,
        cover: v.cover,
        playUrl: v.play, // watermark ছাড়া সরাসরি ডাউনলোড লিংক
        durationSec: v.duration,
        createdAt: v.create_time,
      }));
      return res.json({ ok: true, username, videos });
    }

    if (action === "video") {
      if (!url) return res.status(400).json({ ok: false, error: "url প্যারামিটার লাগবে" });
      const { data } = await axios.get("https://www.tikwm.com/api/", { params: { url }, timeout: 12000 });
      if (!data?.data) return res.status(502).json({ ok: false, error: "ভিডিও রিজলভ ব্যর্থ" });
      const d = data.data;
      return res.json({
        ok: true,
        title: d.title,
        cover: d.cover,
        playUrl: d.play,
        author: d.author?.unique_id,
        durationSec: d.duration,
      });
    }

    return res.status(400).json({ ok: false, error: "action=user অথবা action=video দিন" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
