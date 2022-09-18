---
title: '[쿠버네티스 완벽 가이드] 14. 서비스 API 카테고리 (3) - 헤드리스, ExternalName, None-Selector, 인그레스'
date: 2022-09-18 18:00:00
category: 'kubernetes'
draft: false
---


# 6.8 헤드리스 서비스(None)


헤드리스(Headless) 서비스는 대상이 되는 개별 파드의 IP주소가 직접 반환되는 서비스이다. 지금까지 소개한 다른 서비스에서 부하 분산을 위해 제고오디는 엔드포인트는 가상 IP로 로드 밸런싱 동작을 하기 위해 여러 파드로 전송되는 IP 엔드포인트였다면, 헤드리스 서비스는 로드 밸런싱을 하기 위한 IP 주소는 제공되지 않고 DNS 라운드 로빈을 사용한 엔드포인트를 제공한다. 헤드리스 서비스의 DNS 라운드 로빈에서는 목적지 파드 IP 주소가 클러스터 내부 DNS에서 반환되는 형태로 부하 분산을 하기 때문에 클라이언트 DNS 캐시에 주의해야 한다. 또한, 스테이트풀셋이 헤드리스 서비스를 사용하는 경우에만 파드명으로 IP 주소를 디스커버리할 수 있다. 즉, sample-statefulset-0 등의 파드명으로 IP 주소를 가져올 수 있다.


|서비스 종류|IP 엔드포인트 내용|
|---|---|
|ClusterIP|쿠버네티스 클러스터 내부에서만 통신이 가능한 가상 IP|
|ExternalIP|특정 쿠버네티스 노드의 IP|
|NodePort|모든 쿠버네티스 노드의 모든 IP 주소 (0.0.0.0)|
|ClusterIP|클러스터 외부에서 제공되는 로드 밸런서의 가상 IP|


## 6.8.1 헤드리스 서비스 생성


헤드리스 서비스를 생성하려면 다음 두 가지 조건을 만족해야 한다. 또, 스테이트풀셋과 조합하여 사용하는 경우 특정 조건에서 파드명으로 이름을 해석할 수 있다.


- 서비스의 `spec.type`이 `ClusterIP`일 것
- 서비스의 `spec.clusterIP`가 `None`일 것
- [옵션] 서비스의 `metadata.name`이 스테이트풀셋의 `spec.serviceName`과 같을 것


```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: sample-headless
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 80
      targetPort: 80
  selector:
    app: sample-app
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sample-statefulset-headless
spec:
  serviceName: sample-headless
  replicas: 3
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
        - name: nginx-container
          image: amsy810/echo-nginx:v2.0
---
```


## 6.8.2 헤드리스 서비스로 파드명 이름 해석


서비스 이름 해석은 '서비스명.네임스페이스명.svc.clutser.local`으로 질의한다. 헤드리스 서비스의 경우에느 FQDN에 대해 정방향으로 질의하면 ClusterIP 대신 DNS 라운드 로빈에서 여러 파드의 IP 주소가 반환되기 때문에 부하 분산 때는 클라이언트 캐시 등을 생각해야 한다. 레플리카셋 등의 리소스에도 다음과 같이 DNS 라운드 로빈에서 IP 주소가 반환되도록 할 수 있다.


```sh
# 파드 IP 주소 확인
$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS      AGE     IP           NODE                   NOMINATED NODE   READINESS GATES
sample-statefulset-headless-0        1/1     Running   0             2m30s   10.244.1.3   kind-clusetr-worker3   <none>           <none>
sample-statefulset-headless-1        1/1     Running   0             2m29s   10.244.3.4   kind-clusetr-worker2   <none>           <none>
sample-statefulset-headless-2        1/1     Running   0             2m28s   10.244.2.4   kind-clusetr-worker    <none>           <none>

# 스테이트풀셋의 서비스 디스커버리에서는 DNS 라운드 로빈으로 IP 주소를 반환
$ kubectl exec -it sample-pod -- dig sample-headless.default.svc.cluster.local
...
;; QUESTION SECTION:
;sample-headless.default.svc.cluster.local. IN A

;; ANSWER SECTION:
sample-headless.default.svc.cluster.local. 30 IN A 10.244.2.4
sample-headless.default.svc.cluster.local. 30 IN A 10.244.2.3
sample-headless.default.svc.cluster.local. 30 IN A 10.244.1.2
sample-headless.default.svc.cluster.local. 30 IN A 10.244.3.3
sample-headless.default.svc.cluster.local. 30 IN A 10.244.1.3
sample-headless.default.svc.cluster.local. 30 IN A 10.244.3.4

# 파드명으로 서비스 디스커버리
$ kubectl exec -it sample-pod -- dig sample-statefulset-headless-0.sample-headless.default.svc.cluster.local
...
;; QUESTION SECTION:
;sample-statefulset-headless-0.sample-headless.default.svc.cluster.local. IN A

;; ANSWER SECTION:
sample-statefulset-headless-0.sample-headless.default.svc.cluster.local. 10 IN A 10.244.1.3

# 컨테이너 내부 resolv.conf 확인
$ kubectl exec -it sample-pod -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```


일반적으로는 클러스터 내부 DNS에서 파드명으로는 해석할 수 없다. 서비스를 생성할 때 ClusterIP 등과 같은 여러 파드에 대해 엔드포이트가 할당되어 그 엔드포인트의 이름 해석은 불가능하다. 스테이트풀셋이 헤드리스 서비스를 사용하고 서비스의 `metadata.name`이 스테이트풀셋의 `spec.serviceName`이 같은 경우 추가로 `파드명.서비스명.네임스페이스명.svc.cluster.local`를 해석할 수 있다. 또한, 컨테이너 내부의 resolv.conf 등에는 search 지시자로 다음과 같은 엔트리가 들어 있어 `파드명.서비스명`이나 `파드명.서비스명.네임스페이스명` 등으로 질의할 수 있다.


## 6.8.3 스테이트풀셋 외의 파드명으로 이름 해석


스테이트풀셋을 사용하지 않고 해석이 가능하도록 하려면 파드에 설정을 추가해야 한다. 파드에 `spec.hostname`과 해드레스 서비스명과 동일한 `spec.domain` 설정을 추가한다. 이때 `spec.hostname`은 파드명이 아니여도 된다. 이 설정을 추가하면 다음과 같이 파드 단위로 이름 해석이 가능하다.</br>
`Hostname명.Subdomain/서비스명.네임스페이스명.svc.cluster.local`</br>
디플로이먼트 등에서 이 설정을 할 경우, 매니페스트 구조상 여러 레프릴카에서는 같은 hostname만 설정할 수 있다. 또한, 같은 hostname이 지정된 경우 하나의 A 레코드만 반환되기 때문에 디플로이먼트 등에서는 개별 파드명으로 해석이 불가능하다.

```yaml
---
apiVersion: v1
kind: Pod
metadata:
  name: sample-subdomain
  labels:
    app: sample-app
spec:
  hostname: sample-hostname
  subdomain: sample-subdomain
  containers:
  - name: nginx-container
    image: amsy810/tools:v2.0
---
apiVersion: v1
kind: Service
metadata:
  name: sample-subdomain
spec:
  type: ClusterIP
  clusterIP: None
  ports: []
  selector:
    app: sample-app
```


```sh
# 파드 IP 주소 확인
$ kubectl get pod sample-subdomain -o wide
NAME               READY   STATUS    RESTARTS   AGE   IP           NODE                   NOMINATED NODE   READINESS GATES
sample-subdomain   1/1     Running   0          10s   10.244.1.5   kind-clusetr-worker3   <none>           <none>

# 파드명으로 서비스 디스커버리
$ kubectl exec -it sample-pod -- dig sample-hostname.sample-subdomain.default.svc.cluster.local
...
;; QUESTION SECTION:
;sample-hostname.sample-subdomain.default.svc.cluster.local. IN A

;; ANSWER SECTION:
sample-hostname.sample-subdomain.default.svc.cluster.local. 30 IN A 10.244.1.5
```


# 6.9 ExternalName 서비스


ExternalName 서비스는 일반적인 서비스의 리소스와 달리 서비스명의 이름 해석에 있어 외부 도메인으로 CNAME을 반환한다. 사용 용도를 살펴보면, 다른 이름을 설정하고 싶은 경우, 클러스터 내부에서의 엔드포인트를 쉽게 변경하고 싶을 때 사용한다.


## 6.9.1 ExternalName 서비스 생성


```yaml
kind: Service
apiVersion: v1
metadata:
  name: sample-externalname
  namespace: default
spec:
  type: ExternalName
  externalName: external.example.com
```


```sh
# 서비스 목록 표시
$ kubectl get service sample-externalname
NAME                  TYPE           CLUSTER-IP   EXTERNAL-IP            PORT(S)   AGE
sample-externalname   ExternalName   <none>       external.example.com   <none>    14s

# 일시적으로 파드를 기동하여 ExternalName의 CNAME 이름 해석을 확인
$ kubectl exec -it sample-pod -- dig sample-externalname.default.svc.cluster.local CNAME
...
;; QUESTION SECTION:
;sample-externalname.default.svc.cluster.local. IN CNAME

;; ANSWER SECTION:
sample-externalname.default.svc.cluster.local. 30 IN CNAME external.example.com.
```


클러스터 내부에서는 파드와 통신에 서비스 이름 해석을 사용하여 느슨한 결합을 유지하고 있다. 그리고 SaaS나 IaaS 등 외부에 있는 서비스를 사용할 때도 가틍하면 느슨한 결합으로 구성해야 한다.</br>
예를 들어, 애플리케이션 외부의 엔드포인트를 설정에 등록해 두면 외부 애플리케이션 측의 엔드포인트 주소가 변경되면 설정도 변경해줘야 한다. 하지만, ExternalName을 사용했을 경우 목적지가 변경되어도 ExternalName 서비스만 변경하는 것만으로도 대응이 가능하다. 이를 통해 외부 서비스와 느슨한 결합을 유지할 수 있다. </br>


또한, ExternalName 서비스를 사용하면 외부 서비스와 쿠버네티스에 배포된 클러스터 내부 서비스와의 전환도 유연하게 할 수 있게 된다. 외부 애플리케이션 측은 서비스의 FQDN을 지정해 두고 이름 해석이 되면 ExternalName의 CNAME 레코드 또는 ClusterIP의 A 레코드가 반환되는 형태가 되어 애플리케이션 측은 변경 없이 내부 서비스와 외부 서비스를 전화할 수 있다. 한 가지 주의할 점은 ClusterIP 서비스에서 ExternalName 서비스로 전환할 경우 `spec.clusterIP`를 명시적으로 공란으로 만들어 두어야 한다는 것이다.


# 6.10 None-Selector 서비스


ExternalName 서비스에서는 서비스명으로 이름 해석을 하면 외부 도메인에 전송되었다. None-Selector 서비스는 서비스명으로 이름 해석을 하면 자신이 설정한 멤버에 대해 로드 밸런싱을 한다. 즉, 쿠버네티스 내에 원하는 목적지로 지금까지 설명했던 형태의 로드 밸런서를 생성할 수 있는 기능이다. 클라이언트 사이드 로드 밸런싱용 엔드포인트를 제공하는 서비스라고도 할 수 있다. 기본적으로 ClusterIP를 사용하여 클러스터 내부 로드 밸런서를 사용하는 경우가 많기 때문에 이 책에서는 ClusterIP를 전제로 하여 설명한다. `type: LoadBalancer`를 지정하는 것도 가능하지만, 쿠버네티스 클러스터의 외부 로드 밸런서에서 수신한 트래픽이 쿠버네티스 클러스터로 전송된 후에 다시 쿠버네티스 클러스터 외부로 전송하는 형태가 되기 때문에 유용하지 못하다. 이는 `type: NodePort`도 마찬가지이다.</br>
`externalName`을 지정하지 않고 셀렉터가 존재하지 않는 서비스를 생성한 후 엔드포인트 리소스를 수동으로 만들면 유연한 서비스를 만들 수 있다.


## 6.10.1 None-Selector 서비스 생성


매니페스트로 생성한 서비스에는 다음과 같이 엔드포인트에 로드 밸런싱 대상 멤버가 등록되어 있다. 멤버를 등록하고 삭제할 경우에는 엔드포인트 리소스만 수정하면 된다.


```yaml
---
kind: Service
apiVersion: v1
metadata:
  name: sample-none-selector
spec:
  type: ClusterIP
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 80
---
kind: Endpoints
apiVersion: v1
metadata:
  name: sample-none-selector
subsets:
  - addresses:
    - ip: 192.168.1.1
    - ip: 192.168.1.2
    ports:
      - protocol: TCP
        port: 80
```


```sh
# 생성한 서비스 확인
$ kubectl describe svc sample-none-selector
Name:              sample-none-selector
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          <none>
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.96.23.49
IPs:               10.96.23.49
Port:              <unset>  8080/TCP
TargetPort:        80/TCP
Endpoints:         192.168.1.1:80,192.168.1.2:80
Session Affinity:  None
Events:            <none>
```


# 6.11 인그레스


지금까지 설명했던 ClusterIP, NodePort, ExternalName, None-Selector, Headless Service, LoadBalancer 등은 L4 로드 밸런싱을 제공하는 리소스였다면, 인그레스는 L7 로드 밸런싱을 제공하는 리소스이다. 인그레스는 서비스들을 묶는 서비스들의 상위 객체로, 서비스 종류의 하나로서가 아닌 독립된 리소스로 구성되어 있다. 인그레스를 사용할 때는 `kind: Service` 타입이 아닌, `kind: Ingress` 타입 리소스를 지정한다. 쿠버네티스 Network Policy 리소스에 Ingress/Egress라는 설정 항목이 있지만, 이 인그레스와는 관계가 없다.


## 6.11.1 리소스와 컨트롤러


쿠버네티스는 분산 시스템이며, 매니페스트로 정의한 리소스를 쿠버네티스에 등록하는 것으로 시작된다. 등록만으로는 아무런 처리가 이뤄지지 않으며, 실제 처리를 하는 컨트롤러라는 시스템 구성 요소가 필요하다. 즉, 인그레스가 실제로 가리키는 것은 다양한 개념의 집합이다.</br>
인그레스 리소스란 매니페스트에 등록된 API 리소스르르 의미하고, 인그레스 컨트롤러는 인그레스 리소스가 쿠버네티스에 등록되었을 때 어떤 처리를 한다. GCP에서는 GCLB를 조작하여 L7 로드 밸런서를 설정하거나 Nginx 설정을 변경하여 리로드 하는 등의 처리를 말한다.


## 6.11.2 인그레스의 종류


인그레스의 구현 방법에는 여러 가지가 있고 편의성도 다르지만, 여기서는 실제로 많이 사용되는 GKE 인그레스 컨트롤러와 Nginx 인그레스 컨트롤러를 소개한다. 이 두가지 컨트롤러는 인그레스 리소스를 생성했을 때 처리를 담당하는 리소스이다. 어떤 L7 로드밸런서를 생성할지는 이 인그레스 컨트롤러에 따라 달라진다.


또한, 인그레스는 다음과 같이 크게 두 가지로 분류된다.


- 클러스터 외부 로드 밸런서를 사용한 인그레스: GKE 인그레스
- 클러스터 내부 인그레스용 파드를 배포하는 인그레스: Nginx 인그레스


### 클러스터 외부 로드 밸런서를 사용한 인그레스


GKE처럼 외부 로드 밸런서를 사용한 인그레스의 경우 인그레스 리소스 생성만으로 로드 밸런서의 가상 IP가 할당되어 사용할 수 있다. 따라서 인그레스의 트래픽은 GCP의 GCLB가 트래픽을 수신한 후 GCLB에서 SSL 터미네이션이나 경로 기반 라우팅을 통해 NodePort에 트래픽을 전송함으로써 대상 파드까지 도달한다.


1. 클라이언트
2. -> L7 로드밸런서(NodePort 사용)
3. -> 목적지 파드


### 클러스터 내부에 인그레스용 파드를 배포하는 인그레스


이 패턴은 인그레스 리소스에서 정의한 L7 수준의 로드 밸런싱 처리를 위해 인그레스용 파드를 클러스터 내부에 생성해야 한다. 또 생성한 인그레스용 파드에 대해 클러스터 외부에서 접속할 수 있도록 별도의 인그레스용 파드에 LoadBalancer 서비스를 생성하는 등의 준비가 필요하다. 그리고 인그레스용 파드가 SSL 터미테이션 경로 기반 라우팅 등과 같은 L7 수준의 처리를 하기 위해 부하에 따른 레플리카 수의 오토 스케일링도 고려해야 한다.</br>
인그레스용 파드에 Nginx를 사용한 Nginx 인그레스의 경우 로드 밸런서가 Nginx 파드까지 전송하고, 그 다음에는 Nginx가 L7 수준의 처리를 수행할 파드에 전송한다. 이때 Nginx 파드에서 대상 파드까지는 NodePort를 통과하지 않고 직접 파드 IP 주소로 전송된다. 그 순서를 간략히 하면 다음과 같다.


1. 클라이언트
2. -> L4 로드밸런서(LoadBalancer 사용)
3. -> Nginx 파드(Nginx 인그레스 컨트롤러)
4. -> 목적지 파드


## 6.11.3 인그레스 컨트롤러 배포


### GKE 인그레스 컨트롤러 배포


GKE의 경우 클러스터 생성 시 HttpLoadBalancing 애드온을 활성화하면 배포된다. 또 이 애드온은 기본값으로 활성화되어 있기 때문에 4장에서 설명한 순서대로 클러스터를 구축했다면 이미 인그레스를 사용할 수 있다.


### Nginx 인그레스 컨트롤러 배포


Nginx 인그레스를 사용하는 경우에는 Nginx 인그레스 컨트롤러를 배포해야 한다. Nginx 인그레스에는 인그레스 컨트롤러 자체가 L7 수준의 처리를 하는 파드이기도 하므로, 이름은 컨트롤러이지만 실제 처리도 한다.</br>
클러스터 외부로부터의 통신을 확보하기 위해 Nginx 인그레스 컨트롤러의 파드에 로드 밸런서 서비스(NodePort)를 생성해야 한다. 인그레스 컨트롤러를 한 번 배포하기 위한 매니페스트는 깃허브에 공개되어 있으므로 쉽게 도입할 수 있다.


```sh
# Nginx 인그레스 컨트롤러 설치(ingress-nginx 네임스페이스에 설치됨)
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/cloud/deploy.yaml
namespace/ingress-nginx created
serviceaccount/ingress-nginx created
configmap/ingress-nginx-controller created
clusterrole.rbac.authorization.k8s.io/ingress-nginx created
clusterrolebinding.rbac.authorization.k8s.io/ingress-nginx created
role.rbac.authorization.k8s.io/ingress-nginx created
rolebinding.rbac.authorization.k8s.io/ingress-nginx created
service/ingress-nginx-controller-admission created
service/ingress-nginx-controller created
deployment.apps/ingress-nginx-controller created
validatingwebhookconfiguration.admissionregistration.k8s.io/ingress-nginx-admission created
serviceaccount/ingress-nginx-admission created
clusterrole.rbac.authorization.k8s.io/ingress-nginx-admission created
clusterrolebinding.rbac.authorization.k8s.io/ingress-nginx-admission created
role.rbac.authorization.k8s.io/ingress-nginx-admission created
rolebinding.rbac.authorization.k8s.io/ingress-nginx-admission created
job.batch/ingress-nginx-admission-create created
job.batch/ingress-nginx-admission-patch created
```


## 6.11.4 인그레스 리소스 생성


인그레스 리소스를 생성하려면 사전 준비가 필요하다. 인그레스는 먼저 생성된 서비스를 백엔드로 전송하는 구조로 되어 있어 아래 매니페스트에 있는 서비스를 생성해야 한다. 백엔드에서 사용하는 서비스는 `type: NodePort`를 지정한다.


```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: sample-ingress-svc-1
spec:
  type: NodePort
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 8888
      targetPort: 80
  selector:
    ingress-app: sample1
---
apiVersion: v1
kind: Pod
metadata:
  name: sample-ingress-apps-1
  labels:
    ingress-app: sample1
spec:
  containers:
    - name: nginx-container
      image: amsy810/echo-nginx:v2.0
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: sample-ingress-svc-2
spec:
  type: NodePort
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 8888
      targetPort: 80
  selector:
    ingress-app: sample2
---
apiVersion: v1
kind: Pod
metadata:
  name: sample-ingress-apps-2
  labels:
    ingress-app: sample2
spec:
  containers:
    - name: nginx-container
      image: amsy810/echo-nginx:v2.0
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: sample-ingress-default
spec:
  type: NodePort
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 8888
      targetPort: 80
  selector:
    ingress-app: default
---
apiVersion: v1
kind: Pod
metadata:
  name: sample-ingress-default
  labels:
    ingress-app: default
spec:
  containers:
    - name: nginx-container
      image: amsy810/echo-nginx:v2.0
      ports:
        - containerPort: 80
```


위 매니페스트는 각 서비스와 파드가 1:1로 매핑되어 있다. 인그레스에서는 HTTPS를 사용하는 경우 사전에 인증서를 시크릿 리소스로 생성해야 한다. 시크릿은 인증서 정보로 매니페스트를 작성하고 등록하거나 인증서 파일을 지정하여 kubectl create secret 명령어로 생성한다. 여기에서는 서명된 인증서를 생성하여 테스트한다.


```sh
# 자체 생성된 인증서 생성
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout ./tls.key -out ./tls.crt -subj "/CN=sample.example.com"
Generating a 2048 bit RSA private key
.............................................................+++
.......................................................+++
writing new private key to './tls.key'
-----

# 시크릿 생성(인증서 파일을 지정한 경우)
$ kubectl create secret tls --save-config tls-sample --key ./tls.key --cert ./tls.crt
secret/tls-sample created
```


위의 사전 준비를 마쳤다면, 이제는 실제 인그레스 리소스를 생성할 차례이다. 사전 준비에서는 인그레스에서 사용할 서비스 백엔드를 생성했다. 인그레스 리소스는 L7 로드 밸런서이기 때문에 특정 호스트명에 대해 '요청 경로 > 서비스 백엔드' 형태의 쌍으로 전송 규칙을 설정한다. 또한, 하나의 IP 주소에서 여러 호스트명을 처리할 수 있다. `spec.rules[].http.paths[].backend.servicePort`에 설정할 포트 번호는 `spec.ports[].port`를 지정한다. 인그레스 리소스 매니페스트에 정의 가능한 설정은 '클러스터 외부 로드 밸런서를 사용한 인그레스'와 '클러스터 내부에 인그레스용 파드를 배포하는 인그레스'라는 두 가지 방식 중 어떤 방법을 사용하든 거의 비슷하다.


### GKE용 인그레스 리소스 생성


```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-ingress
spec:
  defaultBackend:
    service:
      name: sample-ingress-default
      port:
        number: 8888
  rules:
  - host: sample.example.com
    http:
      paths:
      - pathType: Prefix
        path: /path1
        backend:
          service:
            name: sample-ingress-svc-1
            port:
              number: 8888
  - host: sample.example.com
    http:
      paths:
      - pathType: Prefix
        path: /path2
        backend:
          service:
            name: sample-ingress-svc-2
            port:
              number: 8888
  tls:
  - hosts:
    - sample.example.com
    secretName: tls-sample

```


위의 매니페스트에는 각 경로를 앞에서 생성한 서비스에 전송하게 되어 있다. 또 `spec.backend` 설정에 따라 경로에 일치하지 않을 경우 기본적으로 sample-ingress-default 서비스에 전송한다. 위 매니페스트의 경우 쿠버네티스 1.22 버전 이후에 apiVersion이 networking.k8s.io/v1beta1 -> networking.k8s.io/v1 으로 변경되었기 때문에 backend 하위의 serviceName, servicePort, rules 하위의 backend가 각각 name, port, defaultBackend로 변경되었다.


1. /path1/*
2. -> sample-ingress-svc-1 서비스
3. -> sample-ingress-apps-1 파드
</br>

1. /path2/*
2. -> sample-ingress-svc-2 서비스
3. -> sample-ingress-apps-2 파드
</br>

1. *
2. -> sample-ingress-default 서비스
3. -> sample-ingress-default 파드


GKE의 경우 특별히 의식하지 않아도 인그레스 리소스마다 자동으로 로드 밸런서의 가상 IP가 할당된다. 따라서 sample-ingress.yaml 매니페스트를 적용하면 다음과 같이 인그레스 리소스가 생성되는 것을 확인할 수 있다. 여러 인그레스 리소스를 생성하면 인그레스 리소스마다 IP주소가 할당된다.


```sh
# 리소스별 API 버전 확인
$ kubectl api-resources | grep ingress
ingressclasses                                 networking.k8s.io/v1                   false        IngressClass
ingresses                         ing          networking.k8s.io/v1                   true         Ingress

# 인그레스 리소스 확인
$ kubectl apply -f  sample-ingress.yaml
ingress.networking.k8s.io/sample-ingress created

$ kubectl get ingresses
NAME             CLASS    HOSTS                                   ADDRESS         PORTS     AGE
sample-ingress   <none>   sample.example.com,sample.example.com   xx.xx.xx.xx   80, 443   3m36s

# L7 로드밸런서의 가상 IP를 환경 변수에 저장
$ INGRESS_IP=`kubectl get ingress sample-ingress \
-o jsonpath='{.status.loadBalancer.ingress[0].ip}'`

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-svc-1)
$ curl -ivk http://${INGRESS_IP}/path1/ -H "Host: sample.example.com"
...
Host=sample.example.com  Path=/path1/  From=sample-ingress-default  ClientIP=10.178.0.6  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-svc-2)
$ curl -ivk http://${INGRESS_IP}/path2/ -H "Host: sample.example.com"
...
Host=sample.example.com  Path=/path2/  From=sample-ingress-apps-2  ClientIP=10.178.0.3  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-default)
$ curl -ivk http://${INGRESS_IP}/ -H "Host: sample.example.com"
Host=sample.example.com  Path=/  From=sample-ingress-default  ClientIP=10.178.0.5  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTPS 요청
$ curl -ivk http://${INGRESS_IP}/path1/ -H "Host: sample.example.com" --insecure
Host=sample.example.com  Path=/path1/  From=sample-ingress-default  ClientIP=10.178.0.3  XFF=xx.xx.xx.xx, xx.xx.xx.xx
```


### Nginx 인그레스용 인그레스 리소스 생성


```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-ingress-by-nginx
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  defaultBackend:
    service:
      name: sample-ingress-default
      port:
        number: 8888
  rules:
  - host: sample.example.com
    http:
      paths:
      - pathType: Prefix
        path: /path1
        backend:
          service:
            name: sample-ingress-svc-1
            port:
              number: 8888
  - host: sample.example.com
    http:
      paths:
      - pathType: Prefix
        path: /path2
        backend:
          service:
            name: sample-ingress-svc-2
            port:
              number: 8888
```


Nginx 인그레스도 인그레스 리소스 설정은 기본적으로 GKE와 같다. GKE 환경에서 Nginx 인그레스를 사용하는 경우에는 GKE 인그레스가 아닌 Nginx 인그레스를 사용하도록 `kubernetes.io/ingress.class: nginx`의 어노테이션을 지정해야 한다. 또한, Nginx 인그레스가 GKE 인그레스용으로 생성한 인그레스 리소스 sample-ingress를 보고 있어서 동시에 동작하는 경우에는 sample-ingress에도 `kubernetes.io/ingress.class: gce`의 어노테이션을 지정해야 한다. 추가로, Nginx 인그레스는 기본값으로 HTTP로부터의 요청을 HTTPS로 리다이렉트하도록 설정되어 있기 때문에 이번에는 비활성화 한다.</br>
Nginx 인그레스의 경우 인그레스 컨트롤러 디플로이먼트에 대한 LoadBalancer 서비스 IP 주소가 인그레스에도 등록되도록 되어 있다. 그래서 sample-ingress-by-nginx.yaml 매니페스트를 적용하면 다음과 같이 인그레스 리소스가 생성된 것을 확인할 수 있다. 여러 인그레스 리소스를 생성해도 같은 IP 주소를 사용한다.


```sh
# 인그레스 리소스 목록 확인
$ kubectl get ingresses
NAME                      CLASS    HOSTS                                   ADDRESS         PORTS     AGE
sample-ingress-by-nginx   <none>   sample.example.com,sample.example.com   xx.xx.xx.xx     80        55s

# 서비스에서 해당 IP 주소를 확인해야 함
$ kubectl get services -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.52.2.120   xx.xx.xx.xx     80:32139/TCP,443:32223/TCP   61s
ingress-nginx-controller-admission   ClusterIP      10.52.11.86   <none>          443/TCP                      61s

# L7 로드밸런서의 가상 IP를 환경 변수에 저장
$ INGRESS_IP=`kubectl get ingress sample-ingress-by-nginx \
-o jsonpath='{.status.loadBalancer.ingress[0].ip}'`

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-svc-1)
$ curl -ivk http://${INGRESS_IP}/path1/ -H "Host: sample.example.com"
...
Host=sample.example.com  Path=/path1/  From=sample-ingress-default  ClientIP=10.178.0.6  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-svc-2)
$ curl -ivk http://${INGRESS_IP}/path2/ -H "Host: sample.example.com"
...
Host=sample.example.com  Path=/path2/  From=sample-ingress-apps-2  ClientIP=10.178.0.3  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTP 요청(/path1/* > sample-ingress-default)
$ curl -ivk http://${INGRESS_IP}/ -H "Host: sample.example.com"
Host=sample.example.com  Path=/  From=sample-ingress-default  ClientIP=10.178.0.5  XFF=xx.xx.xx.xx, xx.xx.xx.xx

# 인그레스 리소스 경유의 HTTPS 요청
$ curl -ivk http://${INGRESS_IP}/path1/ -H "Host: sample.example.com" --insecure
Host=sample.example.com  Path=/path1/  From=sample-ingress-default  ClientIP=10.178.0.3  XFF=xx.xx.xx.xx, xx.xx.xx.xx
```


## 6.11.5 X-Forwarded-For 헤더에 의한 클라이언트 IP 주소 참조


인그레스 경유로 들어오는 트래픽에는 기본적으로 X-Forwarded-For(XFF) 헤더가 지정되어 있으므로 클라이언트 IP 주소 (발신 측 IP 주소)를 참조할 수 있게 되어 있다. 환경이나 사용하는 구현에 따라 지정되지 않거나 NAT되어 정확한 값을 참조할 수 없는 경우도 있다.


## 6.11.6 인그레스 클래스에 의한 인그레스 분리


배포한 인그레스 컨트롤러는 클러스터에 등록된 모든 인그레스 리소스를 볼 수 있어 충돌이 발생할 가능성이 있다. 이런 경우 인그레스 클래스를 사용하여 처리하는 대상의 인그레스 리소스를 분리할 수 있다. 예를 들어 서비스 A와 서비스 B가 각각 존재하고 GKE 인그레스 컨트롤러에서 인그레스 리소스를 두 개 생성한 경우, 두 개의 GCLB가 생성되고 엔드포인트는 두 개를 할당받게 된다. 그러나, Nginx 컨트롤러에서도 위의 예상되는 동작만 기대하면 예상치 못한 상황이 발생한다. 인그레스 컨트롤러 자체가 L7 로드 밸런서인 것처럼 구현되어 있어서 아무 설정을 하지 않을 경우 전체 인그레스 리소스를 watch하여 Nginx 파드 설정을 업데이트하므로 분리가 되지 않기 때문이다. </br>


이런 분리성을 확보하기 위해 인그레스 리소스에 인그레스 클래스의 어노테이션을 지정하고 Nginx 인그레스 컨트롤러에 해당하는 인그레스 클래스를 설정하여 대상을 분리할 수 있다.


# 6.12 정리


|서비스 종류|IP 엔드포인트 내용|
|---|---|
|ClusterIP|쿠버네티스 노드 내부에서만 통신 가능한 가상 IP|
|ExternalIP|특정 쿠버네티스 노드의 IP 주소|
|NodePort|모든 쿠버네티스 노드의 모든 IP 주소(0.0.0.0)|
|LoadBalancer|클러스터 외부에 제공되는 로드 밸런서의 가상 IP|
|Headless(None)|파드의 IP 주소를 사용한 DNS 라운드 로빈|
|ExternalName|CNAME을 사용한 느슨한 연결 확보|
|None-Selector|원하는 목적지 멤버를 설정할 수 있는 다양한 엔드포인트|


|인그레스 종류|구현 예제|
|---|---|
|클러스터 외부 로드 밸런서를 사용한 인그레스|GKE|
|클러스터 내부에 인그레스용 파드를 배포하는 인그레스|Nginx 인그레스|