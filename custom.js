// GET /api/custom?target=<url-encoded target URL>
// এটা "Add New API" টেস্টার-এর জন্য একটা সাধারণ প্রক্সি — ব্রাউজার থেকে
// সরাসরি অন্য ডোমেইনে কল করলে প্রায়ই CORS ব্লক করে, তাই এই ছোট প্রক্সি
// দিয়ে ঘুরিয়ে কল করা হয়।
//
// ⚠️ নিরাপত্তা নোট (সৎভাবে বলে রাখা): এই endpoint এখন কোনো auth/পাসওয়ার্ড
// চেক করে না — যে কেউ আপনার সাইটের URL জানলে এটা দিয়ে যেকোনো URL কল
// করাতে পারবে (ওপেন প্রক্সি)। ব্যক্তিগত টেস্টিং টুল হিসেবে এটা ঠিক আছে,
// কিন্তু পাবলিক করলে/গুরুত্বপূর্ণ হয়ে উঠলে একটা সিক্রেট-কী-চেক যোগ করা
// উচিত — চাইলে বলবেন, যোগ করে দেব।

const axios = require("axios");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { target, method } = req.query;
    if (!target) return res.status(400).json({ ok: false, error: "target প্যারামিটার লাগবে" });

    const r = await axios({
      url: target,
      method: (method || "GET").toUpperCase(),
      timeout: 15000,
      validateStatus: () => true,
    });
    return res.status(200).json({ ok: true, status: r.status, data: r.data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
