require('dotenv').config();

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ✅ Hardcoded webhook route to avoid mismatch
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (text === "/start") {
    const steps = [
      "⚙️ Booting up BrickStack...",
      "🔌 Connecting to game server...",
      "📡 Syncing gameplay modules...",
      "✅ Ready!"
    ];
  
    const sentMessages = [];
  
    // Sequentially send progress messages
    for (let i = 0; i < steps.length; i++) {
      const sent = await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: steps[i]
      });
  
      sentMessages.push(sent.data.result.message_id);
  
      // Add delay between each message
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  
    // Delete all progress messages
    for (const msgId of sentMessages) {
      await axios.post(`${TELEGRAM_API}/deleteMessage`, {
        chat_id: chatId,
        message_id: msgId
      });
    }
  
    // Send the actual game launch button
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "🕹️ BrickStack is live!\nTap below to play:",
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
