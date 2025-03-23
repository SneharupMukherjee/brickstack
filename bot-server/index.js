const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = "7332513827:AAF7X8SUfMfVYPePn44CZwVnCApOySHaKSw";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ✅ Hardcoded webhook route to avoid mismatch
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (text === "/start") {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "🕹️ Welcome to BrickStack!\nTap below to play:",
      reply_markup: {
        inline_keyboard: [[
          {
            text: "Play BrickStack",
            web_app: { url: "https://brickstack.vercel.app/" }
          }
        ]]
      }
    });
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("BrickStack Bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
