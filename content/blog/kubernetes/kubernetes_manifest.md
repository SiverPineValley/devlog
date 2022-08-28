---
title: '쿠버네티스의 매니페스트 파일'
date: 2022-07-31 13:13:34
category: 'kubernetes'
draft: false
---

# 매니페스트?


쿠버네티스에서는 클러스터 안에서 움직이는 컨테이너 애플리케이션이나 네트워크 설정, 배치 실행을 하는 잡 등과 같은 리소스를 작성한다. 이와 같은 구체적인 설정 정보를 파일로 관리하는데, 이것이 매니페스트 파일(manifest file)이다.


# 매니페스트 파일의 구조


```yaml
apiVersion: [1. API의 버전 정보]
kind: [2. 리소스의 종류]
metadata:
  name: [3. 리소스의 이름]
spec:
  [4. 리소스의 상세 정보]
```


매니페스트 파일은 쿠버네티스 리소스에 따라 작성 방법에 차이가 있을 순 있지만, 기본적으로 위와 같은 구조를 가진다. 각 요소를 자세하게 살펴보면 아래와 같다.


## 1. API의 버전 정보


호출할 API의 버전을 지정한다. 버전에 따라 다음과 같이 안정성과 지원 레벨이 다르다.


    - alpha(알파)
    앞으로의 소프트웨어 릴리스에서 예고 없이 호환성이 없는 방법으로 변경될 가능성이 있는 버전. 검증 환경에서만 사용할 것을 권장합니다. 또 기능 지원은 통지 없이 중지되는 경우도 있습니다. 'v1alpha1' 등으로 설정합니다.

    - beta(베타)
    충분히 테스트를 거친 버전입니다. 단, 기능은 삭제되지 않지만 상세 내용이 변경되는 경우가 있습니다. 때문에 실제 환경 이외에서 사용할 것을 권장합니다. 구체적으로는 'v2beta3' 등으로 설정합니다.

    - 안정판
    안정판 버전에는 'v1'과 같은 버전 번호가 붙습니다. 실제 환경에서 이용합니다. 이 외에도 KubernetesAPI 확장을 위한 API 그룹 등을 설정할 수 있습니다.


|버전 종류|설명|
|---|---|
|v1|쿠버네티스에서 발행한 첫 stable release API (대부분의 api가 포함되어 있음) |
|apps/v1|쿠버네티스의 common API 모음, Deployment, RollingUpdate, ReplicaSet을 포함|
|autoscaling/v1|pod의 autoscale 기능을 포함하는 API, 현재는 CPU metric을 사용한 scaling만 가능 (추후에 alpha, beta version에서 memory, custom metric으로 scaling 기능 추가예정)|
|batch/v1|배치 프로세스, job-like task를 위한 배포 api|
|batch/v1beta1|batch/v1에서 cronJob으로 job을 돌리는 api가 추가|
|ertivicates.k8s.io/v1 beta|클러스터의 secure network function들이 추가된 API (TLS 등의 기능 추가)|
|extensions/v1beta|eployments, DaemonSets, ReplicatSets, Ingress 등 상당수 feature들이 새롭게 정의된 API. 그러나 상당수의 api들이 apps/v1과 같은 그룹으로 이동되어서, 쿠버네티스 1.6버젼 이후부터는 deprecated 됨|
|policy/v1beta1|pod에 대한 security rule이 정의된 API|
 

## 2. 리소스의 종류


쿠버네티스의 리소스 종류를 지정한다. 리소스는 다음과 같은 것들이 있습니다.


|구분|리소스|
|---|---|
|애플리케이션의 실행|Pod/ReplicaSet/Deployment|
|네트워크의 관리|Service/Ingress|
|애플리케이션 설정 정보의 관리|ConfigMap/Secrets|
|배치 잡의 관리|Job/CronJob|


### 파드(Pod)


파드는 컨테이너가 모인 집합체의 단위로 적어도 하나 이상의 컨테이너로 이루어진다. 쿠버네티스에서는 결합이 강한 컨테이너를 파드로 묶어 일괄 배포한다. 
파드 하나는 여러 노드에 걸쳐 배치될 수 없다. 함께 배포해야 정합성을 유지할 수 있는 컨테이너 등에도 해당 컨테이너를 같은 파드로 묶어두는 전략이 유용하다. 
쿠버네티스에서는 관리용 서버인 마스터가 클러스터 전체를 제어하며 마스터 노드는 관리용 컴포넌트가 담긴 파드만 배포된 노드이다. 어플리케이션에 사용되는 파드는 배포할 수 없다.


```yaml
apiVersion: v1  # 리소스의 유형을 지정하는 속성
kind: Pod
metadata:       # 리소스에 부여되는 메타데이터. metadata.name 속성의 값이 리소스의 이름이 된다.
  name: simple-echo
spec:           # 리소스를 정의하기 위한 속성.
  containers:
  - name: nginx # 컨테이너 이름
    image: gihyodocker/nginx:latest # 도커 허브에 저장된 이미지 태그값
    env:        # 환경변수
    - name: BACKEND_HOST
      value: localhost:8080
    ports:      # 컨테이너가 노출시킬 포트를 지정 (도커파일에서 지정한 경우 따로 지정할필요 x)
    - containerPort: 80
  - name: echo
    image: gihyodocker/echo:latest
    ports:
    - containerPort: 8080
```

### ReplicaSet


ReplicaSet는 똑같은 정의를 갖는 파드를 여러개 생성하고 관리하기 위한 리소스다.


```yaml
piVersion: apps/v1
kind: ReplicaSet
metadata:
  name: echo
  labels:
    app: echo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: echo
  template: # template 아래는 파드 리소스 정의와 같음
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - name: nginx
        image: gihyodocker/nginx:latest
        env:
        - name: BACKEND_HOST
          value: localhost:8080
        ports:
        - containerPort: 80
      - name: echo
        image: gihyodocker/echo:latest
        ports:
        - containerPort: 8080
```


### Deployment


ReplicaSet보다 상위에 해당하는 리소스로 Deployment가 있다. Deployment는 어플리케이션 배포의 기본단위가 되는 리소스이다.
Deployment의 정의는 ReplicaSet의 정의와 크게 다르지 않다. 차이가 있다면 Deployment가 ReplicaSet의 리비전 관리를 할 수 있다는 점 정도다.


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
  labels:
    app: echo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: echo
  template: # template 아래는 파드 리소스 정의와 같음
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - name: nginx
        image: gihyodocker/nginx:latest
        env:
        - name: BACKEND_HOST
          value: localhost:8080
        ports:
        - containerPort: 80
      - name: echo
        image: gihyodocker/echo:patched
        env:
        - name: HOGE
          value: fuga
        ports:
        - containerPort: 8080
```


## 3. 리소스의 이름


리소스의 이름을 설정한다. kubectl 명령 등으로 조작을 할 때 식별에 사용하므로 짧고 알기 쉬운 이름이 선호된다.


## 4. 리소스의 상세 정보


리소스의 상세 정보를 설정한다. 리소스의 종류에 따라 설정할 수 있는 값이 달라진다.

예를 들어 Pod의 경우 다음과 같은 값을 설정한다.

- 컨테이너의 이름
- 컨테이너 이미지의 저장 위치
- 컨테이너가 전송할 포트 번호
- 컨테이너가 내부에서 사용하는 환경 변수에 대한 참조


# 출처
https://kimjingo.tistory.com/126</br>
https://honggg0801.tistory.com/45</br>
https://kkimsangheon.github.io/2019/05/27/kube6/