const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

exports.runShoppingSearch = async (req, res) => {
  try {
    const { query, sessionId, sessionState } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ error: "query is required" });
    }

    const { data } = await axios.post(`${AI_SERVICE_URL}/shopping/flow`, {
      query,
      session_id: sessionId || null,
      session_state: sessionState || null,
    });

    return res.status(200).json({
      sessionId: data.session_id,
      answer: data.answer,
      sessionState: data.session_state,
    });
  } catch (err) {
    console.error("shopping search error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Product search failed" });
  }
};