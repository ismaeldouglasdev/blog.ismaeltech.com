---
title: "Serverless on AWS Lambda: Affordable Functions, APIs, and Automation"
date: "2026-08-24"
category: "tutorial"
tags: ["serverless", "aws", "lambda", "cloud"]
excerpt: "Serverless on AWS Lambda: how \"invisible\" servers let small businesses run APIs and automations without dedicated infrastructure."
lang: "en"
comments: true
translation_of: "2026-08-24-serverless-no-aws-lambda-funcoes-apis-e-automacoes-baratas"
---



## Why “invisible” servers might be the answer for small businesses

Have you ever received a request from a client who needs to expose an endpoint to validate coupons, but doesn’t have the budget to keep a server running 24 hours a day? Or have you ever needed to sync the inventory of your physical store with a marketplace, only to find that the traditional solution consumed hours of development and infrastructure costs?  

These situations are more common than we imagine, especially in retail environments where every penny counts. The promise of **serverless** — executing code only when an event occurs — allows you to turn those demands into lightweight functions, paid only for the actual execution time. In the AWS ecosystem, the service that materializes this idea is **AWS Lambda**.

Below, I'll show how to build functions, APIs, and triggers in a practical and cost-effective way.


<figure>
  <img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-08-24-serverless-no-aws-lambda-funcoes-apis-e-automacoes-baratas.jpg" alt="Wikimedia Foundation servers: the infrastructure behind on-demand services." loading="lazy" />
  <figcaption>
    Wikimedia Foundation servers: the infrastructure behind on-demand services. — Image: <a href="https://commons.wikimedia.org/wiki/File%3AWikimedia_Foundation_Servers-8055_08.jpg">Wikimedia Foundation Servers-8055 08.jpg</a> by Victorgrigas —
    <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> · via Wikimedia Commons
  </figcaption>
</figure>

## 1. Basic Lambda: Python and Node.js in practice  

The first thing we need to understand is that a **Lambda** is simply a snippet of code that AWS runs in response to an event. There is no server to provision, nor a virtual machine to monitor. Just upload the code (or point to a repository) and set the permissions.

### 1.1 Minimal structure of a Python function  

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

Save the file as `handler.py` and upload it as a zipped **deployment package**, or use **AWS SAM** (see section 7) to automate the process.

### 1.2 Minimal structure of a Node.js function  

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

Node.js is often chosen when high‑performance libraries for I/O are needed, especially when external API latency is critical.

## 2. Turning the Lambda into a REST API with API Gateway  

A Lambda by itself does not expose an HTTP endpoint. For that we use **Amazon API Gateway**, which routes HTTP requests to the function and returns the response to the client.

### 2.1 Quick setup via Console  

1. Create a new API of type *REST API* (not an *HTTP API* to have full resource control).  
2. Define a `/saudacao` resource and a **GET** method.  
3. In the *Integration Request*, select **Lambda Function** and specify the function created above.  
4. Save and *Deploy* to a stage, for example `dev`.

Done, the generated URL (something like `https://abcde.execute-api.us-east-1.amazonaws.com/dev/saudacao?nome=Ismael`) is now ready to be consumed.

### 2.2 Infrastructure code with SAM  

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

With `sam build && sam deploy --guided` the entire stack (Lambda + API) will be provisioned in a few minutes. This pattern is commonly used to expose endpoints that synchronize inventory between a POS system and a marketplace, keeping the integration layer lightweight and cheap.

## 3. Event Triggers: S3, SQS, and DynamoDB  

The biggest advantage of Lambda is the variety of events that can invoke it. Let’s look at three of the most useful ones for a full‑stack developer’s daily work.

### 3.1 File processing with S3  

Imagine the store needs to generate thumbnails of product images as soon as the supplier uploads them to a bucket. Lambda can read the object, process the image, and save the result to another bucket.

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

The trigger configuration is done in the S3 console (Properties → *Event notifications* tab) or via SAM:

```yaml
Events:
  ImageUpload:
    Type: S3
    Properties:
      Bucket: my-product-images
      Events: s3:ObjectCreated:Put
```

### 3.2 Message queues with SQS  

In projects where I need to guarantee that lead ingestion never loses a message, I route the data to an SQS queue. A Lambda configured as a **consumer** reads the queue, enriches the lead with AI, and writes it to the database.

```javascript
exports.handler = async (event) => {
    for (const record of event.Records) {
        const payload = JSON.parse(record.body);
        // fictitious call to an AI service
        const enriched = await enrichLead(payload);
        await saveToPostgres(enriched);
    }
    return { statusCode: 200 };
};
```

The benefit is that Lambda only runs when there are messages, avoiding fixed costs.

### 3.3 Change streams in DynamoDB  

When inventory changes in a POS system, writing the update to a DynamoDB table and attaching a Lambda to a DynamoDB Stream propagates the change to the marketplace in real time.

```python
def lambda_handler(event, context):
    for rec in event['Records']:
        if rec['eventName'] == 'MODIFY':
            new_image = rec['dynamodb']['NewImage']
            sku = new_image['sku']['S']
            qty = int(new_image['quantidade']['N'])
            sync_to_marketplace(sku, qty)
```

This architecture helped me maintain consistency across sales channels without needing a heavy cron job.

## 4. Cold start and mitigation strategies  

A **cold start** occurs when Lambda has to spin up a new execution environment because no warm instances are available. The time spent can range from a few milliseconds to several seconds, depending on the runtime and the number of dependencies.

### 4.1 Main causes  

* **Package size** – more files = longer download time.  
* **Language** – runtimes such as Java and .NET tend to start slower than Python or Node.js.  
* **Allocated memory** – more memory provides more CPU, reducing initialization time.

### 4.2 Practical mitigations  

1. **Keep‑alive via CloudWatch Events** – scheduling invocations every 5 minutes keeps the function “warm”. In tests, this technique reduced the average response time from ~800 ms to under 150 ms.  
2. **Layers for dependencies** – separating large libraries into a reusable layer prevents the function zip from growing.  
3. **Provisioned Concurrency** – AWS allows you to reserve pre‑initialized instances. Although it adds extra cost, it can be justified for critical APIs.  
4. **Runtime choice** – for simple validation or webhook tasks, prefer Python or Node.js. When the workload demands high CPU performance, consider Go, which I am studying intensively in 2026.

## 5. Real Costs vs EC2: When the Numbers Add Up  

A point that always worries me when recommending solutions to small business owners is the **total cost of ownership**. Let’s compare a typical scenario:

| Service | Typical configuration | Approximate monthly cost* |
|---------|------------------------|---------------------------|
| **AWS Lambda** | 128 MB, 200 ms per invocation, 1 M executions | US$ 0.75 |
| **EC2 t3.micro** | 1 vCPU, 1 GB RAM, 24 h/30 days | US$ 8.50 |
| **RDS (PostgreSQL)** | db.t3.micro, 20 GB | US$ 15.00 |

\*Values based on the price in the **us-east-1** region (2026) and without discounts.

The difference is striking when the load is sporadic. If the API receives, for example, 10 k requests per month, Lambda still stays below a dollar, while EC2 continues consuming resources even with no traffic.

Moreover, Lambda’s **automatic elasticity** eliminates the need for manual scaling, reducing the risk of under‑ or over‑provisioning.

## 6. Automating the infrastructure: SAM vs CDK  

To get the function code and its configuration into production in a reproducible way, I use *Infrastructure as Code* (IaC) tools.

### 6.1 AWS SAM (Serverless Application Model)  

SAM is an extension of CloudFormation focused on serverless resources. The YAML syntax is concise and already includes abstractions like `AWS::Serverless::Function`. When I need to version a function quickly, this is my first step.

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

When a project grows and involves multiple stacks (for example, integration between a POS system, S3, DynamoDB, and Lambda), **CDK** is a good choice because it lets you write the infrastructure in TypeScript or Python, reusing program logic.

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

With `cdk deploy` the full stack is created, and future changes are handled as a diff, avoiding surprises.

## 7. Practical Conclusion  

Serverless on AWS isn’t just a fad; it’s a strategy that lets developers deliver cheap, scalable APIs and automations. Integration between store systems and marketplaces must be lightweight and resilient. With small Lambda functions, it’s possible to move thousands of orders without needing a dedicated server.  

If you still have doubts about feasibility, try creating a simple function, hook it up to API Gateway, and measure the cost in the AWS console. The price difference compared to a traditional EC2 is usually eye‑opening.

## Takeaways

- **Start small**: a single Lambda can replace an entire server for occasional tasks.  
- **Use Python or Node.js** for lower cold start times and lightweight packages.  
- **Separate dependencies into Layers** to reduce the size of the deployment package.  
- **Monitor costs** via AWS Cost Explorer; most serverless functions stay below 1 USD per million invocations.  
- **Automate with SAM or CDK** to ensure the infrastructure tracks the code, making continuous delivery easier.  
- **Test cold start mitigation strategies** (keep‑alive, provisioned concurrency) when latency is critical.  

## Sources

- [AWS Lambda – Official Documentation](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)  
- [Amazon API Gateway – Quick Start Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started.html)  
- [AWS SAM – Serverless Application Model](https://aws.amazon.com/serverless/sam/)  
- [AWS CDK – High‑level Infrastructure Library](https://docs.aws.amazon.com/cdk/v2/guide/home.html)  
- [Pricing – AWS Lambda](https://aws.amazon.com/lambda/pricing/)  
- [AWS Blog – Reducing cold start latency](https://aws.amazon.com/blogs/compute/reducing-cold-start-latency/)
## 📸 Cover image credit
- **Image:** [Wikimedia Foundation Servers-8055 08.jpg](https://commons.wikimedia.org/wiki/File%3AWikimedia_Foundation_Servers-8055_08.jpg)
- **Author:** Victorgrigas
- **License:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · via Wikimedia Commons
