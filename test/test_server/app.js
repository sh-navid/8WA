const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Dummy endpoint mimicking OpenAI
app.post('/v1/chat/completions', (req, res) => {
  const { messages, model } = req.body;

  // Find the user's last message for demo purposes
  const lastUserMsg = messages
    ? messages.filter(m => m.role === 'user').slice(-1)[0]?.content
    : '';

  // Dummy logic: just echoing the user's question with a canned assistant message
  const reply = `Echo: "${lastUserMsg || 'No user message found.'}" + [Model: ${model}]`;

  res.json({
    id: "chatcmpl-dummy-12345",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model || "gpt-dummy",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: reply
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 10,
      total_tokens: 22
    }
  });
});

app.listen(PORT, () => {
  console.log(`Dummy GPT API running at http://localhost:${PORT}/v1/chat/completions`);
});
