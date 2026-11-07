---
title: "Machine Learning with Python: From scikit-learn to PyTorch in 2026"
date: "2026-10-05"
category: "tutorial"
tags: ["machine-learning", "python", "ia", "data-science"]
excerpt: "Machine Learning (ML) is a rapidly growing field, and its application is becoming more common across various sectors."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em.jpg"
comments: true
translationKey: "2026-10-05-machine-learning-com-python-do-scikit-learn-ao-pytorch-em"
---

## Introduction

Machine Learning (ML) is an ever-expanding field, and its application is becoming increasingly common across various sectors. The ability to transform data into effective decisions is a valuable skill for developers and companies alike. Here, I will show you how to use Python and its popular libraries, such as scikit-learn and PyTorch, to build and implement machine learning models. For those just starting out, understanding how these tools work can be a game-changer when developing effective solutions.

```markdown
## scikit-learn for Classification

The scikit-learn library is one of the most widely used for machine learning in Python, especially for classification and regression tasks. Let's start with a simple classification example using the famous Iris dataset, which contains 150 samples of Iris flowers, each with four features.

```python
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Loading the dataset
iris = load_iris()
X = iris.data
y = iris.target

# Splitting the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Creating the model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Making predictions
y_pred = model.predict(X_test)

# Evaluating the model
accuracy = accuracy_score(y_test, y_pred)
print(f'Accuracy: {accuracy:.2f}')
```

In this code, we use the `RandomForestClassifier` to classify the Iris flowers. The dataset is split into training and testing sets, and we evaluate the model's accuracy. The simplicity of scikit-learn allows you to focus on the logic of your model without worrying too much about implementing complex algorithms.
```

```markdown
## Feature Engineering

A crucial part of machine learning is feature engineering, which involves the creation and selection of the features that will be used in your models. A good set of features can significantly improve your model's performance. Some common techniques include:

- Normalization: Adjusting the data to a common scale, which is especially important for algorithms sensitive to magnitudes.
- Creation of new features: Combining or transforming existing features to better capture relevant information.

Let's look at an example of normalization using the `sklearn.preprocessing` library.

```python
from sklearn.preprocessing import StandardScaler

# Normalizing the data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_train)

# Training the model with the normalized data
model.fit(X_scaled, y_train)
```

Normalization helps improve the convergence of the algorithm and can be an essential step in data preparation.
```

```markdown
## Basic PyTorch: Tensors and Networks

While scikit-learn is great for rapid prototyping and simple models, PyTorch shines in more complex scenarios, especially in deep learning. At its core, PyTorch uses tensors, which are structures similar to arrays but with additional capabilities.

Let's create a simple neural network model for classification using PyTorch.

```python
import torch
import torch.nn as nn
import torch.optim as optim

# Defining the neural network
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(4, 10)  # 4 input features, 10 neurons
        self.fc2 = nn.Linear(10, 3)   # 10 neurons for 3 output classes

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

# Initializing the network and defining the loss function and optimizer
model = SimpleNN()
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Converting the data to tensors
X_tensor = torch.FloatTensor(X_train)
y_tensor = torch.LongTensor(y_train)

# Training the network
for epoch in range(100):
    optimizer.zero_grad()
    outputs = model(X_tensor)
    loss = criterion(outputs, y_tensor)
    loss.backward()
    optimizer.step()

print(f'Final loss: {loss.item():.4f}')
```

This basic example demonstrates how to build a simple neural network in PyTorch. The model is trained using the cross-entropy loss function and the Adam optimizer. The use of tensors allows leveraging the power of the GPU, making training faster compared to CPUs.
```

```markdown
## Training and Evaluation

After constructing the model, the next step is training and evaluation. Both processes are crucial to ensure that your model generalizes well to unseen data. Training involves feeding the model with data and adjusting the weights to minimize loss. Evaluation, on the other hand, is where we check if the model has truly learned.

A basic example of evaluation can be done using the test set mentioned earlier. Let's calculate the accuracy after training.

```python
# Making predictions
with torch.no_grad():
    test_tensor = torch.FloatTensor(X_test)
    test_outputs = model(test_tensor)
    _, predicted = torch.max(test_outputs, 1)

# Evaluating accuracy
accuracy = (predicted.numpy() == y_test).mean()
print(f'Model accuracy: {accuracy:.2f}')
```

Here, we use the `torch.max` function to obtain the predicted classes and calculate the accuracy with respect to the test set.
```

```markdown
## Deploy with FastAPI

After training and evaluating your model, the next step is to put it into production. FastAPI is an excellent tool for building robust and high-performance APIs. Let's see how we can create a simple API for our classification model.

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

In this example, we created an endpoint `/predict/` that accepts input data about an Iris flower and returns the predicted class. FastAPI simplifies the process of building RESTful APIs, allowing you to integrate your machine learning model into real applications.
```

## When to Use Which Tool

The choice between scikit-learn and PyTorch depends on the problem you are trying to solve. If you need a simple model and want quick results, scikit-learn is the ideal choice. On the other hand, if you are dealing with more complex problems, such as image recognition or natural language processing, PyTorch provides the necessary flexibility to build and train custom neural networks.

## Conclusion

Machine learning is a fascinating field full of opportunities. With tools like scikit-learn and PyTorch, it is possible to develop powerful solutions that can transform the way we handle data. Here are some important points to remember:

- Use scikit-learn for rapid prototyping and simple models.
- Invest time in feature engineering to improve your model's performance.
- PyTorch is the right choice for more complex problems that require deep neural networks.
- Don't forget to evaluate your model with unseen data to ensure it generalizes well.
- Use FastAPI to implement and deploy your machine learning solutions.

## Sources

- [Scikit-learn Documentation](https://scikit-learn.org/stable/user_guide.html)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Machine Learning Mastery: Feature Engineering](https://machinelearningmastery.com/feature-engineering-for-machine-learning/)
- [Random Forests for Classification](https://towardsdatascience.com/random-forest-algorithm-in-python-9d1c7f6b8f8a)