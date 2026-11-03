---
title: "Serverless no AWS Lambda: funções, APIs e automações baratas"
date: "2026-08-24"
category: "tutorial"
tags: ["serverless", "aws", "lambda", "cloud"]
excerpt: "AWS Lambda elimina a necessidade de gerenciar servidores, permitindo que pequenas empresas rodem APIs e automações sem infraestrutura dedicada."
lang: "pt"
---

## Por que servidores “invisíveis” podem ser a resposta para pequenos negócios

Você já recebeu a demanda de um cliente que precisa expor um endpoint para validar cupons, mas não tem orçamento para manter um servidor 24 h por dia? Ou ainda, já precisou sincronizar o estoque da sua loja física com o marketplace e a solução tradicional acabou consumindo horas de desenvolvimento e custos de infraestrutura?  

Essas situações são mais comuns do que imaginamos, principalmente em ambientes de varejo onde cada centavo conta. A proposta do **serverless** — executar código apenas quando um evento acontece — permite transformar essas demandas em funções leves, pagas apenas pelo tempo efetivo de execução. No ecossistema da AWS, o serviço que materializa essa ideia é o **AWS Lambda**.

A seguir, mostro como montar funções, APIs e gatilhos de forma prática e econômica, com exemplos que se aplicam a integrações entre sistemas, sincronização de dados e pipelines de automação.

---


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-24-serverless-no-aws-lambda-funcoes-apis-e-automacoes-baratas.jpg" alt="Servidores da Wikimedia Foundation: a infraestrutura por trás de serviços sob demanda." loading="lazy" />
  <figcaption>
    Servidores da Wikimedia Foundation: a infraestrutura por trás de serviços sob demanda. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AWikimedia_Foundation_Servers-8055_08.jpg">Wikimedia Foundation Servers-8055 08.jpg</a> por Victorgrigas —
    <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## 1. Lambda básico: Python e Node.js na prática  

A primeira coisa que precisamos entender é que uma **Lambda** é simplesmente um trecho de código que a AWS executa em resposta a um evento. Não há servidor para provisionar, nem máquina virtual para monitorar. Basta fazer o upload do código (ou apontar para um repositório) e definir as permissões.

### 1.1 Estrutura mínima de uma função Python  

```python
import json

def lambda_handler(event, context):
    # O objeto `event` traz os dados do gatilho
    name = event.get("queryStringParameters", {}).get("nome", "Mundo")
    resposta = {"mensagem": f"Olá, {name}!"}
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(resposta)
    }
```

Salve o arquivo como `handler.py` e faça o upload como um **deployment package** zipado, ou use o **AWS SAM** (ver seção 7) para automatizar o processo.

### 1.2 Estrutura mínima de uma função Node.js  

```javascript
exports.handler = async (event) => {
    const name = (event.queryStringParameters || {}).nome || "Mundo";
    const resposta = { mensagem: `Olá, ${name}!` };
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resposta)
    };
};
```

O Node.js costuma ser escolhido quando precisamos de bibliotecas de alta performance para I/O, especialmente em pipelines onde a latência de chamadas a APIs externas é crítica.

---

## 2. Transformando a Lambda em API REST com API Gateway  

A Lambda por si só não expõe um endpoint HTTP. Para isso usamos o **Amazon API Gateway**, que roteia requisições HTTP para a função e devolve a resposta ao cliente.

### 2.1 Configuração rápida via Console  

1. Crie uma nova API do tipo *REST API* (não a *HTTP API* para ter controle total de recursos).  
2. Defina um recurso `/saudacao` e um método **GET**.  
3. No *Integration Request*, selecione **Lambda Function** e indique a função criada acima.  
4. Salve e faça *Deploy* para um estágio, por exemplo `dev`.

Pronto, a URL gerada (algo como `https://abcde.execute-api.us-east-1.amazonaws.com/dev/saudacao?nome=Ismael`) já está pronta para ser consumida.

### 2.2 Código de infraestrutura com SAM  

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  SaudacaoFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.11
      Handler: handler.lambda_handler
      CodeUri: ./src
      MemorySize: 128
      Timeout: 5
      Events:
        GetSaudacao:
          Type: Api
          Properties:
            Path: /saudacao
            Method: get
```

Com `sam build && sam deploy --guided` a stack inteira (Lambda + API) é provisionada em poucos minutos. Esse padrão serve bem para expor endpoints que sincronizam estoque entre sistemas e marketplaces, mantendo a camada de integração leve e barata.

---

## 3. Gatilhos de eventos: S3, SQS e DynamoDB  

A grande vantagem do Lambda está na variedade de eventos que podem acioná‑la. Vamos ver três dos mais úteis no dia a dia de um desenvolvedor full‑stack.

### 3.1 Processamento de arquivos com S3  

Imagine que a loja precise gerar miniaturas de imagens de produtos assim que o fornecedor faz upload para um bucket. A Lambda pode ler o objeto, processar a imagem e salvar o resultado em outro bucket.

```python
import boto3
from PIL import Image
import io

s3 = boto3.client('s3')

def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key    = record['s3']['object']['key']

        obj = s3.get_object(Bucket=bucket, Key=key)
        img = Image.open(io.BytesIO(obj['Body'].read()))
        img.thumbnail((200, 200))

        out_buffer = io.BytesIO()
        img.save(out_buffer, 'JPEG')
        out_buffer.seek(0)

        s3.put_object(
            Bucket=f"{bucket}-thumb",
            Key=key,
            Body=out_buffer,
            ContentType='image/jpeg'
        )
```

A configuração do gatilho acontece no console do S3 (aba *Properties → Event notifications*) ou via SAM:

```yaml
Events:
  ImageUpload:
    Type: S3
    Properties:
      Bucket: my-product-images
      Events: s3:ObjectCreated:Put
```

### 3.2 Filas de mensagens com SQS  

Em projetos onde preciso garantir que a ingestão de leads não perca nenhuma mensagem, encaminho os dados para uma fila SQS. Uma Lambda configurada como **consumer** lê a fila, enriquece o lead com IA e grava no banco.

```javascript
exports.handler = async (event) => {
    for (const record of event.Records) {
        const payload = JSON.parse(record.body);
        // chamada fictícia a serviço de IA
        const enriched = await enrichLead(payload);
        await saveToPostgres(enriched);
    }
    return { statusCode: 200 };
};
```

A vantagem é que a Lambda só roda quando houver mensagens, evitando custo fixo.

### 3.3 Streams de alteração no DynamoDB  

Quando o estoque muda em um sistema de origem, a atualização é gravada em uma tabela DynamoDB. Uma Lambda ligada ao **DynamoDB Stream** propaga a mudança para o marketplace em tempo real.

```python
def lambda_handler(event, context):
    for rec in event['Records']:
        if rec['eventName'] == 'MODIFY':
            new_image = rec['dynamodb']['NewImage']
            sku = new_image['sku']['S']
            qty = int(new_image['quantidade']['N'])
            sync_to_marketplace(sku, qty)
```

Essa arquitetura me ajudou a manter a consistência entre os canais de venda sem precisar de um cron job pesado.

---

## 4. Cold start e estratégias de mitigação  

Um **cold start** acontece quando a Lambda precisa inicializar um novo ambiente de execução porque não há instâncias quentes disponíveis. O tempo gasto pode variar de alguns milissegundos a alguns segundos, dependendo do runtime e da quantidade de dependências.

### 4.1 Principais causas  

* **Tamanho do pacote** – mais arquivos = mais tempo de download.  
* **Linguagem** – runtimes como Java e .NET costumam ter inicialização mais lenta que Python ou Node.js.  
* **Memória alocada** – mais memória gera mais CPU, reduzindo o tempo de inicialização.

### 4.2 Mitigações práticas  

1. **Keep‑alive via CloudWatch Events** – agendar invocações a cada 5 minutos mantém a função “quente”. Em testes, essa técnica reduz o tempo médio de resposta de ~800 ms para menos de 150 ms.  
2. **Camadas (Layers) para dependências** – separar bibliotecas grandes em uma camada reutilizável evita que o zip da função cresça.  
3. **Provisioned Concurrency** – a AWS permite reservar instâncias pré‑inicializadas. Embora tenha custo extra, pode ser justificável para APIs críticas.  
4. **Escolha do runtime** – para tarefas simples de validação ou webhook, prefira Python ou Node.js. Quando a carga de trabalho exige alta performance de CPU, considere Go, que já estou estudando intensamente em 2026.

---

## 5. Custos reais vs EC2: quando a conta fecha  

Um ponto que sempre me preocupa ao recomendar soluções a pequenos empresários é o **custo total de propriedade**. Vamos comparar um cenário típico:

| Serviço | Configuração típica | Custo mensal aproximado* |
|---------|--------------------|--------------------------|
| **AWS Lambda** | 128 MB, 200 ms por invocação, 1 M execuções | US$ 0,75 |
| **EC2 t3.micro** | 1 vCPU, 1 GB RAM, 24 h/30 dias | US$ 8,50 |
| **RDS (PostgreSQL)** | db.t3.micro, 20 GB | US$ 15,00 |

\*Valores baseados no preço da região **us-east-1** (2026) e sem descontos.

A diferença é gritante quando a carga é esporádica. Se a API recebe, por exemplo, 10 mil requisições por mês, a Lambda ainda fica abaixo de um dólar, enquanto o EC2 continua consumindo recursos mesmo sem tráfego.

Além disso, a **elasticidade automática** da Lambda elimina a necessidade de dimensionamento manual, reduzindo risco de sub‑ou sobre‑provisionamento.

---

## 6. Automatizando a infraestrutura: SAM vs CDK  

Para que o código da função e a sua configuração cheguem ao ambiente de produção de forma reproduzível, uso ferramentas de *Infrastructure as Code* (IaC).

### 6.1 AWS SAM (Serverless Application Model)  

SAM é uma extensão do CloudFormation focada em recursos serverless. A sintaxe YAML é curta e já inclui abstrações como `AWS::Serverless::Function`. Quando preciso versionar rapidamente uma função, esse é meu primeiro passo.

```yaml
Globals:
  Function:
    Timeout: 10
    Runtime: nodejs20.x

Resources:
  ProcessaLead:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      CodeUri: ./lead-processor
      Events:
        Queue:
          Type: SQS
          Properties:
            Queue: !GetAtt LeadQueue.Arn
```

### 6.2 AWS CDK (Cloud Development Kit)  

Quando o projeto cresce e envolve múltiplos serviços (por exemplo, integração entre um banco relacional, S3, DynamoDB e Lambda), o **CDK** costuma valer a pena porque permite escrever a infraestrutura em TypeScript ou Python, reaproveitando lógica de programação.

```typescript
import * as cdk from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

export class InventarioStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const estoque = new Table(this, 'Estoque', {
      partitionKey: { name: 'sku', type: cdk.aws_dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaSync = new Function(this, 'SyncLambda', {
      runtime: Runtime.PYTHON_3_11,
      handler: 'sync.handler',
      code: Code.fromAsset('lambda/sync'),
      environment: { TABLE_NAME: estoque.tableName },
    });

    estoque.grantReadWriteData(lambdaSync);

    const api = new RestApi(this, 'InventarioAPI');
    const recurso = api.root.addResource('sync');
    recurso.addMethod('POST', new cdk.aws_apigateway.LambdaIntegration(lambdaSync));
  }
}
```

Com `cdk deploy` a stack completa é criada, e alterações futuras são tratadas como diff, evitando surpresas.

---

## 7. Conclusão prática  

Serverless na AWS não é só um modismo; é uma estratégia que permite entregar APIs e automações baratas e escaláveis, mesmo para equipes pequenas.  

Na prática, integrar sistemas exige que a camada de integração seja leve e resiliente. Com poucos megabytes de código, dá para movimentar milhares de pedidos sem precisar de um servidor dedicado.  

Se você ainda tem dúvidas sobre a viabilidade, experimente criar uma função simples, conectar ao API Gateway e medir o custo no console da AWS. A diferença de preço frente a um EC2 tradicional costuma ser reveladora.

---

## Takeaways

- **Comece pequeno**: uma única Lambda pode substituir um servidor inteiro para tarefas pontuais.  
- **Use Python ou Node.js** para tempos de cold start menores e pacotes leves.  
- **Separe dependências em Layers** para reduzir o tamanho do deployment package.  
- **Monitore custos** via AWS Cost Explorer; a maioria das funções serverless fica abaixo de 1 USD por milhão de invocações.  
- **Automatize com SAM ou CDK** para garantir que a infraestrutura acompanhe o código, facilitando a entrega contínua.  
- **Teste estratégias de mitigação de cold start** (keep‑alive, provisioned concurrency) quando a latência for crítica.  

---

## Fontes

- [AWS Lambda – Documentação oficial](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)  
- [Amazon API Gateway – Guia de início rápido](https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started.html)  
- [AWS SAM – Modelo de aplicação serverless](https://aws.amazon.com/serverless/sam/)  
- [AWS CDK – Biblioteca de alto nível para infraestrutura](https://docs.aws.amazon.com/cdk/v2/guide/home.html)  
- [Pricing – AWS Lambda](https://aws.amazon.com/lambda/pricing/)  
- [AWS Blog – Reducing cold start latency](https://aws.amazon.com/blogs/compute/reducing-cold-start-latency/)
## 📸 Crédito da imagem de capa
- **Imagem:** [Wikimedia Foundation Servers-8055 08.jpg](https://commons.wikimedia.org/wiki/File%3AWikimedia_Foundation_Servers-8055_08.jpg)
- **Autor(a):** Victorgrigas
- **Licença:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
