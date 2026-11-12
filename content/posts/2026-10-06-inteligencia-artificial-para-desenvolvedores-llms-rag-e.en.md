---
title: "Artificial Intelligence for Developers: LLMs, RAG, and Agents"
date: "2026-10-06"
category: "article"
tags: ["ia", "llm", "rag", "agentes", "openai"]
excerpt: "Artificial Intelligence for Developers: LLMs, RAG, and Agents."
cover:
  image: "/covers/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e.jpg"
comments: true
translationKey: "2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e"
---

## Artificial Intelligence for Developers: LLMs, RAG, and Agents

I remember when I updated the point-of-sale system for the store where I work. Migrating a database with about ten thousand products between two different systems was a manual, slow, and error-prone task. Today, a script with a few lines of Python solves it. But what if we could describe the task in Portuguese to an assistant, and it wrote the script, tested it, and even suggested improvements to the integration? This is no longer science fiction. Large Language Models (LLMs) are turning this possibility into a practical tool in the day-to-day work of development.


<figure>
<img src="/covers/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e.jpg" alt="Artificial Intelligence for Developers: LLMs, RAG, and Agents" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

This new paradigm is not just about a smarter chatbot. It's about a fundamental shift in how we interact with code, data, and systems. As a full-stack developer who has built everything from REST APIs in Python to a dashboard for an open-source AI memory system, I see these tools unfolding into three main layers: LLMs as the intelligent core, RAG to give them specific memory, and agents to transform intentions into actions.

I will explain how each piece works, where they fit, and, most importantly, how you can start using them today in real projects.

### The Core of the Conversation: How LLMs Work (In Practical Terms)

Large language models are trained on vast amounts of text and code, learning to predict the next token in a sequence.

An LLM, at the end of the day, is a language model trained on a colossal amount of text. Think of trillions of tokens, which can be words, parts of words, or characters, extracted from the internet, books, code, and other texts.

The training involves teaching the model to predict the next token in a sequence. Given the phrase "The server is running on port...", the model learns that "3000", "8080", or "5432" are likely predictions based on the patterns it has seen. This is autoregressive generation. The architecture behind this, nearly ubiquitous today, is the Transformer, introduced in 2017. It uses a "self-attention" mechanism that allows the model to weigh the importance of different words in a sentence, regardless of the distance between them. This is what gives an LLM the ability to maintain context coherence over longer paragraphs.

The result is a model that has internalized patterns of language, reasoning, and even code styles. When you ask an LLM like GPT-4 or Claude to write a Python function that validates a CPF, it isn't copying from a specific place. It is recombining the patterns of Python syntax, validation logic, and code formatting that it assimilated during training.

For us developers, the practical interface is the APIs. A *prompt* like the one below sends a context and an instruction to the model and receives a completion.

```python
import openai

client = openai.OpenAI(api_key="your-key")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a Python specialist assistant."},
        {"role": "user", "content": "Write a function that takes a string and returns True if it is a palindrome, ignoring spaces and punctuation."}
    ]
)

print(response.choices[0].message.content)
```

The output would be something like:

```python
import re

def is_palindrome(texto: str) -> bool:
    """
    Checks if a string is a palindrome, ignoring spaces, punctuation, and case differences.
    """
    # Remove everything that is not a letter or number and convert to lowercase
    texto_limpo = re.sub(r'[^a-zA-Z0-9]', '', texto).lower()
    return texto_limpo == texto_limpo[::-1]

# Example usage
if __name__ == "__main__":
    print(is_palindrome("A man, a plan, a canal: Panama"))  # True
    print(is_palindrome("Hello, world!"))  # False
```

That's the raw power. But it has clear limits: the model knows nothing about your company's specific data, your internal API documentation, or last week's discussions in your GitHub repository. It's stuck with the general knowledge from its training cut-off. That's where the next layer comes in.

### RAG: Giving the AI its own memory and context

RAG stands for *Retrieval-Augmented Generation*. It's the technique that solves the problem of outdated or specific knowledge. Instead of relying solely on the model's internal memory, a RAG system first queries an external knowledge base (your documents, code, tickets) and then inserts that relevant information into the model's prompt.

Imagine you want an assistant to help developers use your SaaS's internal API. The documentation is in 50 pages of Confluence. A user asks: "How do I create a webhook for the `invoice.paid` event?".

A RAG system works like this:
1.  **Indexing:** All documents are broken into pieces (chunks), converted into numeric vectors (embeddings) using a model like `text-embedding-3-small`, and stored in a vector database (like Pinecone, Weaviate, or a local one like Chroma).
2.  **Retrieval:** When a question arrives, it is also converted into a vector. The system searches the vector database for the text pieces most semantically similar to the question.
3.  **Generation:** The retrieved texts are injected as context into a prompt for the LLM, which then formulates a precise, grounded answer.

Here is a functional skeleton for a simple RAG with Python, FastAPI, and Chroma:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

# Configuration
OPENAI_API_KEY = "your-openai-key"
client_openai = OpenAI(api_key=OPENAI_API_KEY)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
embedding_func = embedding_functions.OpenAIEmbeddingFunction(
    api_key=OPENAI_API_KEY,
    model_name="text-embedding-3-small"
)
collection = chroma_client.get_or_create_collection(
    name="docs_api",
    embedding_function=embedding_func
)

app = FastAPI()

class QueryRequest(BaseModel):
    question: str

```python
@app.post("/ask")
async def ask_rag(request: QueryRequest):
    # 1. Retrieval
    results = collection.query(
        query_texts=[request.question],
        n_results=3
    )
    context = "\n---\n".join(results['documents'][0])

    # 2. Augmented Generation
    prompt = f"""
    Based on the context below, answer the user's question.
    If the answer is not in the context, clearly state 'I could not find that information in the documentation'.

    Context:
    {context}

    Question: {request.question}
    Answer:
    """
    response = client_openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    return {"answer": response.choices[0].message.content}

# (Previously, you would need to index your documents)
# documents = ["Document text 1...", "Document text 2..."]
# collection.add(documents=documents, ids=[f"doc_{i}" for i in range(len(documents))])
```

The key lesson remains: context is everything.

### Function Calling and Tools: The Bridge to the Real World

An LLM with RAG is a well-informed oracle. But it's still an oracle, confined to the domain of words. *Function calling* (or tool use) is the mechanism that allows the model to interact with the outside world. You define tools (functions) that the model can "choose" to call, providing the necessary arguments in a structured format (usually JSON). Your code then executes the function and returns the result to the model, which can continue its reasoning.

This is transformative. Suddenly, your assistant can:
*   Fetch the weather forecast from an API.
*   Create a ticket in Jira.
*   Query a balance in a PostgreSQL database.
*   Send an email via SendGrid.

Here's an example that queries a fictional user database:

```python
import json
from openai import OpenAI
import sqlite3

client = OpenAI(api_key="your-key")
```

# Definition of Available Tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "query_user_database",
            "description": "Queries the user database by name or ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_type": {
                        "type": "string",
                        "enum": ["by_name", "by_id"],
                        "description": "Type of search: by name or by ID."
                    },
                    "search_term": {
                        "type": "string",
                        "description": "User's name or ID to search for."
                    }
                },
                "required": ["search_type", "search_term"]
            }
        }
    }
]

# The actual function that will be called
def query_user_database(search_type: str, search_term: str):
    """Simulates a database query."""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    if search_type == "by_name":
        cursor.execute("SELECT id, name, email FROM users WHERE name LIKE ?", (f'%{search_term}%',))
    else:  # by_id
        cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (search_term,))
    results = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "email": r[2]} for r in results]

# Conversation with the model
messages = [{"role": "user", "content": "Who is the user with ID 42? Then, find someone named 'Maria'."}]

# First call: the model "chooses" to use the tool
response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)
message = response.choices[0].message
messages.append(message)

# If the model wants to call a function...
if message.tool_calls:
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        # Executes the real function
        function_response = query_user_database(**function_args)
        # Adds the function result to the history
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(function_response)
        })
    # Second call: model processes the result and responds
    second_response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    print(second_response.choices[0].message.content)
```

This pattern is the foundation for agents, allowing them to invoke system commands, read files, and interact with their environment.

### Autonomous Agents: Orchestrating Thought and Action

An agent is a system that brings it all together: an LLM for reasoning, RAG for memory, and *function calling* for action. It operates in a loop. The ReAct (Reason + Act) model is a common pattern:
1.  **Think:** The model analyzes the goal, history, and available tools.
2.  **Act:** Decides to call a tool (or stop). Generates the arguments.
3.  **Observe:** Receives the observation (tool result) and adds it to the context.
4.  **Repeat:** Continues until reaching a final conclusion.

In a task manager application, an agent could have the task: "Prioritize the backlog tasks related to bug #123 and assign them to the frontend team". The agent:
*   *Thinks:* "I need to fetch the backlog tasks, filter by mention of bug #123, and then update the `team` field."
*   *Acts:* Calls the tool `get_tasks(filter="backlog")`.
*   *Observes:* Receives a list of 15 tasks.
*   *Thinks:* "Now I need to filter these 15 locally, since the API doesn't have a tag filter. I'll analyze the titles and descriptions."
*   *Acts:* (Internal processing) Identifies 3 relevant tasks.
*   *Thinks:* "Now I call the tool to update each one."
*   *Acts:* Calls `update_task(task_id=xyz, fields={"team": "frontend"})` for each one.

Frameworks like LangChain, LlamaIndex, and the more recent Microsoft Autogen make building these flows easier. The real complexity lies in workflow design and robust error handling.

### Routing and Fallbacks: Handling Unstable Reality

Not every question needs GPT-4. Not every AI API is 100% available. In production, you need resilience.

**Routing** directs the request to the most suitable model or strategy. A simple code formatting question can go to GPT-3.5 Turbo, which is cheaper and faster. A complex architectural task demands GPT-4 or Claude 3.5 Sonnet. You can route based on estimated prompt complexity, topic, or even A/B testing.


Here is the central idea, simplified:

```python
import asyncio
from openai import OpenAI, APIError, APITimeoutError
from anthropic import Anthropic

providers = [
    {"name": "openai-gpt4", "client": OpenAI(api_key="key1"), "model": "gpt-4", "cooldown_until": 0},
    {"name": "openai-gpt35", "client": OpenAI(api_key="key2"), "model": "gpt-3.5-turbo", "cooldown_until": 0},
    {"name": "claude", "client": Anthropic(api_key="key3"), "model": "claude-3-haiku-20240307", "cooldown_until": 0},
]

async def resilient_completion(prompt, max_retries=3):
    for attempt in range(max_retries):
        for provider in providers:
            if asyncio.get_event_loop().time() < provider["cooldown_until"]:
                continue  # Provider in "cooldown"
```

```
try:
    if "openai" in provider["name"]:
        response = await provider["client"].chat.completions.create(
            model=provider["model"],
            messages=[{"role": "user", "content": prompt}],
            timeout=10
        )
        return response.choices[0].message.content
    elif "claude" in provider["name"]:
        response = await provider["client"].messages.create(
            model=provider["model"],
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
except (APIError, APITimeoutError) as e:
    print(f"Error with provider {provider['name']}: {e}")
    # Put the provider in cooldown for 30 seconds
    provider["cooldown_until"] = asyncio.get_event_loop().time() + 30
    break  # Try the next provider
await asyncio.sleep(1)
raise Exception("All providers failed.")
```

### Cost, Latency, and Practical Considerations

This new capability comes at a cost, and not just a monetary one. LLM API costs can scale quickly. A single call to GPT-4 for a large prompt can cost several cents. Thousands of calls per day turn into a significant bill. Strategic approaches are fundamental:
*   **Embedding and response caching:** If many questions are similar, cache them.
*   **Efficient prompting:** Be concise. Avoid unnecessary context.
*   **Tiered models:** Use smaller, cheaper models (GPT-3.5, Haiku) whenever possible, reserving larger ones (GPT-4, Sonnet) for complex problems.
*   **Local models:** For specific tasks (text classification, entity extraction), a smaller, specialized model running locally (via Transformers.js, Ollama, or ONNX Runtime) can have zero cost and low latency.

Latency is another enemy. A RAG chain with multiple vector searches and LLM calls can take several seconds. This is unacceptable for a synchronous interface. The solution lies in asynchronous operations, response streaming (where the model writes the response token by token), and pre-computation of embeddings.

Finally, reliability. LLMs can "hallucinate" â invent facts, documentation URLs, or API parameters that don't exist. A production system needs verification: validate if generated code is syntactically correct (with a linter), if an API call follows the expected schema (with Pydantic), and always have a path for human fallback (an "escalate to support" button).

### Conclusion: Integrating AI into Your Workflow

Generative AI will not replace developers any time soon. But developers who use generative AI *will* replace those who don't. It is a force multiplier, a tool to automate the tedious, explore solutions rapidly, and access specific knowledge in seconds.

1.  Automate the generation of code *boilerplate* in your editor (via Copilot or your own plugin).
2.  Implement a Q&A on your internal technical documentation using RAG.
3.  Create an AI-assisted *script* to analyze logs or generate reports from the database.

The basic building blocks are there. LLMs provide the reasoning, RAG provides the specialized context, and *function calling* provides the arms to act in the digital world. It's up to us, developers, to orchestrate these capabilities to build more robust software, solve real business problems, and, perhaps, gain a few hours in the day to focus on what really matters: architecture, user experience, and the challenging problems that still demand pure human creativity.

**Practical Takeaways:**
*   Use LLMs via API (OpenAI, Anthropic, Google) for rapid prototyping and generating *boilerplate* code.
*   Implement RAG when you need the AI to access specific, internal, and up-to-date knowledge from your company or project.
*   Extend the AI's utility with *function calling*, allowing it to interact with your APIs, databases, and services.
*   Design agents as workflows (think-act-observe) for complex multi-step tasks.
*   In production, never rely on a single model or provider. Implement routing and fallbacks for resilience.
*   Monitor cost and latency from the start. Optimizing prompts and using caches can reduce your bill by an order of magnitude.

## Sources

*   [Official OpenAI documentation: Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
*   [LangChain documentation: Agents and Tools Concepts](https://python.langchain.com/docs/concepts/#agents)
*   [Original paper "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)](https://arxiv.org/abs/2005.11401)
*   [Chroma DB: Quickstart Guide for Vector Databases](https://docs.trychroma.com/getting-started)
*   [Anthropic Claude: Messages API Documentation](https://docs.anthropic.com/en/api/messages)


<figure>
<img src="/media/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e-1.jpg" alt="Artificial Intelligence for Developers: LLMs, RAG, and Agents" loading="lazy">
<figcaption>Neural net completion for "artificial intelligence", as done by DALL-E mini hosted on HuggingFace, 4 June 2022 (code under Apache 2.0 license). Upscaled with Re. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AArtificial_intelligence_prompt_completion_by_dalle_mini.jpg">Artificial intelligence prompt completion by dalle mini.jpg</a> por Prompt by JPxG, model by Boris Dayma, upscaler by Xintao Wang, Liangbin Xie et a — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>
