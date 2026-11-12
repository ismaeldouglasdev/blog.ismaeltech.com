---
title: "Machine Learning com Python: do scikit-learn ao PyTorch em 2026"
date: "2026-10-05"
category: "tutorial"
tags: ["machine-learning", "python", "ia", "data-science"]
excerpt: "Machine Learning (ML) é uma área em constante expansão, e sua aplicação está se tornando cada vez mais comum em diversos setores."
cover:
  image: "/covers/2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em.jpg"
comments: true
translationKey: "2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em"
---

## Introdução

Machine Learning (ML) é uma área em constante expansão, e sua aplicação está se tornando cada vez mais comum em diversos setores. A capacidade de transformar dados em decisões eficazes é uma habilidade valiosa para desenvolvedores e empresas. Aqui, vou mostrar como utilizar Python e suas bibliotecas populares, como scikit-learn e PyTorch, para construir e implementar modelos de machine learning. Para quem está começando, entender como essas ferramentas funcionam pode ser um divisor de águas na hora de desenvolver soluções eficazes.

## scikit-learn para classificação

A biblioteca scikit-learn é uma das mais utilizadas para machine learning em Python, especialmente para tarefas de classificação e regressão. Vamos começar com um exemplo simples de classificação usando o famoso conjunto de dados Iris, que contém 150 amostras de flores Iris, cada uma com quatro características.


<figure>
<img src="/media/2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em-1.jpg" alt="Machine Learning com Python: do scikit-learn ao PyTorch em 2026" loading="lazy">
<figcaption>A calibration plot example from Python's scikit-learn documentation. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3ACalibration_plot.png">Calibration plot.png</a> por Jan Hendrik Metzen — <a href="http://opensource.org/licenses/bsd-license.php">BSD</a> · via Wikimedia Commons</figcaption>
</figure>

```python
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Carregando o conjunto de dados
iris = load_iris()
X = iris.data
y = iris.target

# Dividindo o conjunto de dados em treino e teste
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Criando o modelo
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Fazendo previsões
y_pred = model.predict(X_test)

# Avaliando o modelo
accuracy = accuracy_score(y_test, y_pred)
print(f'Acurácia: {accuracy:.2f}')
```

Neste código, utilizamos o `RandomForestClassifier` para classificar as flores Iris. O conjunto de dados é dividido em treino e teste, e avaliamos a precisão do modelo. A simplicidade da scikit-learn permite que você se concentre na lógica do seu modelo, sem se preocupar muito com a implementação de algoritmos complexos.

## Feature Engineering

Uma parte crucial do machine learning é o feature engineering, que envolve a criação e seleção das características que serão usadas em seus modelos. Um bom conjunto de características pode melhorar significativamente a performance do seu modelo. Algumas técnicas comuns incluem:

- Normalização: Ajustar os dados para uma mesma escala, o que é especialmente importante para algoritmos sensíveis a magnitudes.
- Criação de novas características: Combinando ou transformando características existentes para capturar melhor a informação relevante.

Vamos ver um exemplo de normalização com a biblioteca `sklearn.preprocessing`.

```python
from sklearn.preprocessing import StandardScaler

# Normalizando os dados
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_train)

# Treinando o modelo com os dados normalizados
model.fit(X_scaled, y_train)
```

A normalização ajuda a melhorar a convergência do algoritmo e pode ser um passo essencial na preparação dos dados.

## PyTorch básico: tensores e redes

Enquanto scikit-learn é ótimo para protótipos rápidos e modelos simples, o PyTorch brilha em cenários mais complexos, especialmente em deep learning. Na sua essência, o PyTorch utiliza tensores, que são estruturas semelhantes a arrays, mas com capacidades adicionais.


<figure>
<img src="/media/2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em-2.jpg" alt="Machine Learning com Python: do scikit-learn ao PyTorch em 2026" loading="lazy">
<figcaption>Estimating Greenhouse Gas Concentration from Space using Machine Learning
This year, two satellites are challenging the usual methods for calculating Greenhouse. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3AEstimating_Greenhouse_Gas_Concentration_from_Space_using_Machine_Learning_at_Laboratoire_LMD_-_54482717148.jpg">Estimating Greenhouse Gas Concentration from Space using Machine Learning at Laboratoire LMD - 54482717148.jpg</a> por Ecole  polytechnique / Jérémy Barande — <a href="https://creativecommons.org/licenses/by-sa/2.0">CC BY-SA 2.0</a> · via Wikimedia Commons</figcaption>
</figure>

Vamos criar um modelo simples de rede neural para classificação usando o PyTorch.

```python
import torch
import torch.nn as nn
import torch.optim as optim

# Definindo a rede neural
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(4, 10)  # 4 características de entrada, 10 neurônios
        self.fc2 = nn.Linear(10, 3)   # 10 neurônios para 3 classes de saída

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

# Inicializando a rede e definindo a função de perda e o otimizador
model = SimpleNN()
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Convertendo os dados para tensores
X_tensor = torch.FloatTensor(X_train)
y_tensor = torch.LongTensor(y_train)

# Treinando a rede
for epoch in range(100):
    optimizer.zero_grad()
    outputs = model(X_tensor)
    loss = criterion(outputs, y_tensor)
    loss.backward()
    optimizer.step()

print(f'Perda final: {loss.item():.4f}')
```

Este exemplo básico mostra como construir uma rede neural simples em PyTorch. O modelo é treinado usando a função de perda de entropia cruzada e o otimizador Adam. O uso de tensores permite aproveitar o poder da GPU, tornando o treinamento mais rápido em comparação com CPUs.

## Treinamento e avaliação

Após a construção do modelo, o próximo passo é o treinamento e avaliação. Ambos os processos são cruciais para garantir que seu modelo generalize bem para dados não vistos. O treinamento envolve alimentar o modelo com dados e ajustar os pesos para minimizar a perda. A avaliação, por outro lado, é onde verificamos se o modelo realmente aprendeu.

Um exemplo básico de avaliação pode ser feito usando o conjunto de teste já mencionado anteriormente. Vamos calcular a precisão após o treinamento.

```python
# Fazendo previsões
with torch.no_grad():
    test_tensor = torch.FloatTensor(X_test)
    test_outputs = model(test_tensor)
    _, predicted = torch.max(test_outputs, 1)

# Avaliando a precisão
accuracy = (predicted.numpy() == y_test).mean()
print(f'Acurácia do modelo: {accuracy:.2f}')
```

Aqui, utilizamos a função `torch.max` para obter as classes previstas e calculamos a precisão em relação ao conjunto de teste.

## Deploy com FastAPI

Depois de treinar e avaliar seu modelo, o próximo passo é colocá-lo em produção. O FastAPI é uma excelente ferramenta para construir APIs robustas e de alto desempenho. Vamos ver como podemos criar uma API simples para nosso modelo de classificação.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class IrisData(BaseModel):
    sepal_length: float
    sepal_width: float
    petal_length: float
    petal_width: float

@app.post("/predict/")
def predict(data: IrisData):
    input_data = torch.FloatTensor([[data.sepal_length, data.sepal_width, data.petal_length, data.petal_width]])
    with torch.no_grad():
        output = model(input_data)
        _, predicted = torch.max(output, 1)
    return {"class": int(predicted.item())}
```

Neste exemplo, criamos um endpoint `/predict/` que aceita dados de entrada sobre uma flor Iris e retorna a classe prevista. O FastAPI facilita o processo de construção de APIs RESTful, permitindo que você integre seu modelo de machine learning em aplicações reais.

## Quando usar qual ferramenta

A escolha entre scikit-learn e PyTorch depende do problema que você está tentando resolver. Se você precisa de um modelo simples e quer resultados rápidos, a scikit-learn é a escolha ideal. Por outro lado, se está lidando com problemas mais complexos, como reconhecimento de imagem ou processamento de linguagem natural, o PyTorch oferece a flexibilidade necessária para construir e treinar redes neurais personalizadas.

## Conclusão

Machine learning é uma área fascinante e cheia de oportunidades. Com ferramentas como scikit-learn e PyTorch, é possível desenvolver soluções poderosas que podem transformar a maneira como lidamos com dados. Aqui estão alguns pontos importantes para lembrar:

- Utilize scikit-learn para protótipos rápidos e modelos simples.
- Invista tempo em feature engineering para melhorar a performance do seu modelo.
- O PyTorch é a escolha certa para problemas mais complexos que exigem redes neurais profundas.
- Não esqueça de avaliar seu modelo com dados não vistos para garantir que ele generalize bem.
- Use o FastAPI para implementar e disponibilizar suas soluções de machine learning.

## Fontes

- [Scikit-learn Documentation](https://scikit-learn.org/stable/user_guide.html)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Machine Learning Mastery: Feature Engineering](https://machinelearningmastery.com/feature-engineering-for-machine-learning/)
- [Random Forests for Classification](https://towardsdatascience.com/random-forest-algorithm-in-python-9d1c7f6b8f8a)