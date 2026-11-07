---
title: "PaperPilot: Building a Zero‑Cloud PDF Engine in Rust with WASM and MCP"
date: "2026-10-26"
category: "tutorial"
tags: ["rust", "wasm", "pdf", "mcp", "open-source"]
excerpt: "How many times have you needed to extract text from a PDF within a web application and found yourself beholden to an external API? You upload the file, wait for the response"
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-26-paperpilot-construindo-um-engine-pdf-zero-cloud-em-rust-com.jpg"
comments: true
translationKey: "2026-10-26-paperpilot-construindo-um-engine-pdf-zero-cloud-em-rust-com"
---
How many times have you needed to extract text from a PDF within a web application and found yourself beholden to an external API? You upload the file, wait for the response, and hope the service is up, your data doesn't leak, and the bill at the end of the month isn't a surprise. If you're building something that relies on this processing, that dependency is a direct point of failure.

That was the exact motivation for PaperPilot. A PDF processing engine written in Rust, compiled to WebAssembly (WASM), and exposed as an MCP (Model Context Protocol) server. The idea is simple: bring the power of Rust to the browser and to local servers, without a single line of code traveling through a third-party service. Privacy, control, and total performance, directly in your environment.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/paperpilot-architecture-diagram.png" alt="Architecture diagram for PaperPilot showing a PDF being processed by the Rust module, compiled to WASM, running in a Web Worker or Node.js server" loading="lazy">
<figcaption>PaperPilot architecture: Rust → WASM, executable on the client or edge servers.</figcaption>
</figure>

## Overview: Rust, WASM, and the MCP Protocol

The core of PaperPilot is a pure Rust library. Rust gives us memory safety, performance comparable to C++, and a type system that eliminates an entire class of bugs at compile time. For processing PDFs, libraries like `pdf-extract` and `lopdf` handle the heavy lifting of parsing and text extraction.

The crucial step is compiling to WebAssembly using `wasm-pack`. WASM is a low-level binary format that runs in a secure sandbox within the browser and in environments like Node.js, Deno, or Cloudflare Workers. The result is a `.wasm` module and a JavaScript wrapper (`paperpilot.js`) that abstracts the complexity.

But how do we consume this in a standardized way? This is where the MCP comes in. The Model Context Protocol, originally created by Anthropic to connect LLMs to tools, is an open standard based on JSON-RPC. We've adapted it to serve as a universal interface for our engine. The PaperPilot MCP server exposes a single main operation: `extract_text`. You send a PDF buffer (Bytes) via a JSON-RPC request and receive the structured text back. This server can be started locally, or its WASM client can be embedded directly into a web application.

## Practical Use Case: Integration in a Full-Stack Project

Let's see how this fits into a real scenario. Imagine an admin dashboard, built with React and TypeScript on the frontend and FastAPI on the backend, where users upload invoices for analysis. The traditional approach would route the file to a backend endpoint, which would then call an external PDF API.

With PaperPilot, we have two elegant options:

**1. 100% Browser Processing (Frontend):**
Load the WASM module and perform extraction directly on the client. The file never leaves the user's machine.

```javascript
// Example with React and Vite
import { useState } from 'react';
import init, { extract_text_from_bytes } from '@paperpilot/core-wasm';

function PDFUploader() {
  const [text, setText] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Initialize the WASM module once
    await init();

    // Call the compiled Rust function
    const extractedText = extract_text_from_bytes(bytes);
    setText(extractedText);
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
      <pre>{text.substring(0, 500)}...</pre>
    </div>
  );
}
```

**2. Backend Processing (no external dependencies):**
The same WASM module can run in Node.js. We create a dedicated endpoint that uses the local engine.

```python
# Example with FastAPI
from fastapi import FastAPI, File, UploadFile
import json
import asyncio
from wasmer import engine, Store, Module, Instance, ImportObject, Function
import io

app = FastAPI()

# Load the WASM module once on startup
with open("paperpilot_core.wasm", "rb") as f:
    wasm_bytes = f.read()
store = Store(engine.Native())
module = Module(store, wasm_bytes)

# Define the import function (simplified)
import_object = ImportObject()
```

```python
@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    
    # Create a new module instance for each request (or use a pool)
    instance = Instance(module, import_object)
    
    # Allocate memory in WASM and copy the PDF bytes
    length = len(contents)
    pointer = instance.exports.allocate(length)
    memory = instance.exports.memory.uint8_view(pointer)
    memory[0:length] = contents
    
    # Call the extraction function
    result_pointer = instance.exports.extract_text_from_bytes(pointer, length)
    
    # Read the result string from WASM memory
    result_bytes = bytearray()
    i = result_pointer
    while memory[i] != 0:  # Read until the null terminator
        result_bytes.append(memory[i])
        i += 1
    
    extracted_text = result_bytes.decode('utf-8')
    
    # Free the allocated memory
    instance.exports.deallocate(pointer, length)
    instance.exports.deallocate(result_pointer, len(result_bytes) + 1)
    
    return {"text": extracted_text}
```

The beauty of this approach is the elimination of a *single point of failure*. Your service won't go down because a third-party PDF provider changed their pricing plan or experienced an outage.

<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/wasm-pack-logo.png" alt="wasm-pack logo, the tool for packaging Rust code into WASM" loading="lazy" width="400" style="max-width: 200px; height: auto;">
<figcaption>wasm-pack is the fundamental tool in the Rust/WASM toolchain. Source: <a href="https://github.com/rustwasm/wasm-pack">Official Repository</a> (MIT/Apache 2.0 License).</figcaption>
</figure>

## Lessons Learned with External Dependencies

My practical experience in two projects made this clear. In **inventory-service**, which synchronizes catalog and inventory between a local POS system and Mercado Livre, the initial reliance on an external API for product data normalization was an operational nightmare. Variable latency, response formats that changed without warning, and costs that scaled with volume. The solution was to internalize the logic, creating our own *parser* and rule set. It was more initial work, but it brought total control and predictability.

In **Plexo**, my centralized task manager, the first version used an external service for natural language date parsing ("tomorrow at 3 PM"). It worked well, until the day the service went offline for hours. The application, which depended on it to create tasks, became practically unusable. Migrating to a pure JavaScript library, executed locally, was one of the best architectural decisions I made for that project.

The pattern is obvious: a critical operational dependency on an external service is an architectural risk. PaperPilot is born from this same philosophy. If PDF processing is a core functionality for your application, why leave its fate in the hands of another infrastructure?

## Step-by-Step: Testing PaperPilot Locally

Let's get our hands dirty. You can test the PaperPilot concept in your environment in just a few minutes. The repository contains an example MCP server and a minimal web client.

**Prerequisites:** Rust, `wasm-pack`, Node.js (v18+), and `cargo-mcp` installed.

```bash
# Clone the example repository (assuming a public repository)
git clone https://github.com/ismaeldouglasdev/paperpilot-demo.git
cd paperpilot-demo

# Compile the Rust library for WASM
cd paperpilot-core
wasm-pack build --target nodejs --release

# Navigate to the example MCP server
cd ../mcp-server
cargo run --release
# The server will be listening at http://localhost:8080
```

In another terminal, we can use a `curl` client to test the MCP endpoint:

```bash
# Convert a PDF to base64 (example for Linux/macOS)
base64 your_file.pdf > pdf_base64.txt

# Create the JSON-RPC payload
cat > request.json <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "extract_text",
  "params": {
    "pdf_bytes_base64": "$(cat pdf_base64.txt | tr -d '\n')"
  }
}
EOF

# Send the request to the MCP server
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d @request.json
```

The response will be a JSON containing the text extracted from the PDF. This same server can be integrated into a command-line tool, a code editor plugin (like an MCP client for Neovim), or embedded as a worker in a larger application.

## The Future of Client-Side Document Processing

The trajectory is clear. The combination of high-performance systems languages (Rust, Zig) with WebAssembly is democratizing access to high-level computation directly on the client. It's not just about PDFs. Imagine complex XML/JSON schema validators, lightweight image processors, data compressors, encryption, all running securely and isolated in the WASM sandbox, without touching a remote server.

This resonates with a broader trend I'm observing: the decentralization of intelligence. Just as smaller, efficient language models (like those powering my AI gateway projects with *health checks*) are migrating to the edge, data processing tools are following the same path. Cloud infrastructure isn't disappearing, but its role is shifting from a primary *computation* provider to an orchestrator of *logic* that runs where it makes the most sense: as close as possible to the data or the end user.

For us, full-stack developers, this radically expands our range of possibilities. We can build more resilient, more private applications with drastically reduced latency for operations that were once unthinkable in the browser.

### Practical Takeaways

*   **Control > Blind Convenience:** Evaluate whether depending on an external API for a core feature is an acceptable risk. Having control over the *stack* can be worth the initial development effort.
*   **WASM is Production-Ready:** The tooling (Rust + `wasm-pack`) and runtimes (browsers, Node.js, Cloudflare Workers) are mature enough for business-critical functionality.
*   **Standardize Integration:** Using a protocol like MCP (or even a simple REST API) to wrap your WASM logic makes consumption consistent, whether in the frontend, backend, or CLI tools.
*   **Think About the Offline Experience:** Features that rely on local processing, like PaperPilot's text extraction, can be a differentiator for applications that need to work in scenarios with intermittent connectivity.

*   **Start with a Prototype:** The barrier to entry for Rust + WASM has dropped dramatically. In an afternoon, you can have a functional prototype of a feature that previously required complex integration with third-party services.

The code doesn't need to leave your machine to be powerful. Sometimes the most robust solution is the one that never touches the internet.

## Sources

-   [The Rust Programming Language (Official Book)](https://doc.rust-lang.org/book/)
-   [Rust and WebAssembly (wasm-bindgen, wasm-pack)](https://rustwasm.github.io/docs/book/)
-   [Model Context Protocol (MCP) – Anthropic](https://spec.modelcontextprotocol.io/specification/)
-   [MDN Web Docs: WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
-   [`lopdf` – Rust PDF library](https://crates.io/crates/lopdf)
-   [Cloudflare Workers: Running WASM](https://developers.cloudflare.com/workers/runtime-apis/webassembly/)