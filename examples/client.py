"""Run after launching a matching SGLang server and installing openai."""
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:30000/v1", api_key="EMPTY")
response = client.chat.completions.create(
    model="Qwen/Qwen3-0.6B",
    messages=[{"role": "user", "content": "用一句话解释 KV Cache"}],
    max_tokens=128,
    temperature=0.6,
)
print(response.choices[0].message.content)
