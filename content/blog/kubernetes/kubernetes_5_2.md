---
title: '[쿠버네티스 완벽 가이드] 08. 워크로드 API 카테고리 (2) - 레플리카셋/레플리케이션 컨트롤러'
date: 2022-08-21 16:30:00
category: 'kubernetes'
draft: false
---


# 5.3 레플리카셋/레플리케이션 컨트롤러


레플리카셋(ReplicaSet) / 레플리케이션 컨트롤러(Replication Controller)는 파드의 레플리카를 생성하고 지정한 파드 수를 유지하는 리소스이다. 원래 파드의 레플리카를 생성하는 리소스의 이름은 레플리케이션 컨트롤러였는데, 시간이 지나 레플리카셋으로 이름이 변경되면서 일부 기능이 추가되었다.


## 5.3.1 레플리카셋 생성


레플리카셋은 아래와 같은 매니페스트를 사용한다. `spec.template` 부분에는 복제할 파드 정의(Pod Template)를 기술한다.


```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: sample-rs
spec:
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
          image: nginx:1.16
          ports:
            - containerPort: 80
```


```sh
$ kubectl apply -f sample-rs.yaml
replicaset.apps/sample-rs created

# 레플리카셋 조회
$ kubectl get replicasets -o wide
NAME        DESIRED   CURRENT   READY   AGE   CONTAINERS        IMAGES       SELECTOR
sample-rs   3         3         3       39s   nginx-container   nginx:1.16   app=sample-app

# 지정한 레이블로 파드를 조회
$ kubectl get pods -l app=sample-app -o wide
NAME              READY   STATUS    RESTARTS   AGE   IP           NODE                   NOMINATED NODE   READINESS GATES
sample-rs-h2nwl   1/1     Running   0          77s   10.244.2.5   kind-cluster-worker3   <none>           <none>
sample-rs-stvwv   1/1     Running   0          77s   10.244.1.4   kind-cluster-worker2   <none>           <none>
sample-rs-zmdss   1/1     Running   0          77s   10.244.3.6   kind-cluster-worker    <none>           <none>
```


## 5.3.2 파드 정지와 자동화된 복구


레플리카셋에서는 노드나 파드에 장애가 발생했을 때 지정한 파드 수를 유지하기 위해 다른 노드에서 파드를 기동시켜 주기 때문에 장애 시 많은 영향을 받지 않는다.


```sh
# 파드 정지 (삭제)
# 실제 기동 중인 파드명을 지정
$ kubectl delete pod sample-rs-zmdss
pod "sample-rs-zmdss" deleted

# 레플리카셋 목록 표시
$ kubectl get pods
NAME                READY   STATUS    RESTARTS        AGE
sample-rs-29nlp     1/1     Running   0               29s
sample-rs-h2nwl     1/1     Running   1 (2m43s ago)   7d22h
sample-rs-stvwv     1/1     Running   1 (2m43s ago)   7d22h

# 레플리카셋 상세 정보 표시
$ kubectl describe replicaset sample-rs
...
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  7d22h  replicaset-controller  Created pod: sample-rs-zmdss
  Normal  SuccessfulCreate  7d22h  replicaset-controller  Created pod: sample-rs-stvwv
  Normal  SuccessfulCreate  7d22h  replicaset-controller  Created pod: sample-rs-h2nwl
  Normal  SuccessfulCreate  2m33s  replicaset-controller  Created pod: sample-rs-29nlp
```


## 5.3.3 레플리카 셋과 레이블


레플리카셋은 쿠버네티스가 파드를 모니터링하여 파드 수를 조정한다. 모니터링은 특정 레이블을 가진 파드 수를 계산하는 형태로 이루어진다. 레플리카 수가 부족한 경우 매니페스트에 기술된 `spec.template`로 파드를 생성하고 레플리카 수가 많을 경우 레이블이 일치하는 파드 중 하나를 삭제한다. 어떤 레이블을 가진 파드를 계산할지는 다음과 같이 `spec.selector` 부분에 저장한다. `spec.selector`와 `spec.template.metadata.labels`의 레이블이 일치해야 정상적으로 레플리카 셋이 생성된다.


```yaml
selector:
  matchLabel:
    app: sample-app
```


```sh
# 레이블 sample-app의 레플리카 수가 3인 레플리카 셋을 생성
$ kubectl apply -f sample-rs.yaml

# 레이블 sample-app을 가진 파드 생성
$ kubectl apply -f sample-rs-pod.yaml

# 상태 확인
$ kubectl get pods -L app
NAME              READY   STATUS        RESTARTS      AGE
sample-pod        1/1     Running       7 (35m ago)   21d
sample-rs-29nlp   1/1     Running       0             33m
sample-rs-h2nwl   1/1     Running       1 (35m ago)   7d22h
sample-rs-pod     0/1     Terminating   0             3s
sample-rs-stvwv   1/1     Running       1 (35m ago)   7d22h
```


## 5.3.4 레플리카셋과 스케일링


레플리카 셋 설정을 변경하여 파드 수를 변경할 수 있다.


- 매니페스트를 수정하여 `kubectl apply -f` 명령어 사용
- `kubectl scale` 명령어 사용


### 수정한 매니페스트로 kubectl apply 명령어를 실행하는 경우


```sh
# 레플리카 수를 3에서 4로 변경한 매니페스트를 apply
$ sed -i -e 's|replicas: 3|replicas: 4|' sample-rs.yaml
$ kubectl apply -f sample-rs.yaml
replicaset.apps/sample-rs configured

$ kubectl get pods
NAME              READY   STATUS    RESTARTS      AGE
sample-pod        1/1     Running   7 (42m ago)   21d
sample-rs-29nlp   1/1     Running   0             40m
sample-rs-h2nwl   1/1     Running   1 (42m ago)   7d22h
sample-rs-pc5xx   1/1     Running   0             52s
sample-rs-stvwv   1/1     Running   1 (42m ago)   7d22h
```

### kubectl scale 명령어를 사용하는 경우


두 번재 방법은 `kubectl scale` 명령어를 사용하여 스케일링 하는 방법이다. `scale` 명령어를 사용한 스케일 처리는 레플리카셋 이외에도 레플리케이션 컨트롤러/디플로이먼트/스테이트풀셋/잡/크론잡에서 사용할 수 있다.


```sh
# 레플리카 수를 5로 변경
$ kubectl scale replicaset sample-rs --replicas 5
replicaset.apps/sample-rs scaled

$ get pods -l app
NAME              READY   STATUS    RESTARTS      AGE
sample-rs-29nlp   1/1     Running   0             46m
sample-rs-h2nwl   1/1     Running   1 (48m ago)   7d23h
sample-rs-pc5xx   1/1     Running   0             7m9s
sample-rs-rld68   1/1     Running   0             22s
sample-rs-stvwv   1/1     Running   1 (48m ago)   7d23h
```


## 5.3.5 일치성 기준 조건과 집합성 기준 조건


서비스 중단 예정인 레플리케이션 컨트롤러의 셀렉터는 일치성 기준 셀렉터였지만, 레플리카셋에서는 집합성 기준 셀렉터를 사용하여 더 유연하게 제어가 가능하다.


|조건|개요|
|---|---|
|일치성 기준|조건부에 일치 불일치(=, !=) 조건 지정|
|집합성 기준|조건부에 일치 불일치(=, !=) 조건 지정과 집합(in, notin, exists) 조건 지정 가능|


일치성 기준 조건에서는 앞서 사용한 label 예시처럼, `app=sample-app`과 같이 지정한다. 집합성 기준 조건에서는 일치성 기준 조건과 함께 집합 조건을 지정할 수 있다. `env In [deployment,staging]`과 같이 지정할 수 있다.

