---
title: "Kubernetes pra iniciantes: conceitos essenciais sem complicação"
date: "2026-09-27"
category: "tutorial"
tags: ["kubernetes", "devops", "containers"]
excerpt: "Kubernetes pra iniciantes: conceitos essenciais sem complicação."
cover:
  image: "https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/covers/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem.jpg"
comments: true
translationKey: "2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem"
---

Rodar uma aplicação localmente funciona bem. Colocá-la no ar em vários ambientes, com saúde, escalonamento e configuração separada, já é outro desafio. Este post mostra o caminho mais direto para subir um app no Kubernetes: você vai entender Pods, Deployments, Services, Ingress, ConfigMaps e Secrets, e como essas peças se conectam para rodar sua aplicação de forma mais resiliente.

A progressão é Pod → Deployment → Service → Ingress → ConfigMap/Secret → escala. Cada etapa só faz sentido depois da anterior, e todas são copiáveis.

> **Versão dos manifestos:** `apps/v1`, `networking.k8s.io/v1` e `v1` — as APIs estáveis atuais. Funcionam em qualquer cluster reasonably atual, do Minikube ao EKS.

## O mapa mental

Antes dos manifests, cinco palavras que aparecem o tempo todo:

- **Cluster**: o conjunto de máquinas. Um cluster tem um *control plane* (que guarda o estado e decide o que fazer) e um ou mais *nodes* (as máquinas que realmente rodam os containers).
- **Pod**: a menor unidade que o Kubernetes gerencia. Tem um ou mais containers que compartilham o mesmo IP e o mesmo volume.
- **kubelet**: o agente que roda em cada node e fala com o control plane. É ele que executa o que foi pedido.
- **Label**: um par chave=valor colado em um objeto. É só um texto, mas é como o cluster encontra as coisas.
- **Selector**: um filtro por label. É o que amarra um Service aos pods certos.

O conceito que mais trava iniciante é o último par. Um Service **não sabe o nome do seu pod**: ele olha os labels e fala "me manda todo mundo com `app: meu-app`". Sem label no pod, o Service não encontra nada e fica sem backend — sem erro, sem log, só um serviço que não responde. Isso volta mais adiante, e é o erro mais comum de quem está começando.

## Pods e Deployments

Um pod avulso, para você ver a estrutura. Repare que **não tem label** — voltamos nisso em um minuto:


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem-1.jpg" alt="Kubernetes pra iniciantes: conceitos essenciais sem complicação" loading="lazy">
<figcaption>December 2023 Developer Satisfaction Survey (DSS): likert chart showing respondents' satisfaction using Wikimedia's production Kubernetes infrastructure. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A2023-12_DSS_deployment_kubernetes_satisfaction.png">2023-12 DSS deployment kubernetes satisfaction.png</a> por CMyrick-WMF — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: meu-app
spec:
  containers:
    - name: meu-container
      image: node:22
      ports:
        - containerPort: 3000
```

`containerPort: 3000` é só documentação: não abre porta nenhuma. O que importa é que a aplicação precisa **escutar** nessa porta. O Node.js puro não faz nada ao ser executado, então este YAML sobe um container que fica parado — o foco aqui é a estrutura, não o app.

Um Pod sozinho morre com o node. Quem mantém o número de réplicas é o **Deployment**, e ele faz isso através de um **ReplicaSet**: o Deployment gerencia o ReplicaSet, o ReplicaSet cria e recria os pods, o kubelet roda os containers. São três camadas, e vale saber em qual delas você está quando algo dá errado.

A diferença prática: se o processo dentro do pod crashar, o **kubelet** reinicia o container no mesmo pod. Se o **node inteiro** morrer, é o **ReplicaSet** que percebe e cria um pod novo em outro node. "O Kubernetes reinicia o pod" esconde essa distinção, e ela é exatamente o que você vai querer entender quando algo estiver instável.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meu-app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: meu-app
  template:
    metadata:
      labels:
        app: meu-app
    spec:
      containers:
        - name: meu-container
          image: node:22
          ports:
            - containerPort: 3000
```

As três linhas que importam aqui:

- `replicas: 3` — quantos pods manter vivos.
- `selector.matchLabels` — quais pods este Deployment é dono. É o mesmo rótulo que ele coloca no `template`.
- `template.metadata.labels` — **aqui** nasce o label `app: meu-app`.

Esse label é o que amarra tudo. É por ele que o Service encontra os pods na próxima seção.

**Uma ressalva honesta:** três réplicas **não** garantem alta disponibilidade. Não há probes para o cluster saber se o app está saudável, não há `resources.requests`/`limits` para o scheduler decidir onde colocar, e os três pods podem acabar no mesmo node. Chame isso de resiliência básica — que é o que é. O que falta para alta disponibilidade de verdade está em [Próximos passos](#proximos-passos).

## Services

Um Service dá um endereço estável para pods que nascem e morrem. O truque é que ele não aponta para um pod: aponta para um **selector de labels**.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: meu-app-service
spec:
  type: NodePort
  selector:
    app: meu-app
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30001
```

Repare que o selector é `app: meu-app` — o mesmo label que o Deployment coloca nos pods. Por isso o Pod avulso da seção anterior, que não tem label, ficaria de fora.

Sobre `port`, `targetPort` e `nodePort`, que é onde todo mundo trava:

- `port` — a porta em que o **Service** responde.
- `targetPort` — a porta **no pod** para onde ele encaminha. Aqui são iguais; se seu app escuta em 8080, seria `targetPort: 8080`.
- `nodePort` — só existe em `NodePort`: a porta no **node**.

E o ponto que a maioria dos tutoriais pula: **expor para fora é a exceção, não a regra**. Existem três tipos, e o padrão é o primeiro:

| Tipo | Alcance | Quando usar |
|---|---|---|
| `ClusterIP` (padrão) | Só dentro do cluster | comunicação entre serviços, quase sempre |
| `NodePort` | Cada node numa porta alta (30000–32767) | desenvolvimento local, debug |
| `LoadBalancer` | IP público via provedor de nuvem | quando você realmente precisa de IP público |

Usei `NodePort` porque é o que funciona no Minikube sem configurar nada. Em produção, subnetos de Kubernetes costumam usar `LoadBalancer` ou um Ingress — que é a próxima seção.

## Ingress

Ingress é um conjunto de regras de tráfego na camada 7 (HTTP/HTTPS): ele diz qual hostname vai para qual serviço. Ele **não** é um balanceador de carga, e esse é o ponto que costuma gerar decepção.


<figure>
<img src="https://raw.githubusercontent.com/ismaeldouglasdev/blog-content/main/posts/media/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem-2.jpg" alt="Kubernetes pra iniciantes: conceitos essenciais sem complicação" loading="lazy">
<figcaption>December 2023 Developer Satisfaction Survey (DSS): bar chart showing respondents' use of Wikimedia's production Kubernetes infrastructure in the past year. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A2023-12_DSS_deployment_kubernetes_use.png">2023-12 DSS deployment kubernetes use.png</a> por CMyrick-WMF — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

**Um Ingress não funciona sozinho.** Ele só é lido por um componente chamado **Ingress Controller** (nginx, Traefik, cloud provider…). Sem um controller instalado no cluster, seus objetos são aceitos sem erro e simplesmente não fazem nada. No Minikube, você liga um com:

```bash
minikube addons enable ingress
```

Agora o Ingress, com `ingressClassName` explícito (recomendado a partir do Kubernetes 1.18 — sem ele, o cluster pode escolher o controller errado):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: meu-app-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: meu-app.exemplo.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: meu-app-service
                port:
                  number: 3000
```

Repare que o backend aponta para `meu-app-service` e a porta `3000` — o `port` do Service, não o `nodePort`. O Ingress fala com o Service por dentro do cluster; o `NodePort` é só para você alcançar de fora.

## ConfigMaps e Secrets

Configuração que muda não deveria morar dentro da imagem. É para isso que existem ConfigMap (dados comuns) e Secret (dados sensíveis).

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: meu-app-config
data:
  DATABASE_URL: "mongodb://mongo-service:27017/meuapp"
```

Essa URL mudou em relação à versão mais ingênua por um motivo importante: **dentro de um pod, `localhost` é o próprio pod**, não o banco. Se o MongoDB é outro container, você precisa do **nome do Service** dele. `localhost:27017` aqui só funcionaria se o banco estivesse na mesma máquina e o pod tivesse rede para ela — que não é o caso.

ConfigMap não guarda segredo — para isso:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: meu-app-secret
type: Opaque
data:
  PASSWORD: bXlwYXNzd29yZA==
```

`bXlwYXNzd29yZA==` é `mypassword` em base64. E aqui é onde muita gente erra: **base64 é codificação, não criptografia.** Qualquer pessoa com acesso ao Secret lê o valor com um `base64 -d`. Tratar Secret como seguro só porque está "criptografado" no YAML é um erro sério.

O que protege de fato:

- **RBAC** — só o que precisa ler, lê. O Secret é uma permissão, não uma caixa forte.
- **Criptografia em repouso** — o etcd guarda os Secrets em base64 por padrão. Configure a criptografia do etcd ([docs](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)) se você tem segredos de verdade.
- **Sealed Secrets / External Secrets** — guardam o valor cifrado de verdade no Git e só descriptografam no cluster. O Secret gerado nunca aparece em claro.
- **Nunca commite** o YAML de Secret com o valor real. Use `kubectl create secret generic meu-app-secret --from-literal=PASSWORD=...` para gerar local, ou External Secrets para versionar.

Criou os dois, mas eles ainda não fazem nada: precisa injetar no pod. É o passo que quase todo tutorial pula, e sem ele a configuração é decorativa:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meu-app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: meu-app
  template:
    metadata:
      labels:
        app: meu-app
    spec:
      containers:
        - name: meu-container
          image: node:22
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: meu-app-config
            - secretRef:
                name: meu-app-secret
```

`envFrom` com `configMapRef` e `secretRef` injeta todas as chaves como variáveis de ambiente. Se quiser controle por chave, use `env` com `valueFrom.configMapKeyRef` / `secretKeyRef`.

## Scaling

```bash
kubectl scale deployment meu-app-deployment --replicas=5
```

Funciona — e é exatamente por isso que é perigoso. `kubectl scale` é **imperativo**: ele muda o estado real do cluster, mas o seu YAML continua dizendo `replicas: 3`. A partir daí os dois discordam, e qualquer `kubectl apply` do manifesto devolve o cluster para 3. Isso se chama drift, e é a razão de existir o GitOps.

Para o seu servidor, o caminho é o **HPA** (Horizontal Pod Autoscaler), que decide réplicas por métrica e reconcilia sozinho:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: meu-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: meu-app-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Com HPA e `resources.requests` definidos, o HPA tem o que medir. Sem `requests`, não há consumo de CPU conhecido e o autoscaler não tem signal.

## Minikube pra dev

[Minikube](https://minikube.sigs.k8s.io/docs/start/) roda um cluster de um node na sua máquina. As alternativas que valem conhecer: **kind** (Leve, o padrão para testar CI) e **k3d** (rápido, também em Docker). Se você usa Docker Desktop, o cluster dele serve.

```bash
minikube start
minikube addons enable ingress
```

O segundo comando é obrigatório para o Ingress desta postagem funcionar.

### Aplicando e verificando

Daqui em diante, todo manifest é aplicado com `kubectl apply -f`. E o mais importante: **aplicar não é o mesmo que funcionar.** Confira sempre:

```bash
kubectl apply -f meu-app-deployment.yaml
# deployment.apps/meu-app-deployment created

kubectl get pods
# NAME                                  READY   STATUS    RESTARTS   AGE
# meu-app-deployment-7d4b9c6f8b-2xk4p   0/1     Running   0          10s
# meu-app-deployment-7d4b9c6f8b-9mztq   0/1     Running   0          10s
# meu-app-deployment-7d4b9c6f8b-ldp7r   0/1     Running   0          10s

kubectl describe pod meu-app-deployment-7d4b9c6f8b-2xk4p   # eventos: por que o pod não sobe
kubectl logs meu-app-deployment-7d4b9c6f8b-2xk4p         # o que o container está fazendo
```

`0/1 Running` aqui é esperado: o `node:22` puro sobe e fica ocioso. O que importa é que o **pod ficou Running** — o app de verdade você coloca no lugar.

Quando um pod não sobe, a ordem é sempre `describe` (eventos dão a causa quase sempre), depois `logs`.

Acessando de fora, com NodePort, **não assuma `http://<ip-do-node>:30001`**: o driver Docker costuma falhar aqui. Minikube sabe resolver:

```bash
minikube ip                     # IP do node, se você quiser tentar direto
minikube service meu-app-service --url
# http://192.168.49.2:31111      (porta alta, diferente do nodePort que você pediu)
```

E para o Ingress, adicione o hostname ao `/etc/hosts` apontando para o IP do Minikube:

```bash
echo "$(minikube ip) meu-app.exemplo.com" | sudo tee -a /etc/hosts
```

## Limpando

```bash
kubectl delete deployment meu-app-deployment
kubectl delete service meu-app-service
minikube stop
```

## Próximos passos

Você tem o esqueleto. O que falta para produção tem nome próprio, e é por aqui que eu continuaria:

1. **Namespaces** — `kubectl create namespace producao`. Todo recurso hoje vive em `default`, junto de tudo.
2. **`resources.requests` e `limits`** — sem isso o HPA não tem o que medir e um pod pode comer o node inteiro.
3. **Probes** — `readinessProbe` (pode receber tráfego?) e `livenessProbe` (precisa reiniciar?). É o que separa "resiliência básica" de alta disponibilidade de verdade.
4. **Rolling update e rollback** — `kubectl rollout status` e `kubectl rollout undo deployment/meu-app-deployment`. É o que salva deploy às 18h de sexta.
5. **Quotas e limites de namespace** — `ResourceQuota` e `LimitRange`.

Ferramentas que valem o aprendizado depois disso: **Helm** (empacotar os manifests), **Kustomize** (variantes por ambiente sem duplicar YAML) e **Argo CD** (o cluster se reconcilia com o Git, e o drift da seção de scaling desaparece).

## Fontes

- [Conceitos: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Controllers: ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)
- [Controllers: Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Services e os três tipos](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Ingress e Ingress Controller](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) e [Secret](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Encrypting Secret data at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Minikube: start](https://minikube.sigs.k8s.io/docs/start/) e [acesso a services](https://minikube.sigs.k8s.io/docs/commands/services/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
