from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

PORT = 4000

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.get_json()
    messages = data.get('messages', [])
    model = data.get('model', 'gpt-dummy')

    # Find the user's last message
    user_messages = [m['content'] for m in messages if m['role'] == 'user']
    last_user_msg = user_messages[-1] if user_messages else 'No user message found.'

    # Dummy logic: echoing the user's question
    reply = f'Echo: "{last_user_msg}" + [Model: {model}]'

    response = {
        "id": "chatcmpl-dummy-12345",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": reply
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 12,
            "completion_tokens": 10,
            "total_tokens": 22
        }
    }
    return jsonify(response)

if __name__ == '__main__':
    print(f"Dummy GPT API running at http://localhost:{PORT}/v1/chat/completions")
    app.run(port=PORT)
