---
title: "Kubernetes for Beginners: Essential Concepts Made Easy"
date: "2026-09-27"
category: "tutorial"
tags: ["kubernetes", "devops", "containers"]
excerpt: "Kubernetes for Beginners: Key Concepts Made Simple."
cover:
  image: "/covers/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem.jpg"
comments: true
translationKey: "2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem"
---

Everyone runs an application on their own machine and, at the moment they need to put it online, discovers that `systemctl restart` will not cut it. This post is the shortest path I know out of that spot: you will ship an app to the cluster, put a service in front of it, expose it with Ingress, keep configuration outside the image, and scale — understanding what each piece actually does.

The progression is Pod → Deployment → Service → Ingress → ConfigMap/Secret → scaling. Every step only makes sense after the previous one, and all of them are copy-pasteable.

> **Manifest API versions:** `apps/v1`, `networking.k8s.io/v1` and `v1` — the current stable APIs. They work on any reasonably current cluster, from Minikube to EKS.

## The mental model

Before the manifests, five words that show up constantly:

- **Cluster**: the set of machines. A cluster has a *control plane* (which stores state and decides what to do) and one or more *nodes* (the machines that actually run containers).
- **Pod**: the smallest unit the Kubernetes manages. It holds one or more containers sharing the same IP and the same volume.
- **kubelet**: the agent on every node that talks to the control plane. It executes what was asked.
- **Label**: a key=value pair attached to an object. It is just text, but it is how the cluster finds things.
- **Selector**: a filter by label. It is what ties a Service to the right pods.

The concept that trips up beginners most is the last pair. A Service **does not know your pod's name**: it looks at labels and says "send me everything tagged `app: meu-app`". Without the label on the pod, the Service finds nothing and ends up with no backends — no error, no log, just a service that does not answer. That comes back below, and it is the most common mistake for someone starting out.

## Pods and Deployments

A standalone pod, so you can see the shape. Notice it **has no label** — we get back to that in a minute:


<figure>
<img src="/media/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem-1.jpg" alt="Kubernetes for Beginners: Essential Concepts Made Easy" loading="lazy">
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

`containerPort: 3000` is documentation only: it does not open any port. What matters is that your application **listens** on that port. Plain Node.js does nothing when executed, so this YAML brings up a container that just sits there — the focus here is the structure, not the app.

A lone pod dies with the node. What keeps the replica count is the **Deployment**, and it does that through a **ReplicaSet**: the Deployment manages the ReplicaSet, the ReplicaSet creates and recreates the pods, the kubelet runs the containers. Three layers, and it helps to know which one you are in when something breaks.

The practical difference: if the process inside the pod crashes, the **kubelet** restarts the container in the same pod. If the whole **node** dies, the **ReplicaSet** notices and creates a new pod elsewhere. "Kubernetes restarts the pod" hides that distinction, and it is exactly what you will need to understand when things are unstable.

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

The three lines that matter here:

- `replicas: 3` — how many pods to keep alive.
- `selector.matchLabels` — which pods this Deployment owns. Same label it stamps on the `template`.
- `template.metadata.labels` — the label `app: meu-app` is **born** here.

That label is what ties everything together. It is what the Service matches on in the next section.

**One honest caveat:** three replicas **do not** guarantee high availability. There are no probes for the cluster to know whether the app is healthy, no `resources.requests`/`limits` for the scheduler to place pods with, and all three pods could land on the same node. Call it basic resilience — which is what it is. What is missing for real HA is in [Next steps](#next-steps).

## Services

A Service gives a stable address to pods that come and go. The trick is that it does not point at a pod: it points at a **label selector**.

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

Notice the selector is `app: meu-app` — the same label the Deployment puts on the pods. That is why the standalone Pod from the previous section, having no label, would be left out.

On `port`, `targetPort` and `nodePort`, where everyone gets stuck:

- `port` — the port the **Service** answers on.
- `targetPort` — the port **on the pod** it forwards to. They are equal here; if your app listens on 8080, it would be `targetPort: 8080`.
- `nodePort` — only exists for `NodePort`: the port on the **node**.

And the point most tutorials skip: **exposing outward is the exception, not the rule.** There are three types, and the default is the first:

| Type | Reach | When to use |
|---|---|---|
| `ClusterIP` (default) | Inside the cluster only | service-to-service traffic, almost always |
| `NodePort` | Every node on a high port (30000–32767) | local development, debugging |
| `LoadBalancer` | Public IP via the cloud provider | when you genuinely need a public IP |

I used `NodePort` because it works in Minikube with no extra setup. In production, Kubernetes networking usually relies on `LoadBalancer` or an Ingress — which is the next section.

## Ingress

An Ingress is a set of layer 7 (HTTP/HTTPS) traffic rules: it says which hostname goes to which service. It is **not** a load balancer, and that is the point that usually generates disappointment.


<figure>
<img src="/media/2026-09-27-kubernetes-pra-iniciantes-conceitos-essenciais-sem-2.jpg" alt="Kubernetes for Beginners: Essential Concepts Made Easy" loading="lazy">
<figcaption>December 2023 Developer Satisfaction Survey (DSS): bar chart showing respondents' use of Wikimedia's production Kubernetes infrastructure in the past year. — Imagem: <a href="https://commons.wikimedia.org/wiki/File%3A2023-12_DSS_deployment_kubernetes_use.png">2023-12 DSS deployment kubernetes use.png</a> por CMyrick-WMF — <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> · via Wikimedia Commons</figcaption>
</figure>

**An Ingress does not work on its own.** It is only read by a component called an **Ingress Controller** (nginx, Traefik, the cloud provider…). Without a controller installed in the cluster, your objects are accepted without error and simply do nothing. In Minikube, turn one on with:

```bash
minikube addons enable ingress
```

Now the Ingress, with an explicit `ingressClassName` (recommended since Kubernetes 1.18 — without it the cluster may pick the wrong controller):

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

Notice the backend points at `meu-app-service` on port `3000` — the Service's `port`, not the `nodePort`. The Ingress talks to the Service from inside the cluster; the `NodePort` is only for reaching it from outside.

## ConfigMaps and Secrets

Configuration that changes should not live inside the image. That is what ConfigMaps (ordinary data) and Secrets (sensitive data) are for.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: meu-app-config
data:
  DATABASE_URL: "mongodb://mongo-service:27017/meuapp"
```

That URL differs from the more naive version for one important reason: **inside a pod, `localhost` is the pod itself**, not the database. If MongoDB is another container, you need its **Service name**. `localhost:27017` would only work if the database were on the same machine and the pod had a route to it — which it does not.

A ConfigMap does not hold secrets — for that:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: meu-app-secret
type: Opaque
data:
  PASSWORD: bXlwYXNzd29yZA==
```

`bXlwYXNzd29yZA==` is `mypassword` in base64. And this is where many people get it wrong: **base64 is encoding, not encryption.** Anyone with access to the Secret reads the value with a `base64 -d`. Treating a Secret as safe because it is "encrypted" in YAML is a serious mistake.

What actually protects it:

- **RBAC** — only what needs to read, reads. A Secret is a permission, not a vault.
- **Encryption at rest** — etcd stores Secrets base64-encoded by default. Configure etcd encryption ([docs](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)) if you have real secrets.
- **Sealed Secrets / External Secrets** — keep the value genuinely encrypted in Git and decrypt it only inside the cluster. The generated Secret never appears in the clear.
- **Never commit** the Secret YAML with the real value. Use `kubectl create secret generic meu-app-secret --from-literal=PASSWORD=...` to generate it locally, or External Secrets to version it.

You created both, and they still do nothing: you need to inject them into the pod. This is the step almost every tutorial skips, and without it the configuration is decorative:

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

`envFrom` with `configMapRef` and `secretRef` injects all keys as environment variables. For per-key control, use `env` with `valueFrom.configMapKeyRef` / `secretKeyRef`.

## Scaling

```bash
kubectl scale deployment meu-app-deployment --replicas=5
```

It works — and that is exactly why it is dangerous. `kubectl scale` is **imperative**: it changes the cluster's real state, but your YAML still says `replicas: 3`. From then on the two disagree, and any `kubectl apply` of the manifest snaps the cluster back to 3. That is called drift, and it is why GitOps exists.

For your own server, the path is the **HPA** (Horizontal Pod Autoscaler), which picks replicas from a metric and reconciles on its own:

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

With an HPA and `resources.requests` set, the HPA has something to measure. Without `requests` there is no known CPU consumption and the autoscaler has no signal.

## Minikube for dev

[Minikube](https://minikube.sigs.k8s.io/docs/start/) runs a single-node cluster on your machine. Alternatives worth knowing: **kind** (lightweight, the default for CI) and **k3d** (fast, also Docker-based). If you use Docker Desktop, its built-in cluster works too.

```bash
minikube start
minikube addons enable ingress
```

The second command is required for this post's Ingress to work.

### Applying and verifying

From here on, every manifest is applied with `kubectl apply -f`. And the most important part: **applying is not the same as working.** Always check:

```bash
kubectl apply -f meu-app-deployment.yaml
# deployment.apps/meu-app-deployment created

kubectl get pods
# NAME                                  READY   STATUS    RESTARTS   AGE
# meu-app-deployment-7d4b9c6f8b-2xk4p   0/1     Running   0          10s
# meu-app-deployment-7d4b9c6f8b-9mztq   0/1     Running   0          10s
# meu-app-deployment-7d4b9c6f8b-ldp7r   0/1     Running   0          10s

kubectl describe pod meu-app-deployment-7d4b9c6f8b-2xk4p   # events: why the pod isn't coming up
kubectl logs meu-app-deployment-7d4b9c6f8b-2xk4p         # what the container is doing
```

`0/1 Running` is expected here: plain `node:22` comes up and sits idle. What matters is that the pod went **Running** — you put the real app in its place.

When a pod will not start, the order is always `describe` (events give you the cause most of the time), then `logs`.

To reach it from outside with NodePort, **do not assume `http://<node-ip>:30001`**: the Docker driver usually fails here. Minikube can figure it out:

```bash
minikube ip                     # node IP, if you want to try directly
minikube service meu-app-service --url
# http://192.168.49.2:31111      (a high port, different from the nodePort you asked for)
```

And for the Ingress, add the hostname to `/etc/hosts` pointing at the Minikube IP:

```bash
echo "$(minikube ip) meu-app.exemplo.com" | sudo tee -a /etc/hosts
```

## Cleaning up

```bash
kubectl delete deployment meu-app-deployment
kubectl delete service meu-app-service
minikube stop
```

## Next steps

You have the skeleton. What is missing for production has a name, and this is where I would continue:

1. **Namespaces** — `kubectl create namespace production`. Every resource right now lives in `default`, alongside everything else.
2. **`resources.requests` and `limits`** — without them the HPA has nothing to measure and a single pod can eat the whole node.
3. **Probes** — `readinessProbe` (can it take traffic?) and `livenessProbe` (does it need restarting?). This is what separates "basic resilience" from real high availability.
4. **Rolling update and rollback** — `kubectl rollout status` and `kubectl rollout undo deployment/meu-app-deployment`. It is what saves a deploy at 6pm on a Friday.
5. **Quotas and namespace limits** — `ResourceQuota` and `LimitRange`.

Tools worth learning after that: **Helm** (packaging the manifests), **Kustomize** (per-environment variants without duplicating YAML) and **Argo CD** (the cluster reconciles from Git, and the drift from the scaling section disappears).

## Sources

- [Concepts: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Controllers: ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)
- [Controllers: Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Services and the three types](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Ingress and Ingress Controllers](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) and [Secret](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Encrypting Secret data at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Minikube: start](https://minikube.sigs.k8s.io/docs/start/) and [accessing services](https://minikube.sigs.k8s.io/docs/commands/services/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
