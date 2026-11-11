---
title: "Inteligência Artificial para desenvolvedores: LLMs, RAG e agentes"
date: "2026-10-06"
category: "article"
tags: ["ia", "llm", "rag", "agentes", "openai"]
excerpt: "Inteligência Artificial para desenvolvedores: LLMs, RAG e agentes."
cover:
  image: "/covers/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e.jpg"
comments: true
translationKey: "2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e"
---

## Inteligência Artificial para desenvolvedores: LLMs, RAG e agentes

Migrar dados entre sistemas costuma ser uma tarefa manual, lenta e sujeita a erros. Hoje, um script resolve boa parte disso. Mas e se bastasse descrever a tarefa em português para um assistente para que ele escrevesse o script, testasse e sugerisse melhorias? As Large Language Models (LLMs) estão transformando essa possibilidade em uma ferramenta prática no dia a dia do desenvolvimento.


<figure>
<img src="/covers/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e.jpg" alt="Inteligência Artificial para desenvolvedores: LLMs, RAG e agentes" loading="lazy">
<figcaption>Cover image do artigo</figcaption>
</figure>

Este novo paradigma não se resume a um chatbot mais esperto. Trata-se de uma mudança fundamental em como interagimos com código, dados e sistemas. Como desenvolvedor full stack que construiu desde APIs REST em Python até uma dashboard para um sistema de memória de IA open source, vejo essas ferramentas se desdobrando em três camadas principais: as LLMs como núcleo inteligente, o RAG para dar a elas memória específica e os agentes para transformar intenções em ações.

Vou explicar como cada peça funciona, onde elas se encaixam e, principalmente, como você pode começar a usá-las hoje em projetos reais.

### O núcleo da conversa: como as LLMs funcionam (em termos práticos)

Uma LLM, no fim do dia, é um modelo de linguagem treinado em uma quantidade colossal de texto. Pense em trilhões de tokens, que podem ser palavras, partes de palavras ou caracteres, extraídos da internet, de livros, de código e de outros textos.

O treinamento envolve ensinar o modelo a prever o próximo token em uma sequência. Dada a frase "O servidor está rodando na porta...", o modelo aprende que "3000", "8080" ou "5432" são previsões prováveis com base nos padrões que viu. Essa é a geração autogressiva. A arquitetura por trás disso, quase onipresente hoje, é o Transformer, introduzido em 2017. Ela utiliza um mecanismo de "autoatenção" que permite ao modelo pesar a importância de diferentes palavras em uma sentença, independentemente da distância entre elas. É isso que dá a uma LLM a capacidade de manter coerência de contexto em parágrafos mais longos.

O resultado é um modelo que internalizou padrões de linguagem, raciocínio e até estilos de código. Quando você pede para uma LLM como o GPT-4 ou o Claude escrever uma função em Python que valida um CPF, ela não está copiando de um lugar específico. Está recombinando os padrões de sintaxe Python, lógica de validação e formatação de código que assimilou durante o treinamento.

Para nós, desenvolvedores, a interface prática são as APIs. Um *prompt* como o abaixo envia um contexto e uma instrução para o modelo e recebe uma conclusão.

```python
import openai

client = openai.OpenAI(api_key="sua-chave")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Você é um assistente especializado em Python."},
        {"role": "user", "content": "Escreva uma função que recebe uma string e retorna True se for um palíndromo, ignorando espaços e pontuação."}
    ]
)

print(response.choices[0].message.content)
```

O output seria algo como:

```python
import re

def is_palindromo(texto: str) -> bool:
    """
    Verifica se uma string é um palíndromo, ignorando espaços, pontuação e diferenças de caixa.
    """
    # Remove tudo que não é letra ou número e converte para minúsculas
    texto_limpo = re.sub(r'[^a-zA-Z0-9]', '', texto).lower()
    return texto_limpo == texto_limpo[::-1]

# Exemplo de uso
if __name__ == "__main__":
    print(is_palindromo("A man, a plan, a canal: Panama"))  # True
    print(is_palindromo("Hello, world!"))  # False
```

Esse é o poder bruto. Mas ele tem limites claros: o modelo não sabe nada sobre os dados específicos da sua empresa, a documentação interna da sua API ou as discussões do seu repositório GitHub da última semana. Ele está preso ao conhecimento geral do seu corte de treinamento. É aí que entra a próxima camada.

### RAG: Dando memória e contexto próprio à IA

RAG significa *Retrieval-Augmented Generation* (Geração Aumentada por Recuperação). É a técnica que resolve o problema do conhecimento desatualizado ou específico. Em vez de confiar apenas na memória interna do modelo, um sistema RAG primeiro consulta uma base de conhecimento externa (seus documentos, código, tickets) e depois insere essa informação relevante no prompt do modelo.

Imagine que você quer que um assistente ajude desenvolvedores a usar a API interna do seu SaaS. A documentação está em 50 páginas de um Confluence. Um usuário pergunta: "Como crio um webhook para o evento `invoice.paid`?".

Um sistema RAG funciona assim:
1.  **Indexação:** Todos os documentos são quebrados em pedaços (chunks), convertidos em vetores numéricos (embeddings) usando um modelo como o `text-embedding-3-small` e armazenados em um banco de dados vetorial (como o Pinecone, Weaviate ou um local como o Chroma).
2.  **Recuperação (Retrieval):** Quando chega uma pergunta, ela também é convertida em um vetor. O sistema busca no banco vetorial os pedaços de texto mais semanticamente similares à pergunta.
3.  **Geração (Generation):** Os textos recuperados são injetados como contexto em um prompt para a LLM, que então formula uma resposta precisa e fundamentada.

Aqui está um esqueleto funcional de um RAG simples com Python, FastAPI e Chroma:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

# Configuração
OPENAI_API_KEY = "sua-chave-openai"
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

@app.post("/ask")
async def ask_rag(request: QueryRequest):
    # 1. Recuperação
    results = collection.query(
        query_texts=[request.question],
        n_results=3
    )
    context = "\n---\n".join(results['documents'][0])

    # 2. Geração Aumentada
    prompt = f"""
    Com base no contexto abaixo, responda à pergunta do usuário.
    Se a resposta não estiver no contexto, diga claramente 'Não encontrei essa informação na documentação'.

    Contexto:
    {context}

    Pergunta: {request.question}
    Resposta:
    """
    response = client_openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    return {"answer": response.choices[0].message.content}

# (Antes, você precisaria indexar seus documentos)
# documents = ["Texto da doc 1...", "Texto da doc 2..."]
# collection.add(documents=documents, ids=[f"doc_{i}" for i in range(len(documents))])
```

Para memória de longo prazo de agentes, é comum indexar interações passadas (feitos ou *facts*) e, quando o agente precisa lembrar de algo, buscar os mais relevantes para o contexto atual. A lição é a mesma: contexto é tudo.

### Function Calling e Tools: A ponte para o mundo real

Uma LLM com RAG é um oráculo bem-informado. Mas ainda é um oráculo, preso ao domínio das palavras. *Function calling* (ou tool use) é o mecanismo que permite ao modelo interagir com o mundo exterior. Você define ferramentas (funções) que o modelo pode "escolher" chamar, fornecendo os argumentos necessários em um formato estruturado (geralmente JSON). Seu código então executa a função e retorna o resultado para o modelo, que pode continuar o raciocínio.

Isso é transformador. De repente, seu assistente pode:
*   Buscar a previsão do tempo em uma API.
*   Inserir um ticket no Jira.
*   Consultar o saldo no banco de dados PostgreSQL.
*   Enviar um e-mail via SendGrid.

Veja um exemplo que consulta um banco de dados fictício de usuários:

```python
import json
from openai import OpenAI
import sqlite3

client = OpenAI(api_key="sua-chave")

# Definição das ferramentas (tools) disponíveis
tools = [
    {
        "type": "function",
        "function": {
            "name": "query_user_database",
            "description": "Consulta o banco de dados de usuários por nome ou ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_type": {
                        "type": "string",
                        "enum": ["by_name", "by_id"],
                        "description": "Tipo de busca: por nome ou por ID."
                    },
                    "search_term": {
                        "type": "string",
                        "description": "Nome do usuário ou ID para buscar."
                    }
                },
                "required": ["search_type", "search_term"]
            }
        }
    }
]

# A função real que será chamada
def query_user_database(search_type: str, search_term: str):
    """Simula uma consulta ao banco de dados."""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    if search_type == "by_name":
        cursor.execute("SELECT id, name, email FROM users WHERE name LIKE ?", (f'%{search_term}%',))
    else:  # by_id
        cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (search_term,))
    results = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "email": r[2]} for r in results]

# Conversa com o modelo
messages = [{"role": "user", "content": "Quem é o usuário com ID 42? E depois, encontre alguém chamado 'Maria'."}]

# Primeira chamada: o modelo "escolhe" usar a ferramenta
response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)
message = response.choices[0].message
messages.append(message)

# Se o modelo quiser chamar uma função...
if message.tool_calls:
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        # Executa a função real
        function_response = query_user_database(**function_args)
        # Adiciona o resultado da função ao histórico
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(function_response)
        })
    # Segunda chamada: modelo processa o resultado e responde
    second_response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    print(second_response.choices[0].message.content)
```

Esse padrão é o alicerce para os agentes: eles precisam invocar comandos do sistema, ler arquivos e interagir com ferramentas para executar tarefas.

### Agentes Autônomos: Orquestrando pensamento e ação

Um agente é um sistema que junta tudo: LLM para raciocínio, RAG para memória e *function calling* para ação. Ele opera em um loop. O modelo de ReAct (Reason + Act) é um padrão comum:
1.  **Pensar (Think):** O modelo analisa o objetivo, o histórico e as ferramentas disponíveis.
2.  **Agir (Act):** Decide chamar uma ferramenta (ou parar). Gora os argumentos.
3.  **Observar (Observe):** Recebe a observação (resultado da ferramenta) e a adiciona ao contexto.
4.  **Repetir:** Continua até chegar a uma conclusão final.

O agente:
*   *Pensa:* "Preciso buscar as tasks do backlog, filtrar por menção ao bug #123, e depois atualizar o campo `team`."
*   *Ato:* Chama a ferramenta `get_tasks(filter="backlog")`.
*   *Observa:* Recebe uma lista de 15 tasks.
*   *Pensa:* "Agora preciso filtrar essas 15 localmente, pois a API não tem filtro por tag. Vou analisar os títulos e descrições."
*   *Ato:* (Processamento interno) Identifica 3 tasks relevantes.
*   *Pensa:* "Agora chamo a ferramenta para atualizar cada uma."
*   *Ato:* Chama `update_task(task_id=xyz, fields={"team": "frontend"})` para cada uma.

Frameworks como LangChain, LlamaIndex e o mais recente Microsoft Autogen facilitam a construção desses fluxos. A complexidade real está no design do fluxo de trabalho e no tratamento robusto de erros.

### Roteamento e Fallbacks: Lidando com a realidade instável

Nem toda pergunta precisa do GPT-4. Nem toda API de IA está 100% disponível. Em produção, você precisa de resiliência.

**Roteamento** é direcionar a solicitação para o modelo ou estratégia mais adequada. Uma pergunta simples de formatação de código pode ir para o GPT-3.5 Turbo, mais barato e rápido. Uma tarefa complexa de arquitetura exige o GPT-4 ou o Claude 3.5 Sonnet. Você pode rotear com base na complexidade estimada do prompt, no tópico ou até em testes A/B.

**Fallbacks** são seu plano B. Se a chamada para a API principal falhar (timeout, quota excedida, erro 5XX), seu sistema deve automaticamente tentar um modelo alternativo. Monitorar a saúde dos endpoints e redirecionar o tráfego para o próximo provedor saudável em caso de falhas é uma prática essencial.

Aqui está a ideia central, simplificada:

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
                continue  # Provedor em "cooldown"

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
                print(f"Erro no provedor {provider['name']}: {e}")
                # Coloca o provedor em cooldown por 30 segundos
                provider["cooldown_until"] = asyncio.get_event_loop().time() + 30
                break  # Tenta o próximo provedor
        await asyncio.sleep(1)
    raise Exception("Todos os provedores falharam.")
```

### Custo, Latência e Considerações Práticas

Essa nova capacidade tem um preço, e não só monetário. O custo das APIs de LLM pode escalar rapidamente. Uma chamada ao GPT-4 para um prompt grande pode custar centavos de dólar. Milhares de chamadas por dia viram uma conta significativa. Estratégias são fundamentais:
*   **Cache de embeddings e respostas:** Se muitas perguntas são similares, cache-as.
*   **Prompt eficiente:** Seja conciso. Evite contexto desnecessário.
*   **Modelos em camadas:** Use modelos menores e mais baratos (GPT-3.5, Haiku) sempre que possível, reservando os grandes (GPT-4, Sonnet) para problemas complexos.
*   **Modelos locais:** Para tarefas específicas (classificação de texto, extração de entidades), um modelo menor e especializado rodando localmente (via Transformers.js, Ollama, ou ONNX Runtime) pode ter custo zero e latência baixa.

A latência é outra inimiga. Uma cadeia de RAG com múltiplas buscas vetoriais e chamadas de LLM pode levar vários segundos. Isso é inaceitável para uma interface síncrona. A solução está em operações assíncronas, streaming de respostas (onde o modelo vai escrevendo a resposta token por token) e pré-computação de embeddings.

Por fim, a confiabilidade. LLMs podem "alucinar" - inventar fatos, URLs de documentação ou parâmetros de API que não existem. Um sistema de produção precisa de verificações: validar se um código gerado é sintaticamente correto (com um linter), se uma chamada de API segue o schema esperado (com Pydantic) e ter sempre um caminho para fallback humano (um botão "escalar para suporte").

### Conclusão: Integrando a IA no seu Fluxo de Trabalho

A IA generativa não vai substituir desenvolvedores tão cedo. Mas desenvolvedores que usam IA generativa sim substituirão os que não usam. Ela é uma multiplicadora de força, uma ferramenta para automatizar o tedioso, explorar soluções rapidamente e acessar conhecimento específico em segundos.

O valor está na integração prática. Não se trata de construir um assistente generalista de primeira tentativa. Comece pequeno:
1.  Automatize a geração de *boilerplate* de código no seu editor (via Copilot ou um plugin próprio).
2.  Implemente um Q&A sobre sua documentação técnica interna usando RAG.
3.  Crie um *script* assistido por IA para analisar logs ou gerar relatórios a partir do banco de dados.

Os blocos básicos estão aí. LLMs fornecem o raciocínio, RAG fornece o contexto especializado e *function calling* fornece os braços para agir no mundo digital. Cabe a nós, desenvolvedores, orquestrar essas capacidades para construir software mais robusto, resolver problemas de negócio reais e, quem sabe, ganhar algumas horas no dia para focar no que realmente importa: a arquitetura, a experiência do usuário e os problemas desafiadores que ainda exigem criatividade humana pura.

**Takeaways práticos:**
*   Use LLMs via API (OpenAI, Anthropic, Google) para prototipagem rápida e geração de código *boilerplate*.
*   Implemente RAG quando precisar que a IA acesse conhecimento específico, interno e atualizado da sua empresa ou projeto.
*   Estenda a utilidade da IA com *function calling*, permitindo que ela interaja com suas APIs, bancos de dados e serviços.
*   Projete agentes como fluxos de trabalho (pensar-agir-observar) para tarefas multi-etapa complexas.
*   Em produção, nunca dependa de um único modelo ou provedor. Implemente roteamento e fallbacks para resiliência.
*  Monitore custo e latência desde o início. Otimizar prompts e usar caches pode reduzir sua conta em uma ordem de grandeza.

## Fontes

*   [Documentação oficial da OpenAI: API Chat Completions](https://platform.openai.com/docs/api-reference/chat)
*   [Documentação do LangChain: Conceitos de Agentes e Tools](https://python.langchain.com/docs/concepts/#agents)
*   [Paper original "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)](https://arxiv.org/abs/2005.11401)
*   [Chroma DB: Guia de Início Rápido para Bancos de Dados Vetoriais](https://docs.trychroma.com/getting-started)
*   [Anthropic Claude: Documentação da API de Mensagens](https://docs.anthropic.com/en/api/messages)


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-10-06-inteligencia-artificial-para-desenvolvedores-llms-rag-e-1.jpg" alt="Inteligência Artificial para desenvolvedores: LLMs, RAG e agentes" loading="lazy">
<figcaption>Neural net completion for "artificial intelligence", as done by DALL-E mini hosted on HuggingFace, 4 June 2022 (code under Apache 2.0 license). Upscaled with Re. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AArtificial_intelligence_prompt_completion_by_dalle_mini.jpg">Artificial intelligence prompt completion by dalle mini.jpg</a> por Prompt by JPxG, model by Boris Dayma, upscaler by Xintao Wang, Liangbin Xie et a — <a href="https://creativecommons.org/licenses/">Public domain</a> · via Wikimedia Commons</figcaption>
</figure>
