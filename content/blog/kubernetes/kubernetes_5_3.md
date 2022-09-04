---
title: '[쿠버네티스 완벽 가이드] 09. 워크로드 API 카테고리 (3) - 디플로이먼트'
date: 2022-08-28 13:30:00
category: 'kubernetes'
draft: false
---


# 5.4 디플로이먼트


디플로이먼트(Deployment)는 여러 레플리카셋을 관리하여 롤링 업데이트나 롤백 등을 구현하는 리소스이다. 디플로이먼트가 레플리카셋을 관리하고 레플리카셋이 파드를 관리하는 관계이다. 다음과 같이 동작한다.


1. 신규 레플리카셋을 생성
2. 신규 레플리카셋의 레플리카 수를 단계적으로 늘림
3. 신규 레플리카셋의 레플리카 수를 단계적으로 줄임
4. (2,3)을 반복
5. 이전 레플리카셋은 레플리카 수를 0으로 유지


디플로이먼트를 사용하면 신규 레플리카셋에 컨테이너가 기동되었는지와 헬스 체크는 통과했는지를 확인하면서 전환 작업이 진행되며, 레플리카셋의 이행 과정에서 파드 수에 대한 상세 지정도 가능하다. 이는 쿠버네티스에서 가장 권장하는 컨테이너 기동 방법으로 알려져 있다. 지금까지 파드나 레플리카셋의 사용 방법도 설명했는데, 가령 하나의 파드를 기동만 한다 하더라도 디플로이먼트 사용을 권장한다. 파드만으로 배포한 경우 파드에 장애가 생기면 파드가 다시 생성되지 않으며, 레플리카셋의 경우에도 롤링 업데이트 등의 기능을 사용할 수 없다.


## 5.4.1 디플로이먼트 생성


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-deployment
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
          image: nginx:1.12
          ports:
            - containerPort: 80
```


매니페스트로 디플로이먼트를 생성한다. 이번에는 `--record` 옵션을 사용하여 어떤 명령어를 실행하고 업데이트했는지 이력을 지정해 둔다. 이력을 작성해 놓으면, 나중에 설명하는 `kubectl rollout`에서 롤백 등을 실시할 때 참고 정보로 사용할 수 있다. 실제 서비스 환경에서 rollout 기능을 사용할 일은 많지 않아 `--record` 역시 많이 사용되진 않는다. 아래 소스에서 nginx 이미지 버전을 1.12 -> 1.17로 업데이트 하였는데, 덥데이트 후 레플리카셋이 새로 생성되고 거기에 연결되는 형태로 파드도 다시 생성된다. 이때 내부적으로 롤링 업데이트가 되어 실제 서비스에는 영향이 없다.


```sh
# 업데이트 이력을 저장하는 옵션을 사용하여 디플로이먼트 기동
$ kubectl apply -f sample-deployment.yaml --record
Flag --record has been deprecated, --record will be removed in the future
deployment.apps/sample-deployment created

$ kubectl get deployments
NAME                READY   UP-TO-DATE   AVAILABLE   AGE
sample-deployment   3/3     3            3           75s

$ kubectl get replicasets -o yaml | head
apiVersion: v1
items:
- apiVersion: apps/v1
  kind: ReplicaSet
  metadata:
    annotations:
      deployment.kubernetes.io/desired-replicas: "3"
      deployment.kubernetes.io/max-replicas: "4"
      deployment.kubernetes.io/revision: "1"
      kubernetes.io/change-cause: kubectl apply --filename=sample-deployment.yaml

# 컨테이너 이미지 업데이트
$ kubectl set image deployment sample-deployment nginx-container=nginx:1.17 --record

# 디플로이먼트 업데이트 상태 확인
$ kubectl rollout status deployment sample-deployment
deployment "sample-deployment" successfully rolled out
```


## 5.4.2 디플로이먼트 업데이트 조건


디플로이먼트에는 변경이 발생되면 위의 예제와 같이 레플리카셋이 다시 생성된다. 이 '변경'에는 레플리카 수의 변경 등은 포함되어 있지 않으며, '생성된 파드 내용의 변경'이 필요하다. 매니페스트를 쿠버네티스에 등록하게 되면, `spec.template` 아래의 해시값(파드 템플릿 해시)를 계신하고 이 값을 사용한 레이블로 관리한다. 다시 수작업으로 이미지 등을 이전 버전으로 재변경하여 해시값이 동일해진 경우에는 레플리카셋을 신규로 생성하지 않고 기존 레플리카셋을 사용한다.


```sh
$ kubectl get replicasets
NAME                           DESIRED   CURRENT   READY   AGE
sample-deployment-567547fc8    3         3         3       31m # 1.17 버전의 레플리카셋
sample-deployment-847b7dfb49   0         0         0       6d19h # 1.12 버전의 레플리카셋
```


## 5.4.3 변경 롤백


디플로이먼트에는 롤백 기능이 있다. 롤백 기능의 실체는 현재 사용 중인 레플리카셋의 전환과 같은 것이다. 디플로이먼트가 기존에 생성한 레플리카셋은 레플리카 수가 0인 상태로 남아 있기 때문에 레플리카 수를 변경시켜 다시 사용할 수 있는 상태가 된다.


변경 이력을 확인할 때는 `kubectl rollout history` 명령어를 사용한다. `CHANGE-CAUSE` 부분에 이력이 기록되는데, 처음 디플로이먼트를 생성할 때 `--record` 옵션을 사용하여 이력 내용이 있을 때만 이력이 남는다. 해당 버전의 수정 상세 정보를 가져오려면 `--revision` 옵션을 사용한다.


```sh
$ kubectl rollout history deployment sample-deployment --revision 1
deployment.apps/sample-deployment with revision #1
Pod Template:
  Labels:	app=sample-app
	pod-template-hash=847b7dfb49
  Annotations:	kubernetes.io/change-cause: kubectl apply --filename=sample-deployment.yaml --record=true
  Containers:
   nginx-container:
    Image:	nginx:1.12
    Port:	80/TCP
    Host Port:	0/TCP
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>

$ kubectl rollout history deployment sample-deployent --revision 2
deployment.apps/sample-deployment with revision #2
Pod Template:
  Labels:	app=sample-app
	pod-template-hash=567547fc8
  Annotations:	kubernetes.io/change-cause: kubectl set image deployment sample-deployment nginx-container=nginx:1.17 --record=true
  Containers:
   nginx-container:
    Image:	nginx:1.17
    Port:	80/TCP
    Host Port:	0/TCP
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>
```


롤백하려면 `kubectl rollout undo` 명령어를 사용한다.


```sh
# 버전 번호를 지정하여 롤백
$ kubectl rollout undo deployment sample-deployment --to-revision 1

# 바로 이전 버전으로 롤백 (--to-revision이 0으로 지정됨)
$ kubectl rollout undo deployment sample-deployment

# 롤백한 이후 이전 레플리카셋이 다시 기동됨
$ kubectl get replicasets
NAME                           DESIRED   CURRENT   READY   AGE
sample-deployment-567547fc8    0         0         0       42m
sample-deployment-847b7dfb49   3         3         3       6d20h
```


## 5.4.4 디플로이먼트 변경 일시 중지


일반적으로는 디플로이먼트 변경을 하면 바로 적용되나, 안전을 위해 업데이트를 잠시 멈추도록 할 수 있다.


```sh
# 업데이트 일시 중지
$ kubectl rollout pause deployment sample-deployment
deployment.apps/sample-deployment paused

# pause 상태에서 컨테이너 이미지 업데이트
$ kubectl set image deployment sample-deployment nginx-container=nginx:1.17
deployment.apps/sample-deployment image updated

# 업데이트는 대기 상태
$ kubectl rollout status deployment sample-deployment
Waiting for deployment "sample-deployment" rollout to finish: 0 out of 3 new replicas have been updated...

# 업데이트 재개
$ kubectl rollout resume deployment sample-deployment
deployment.apps/sample-deployment resumed

# 업데이트 상태 확인
$ kubectl rollout status deployment sample-deployment
deployment "sample-deployment" successfully rolled out
```


## 5.4.5 디플로이먼트 업데이트 전략


위 예제에서는 디플로이먼트를 업데이트하면 `RollingUpdate` 가 진행되었다. 이 외에도 `Recreate` 전략도 있다.


### Recreate


`Recreate`는 모든 파드를 한 번 삭제하고 다시 파드를 생성하기 때문에 다운타임이 발생하지만, 추가 리소스를 사용하지 않고 전환이 빠른 것이 장점이다. 기존 레플리카셋의 레플리카 수를 0으로 하고 리소스를 반환한다. 이후 신규 레플리카셋을 생성하고 레플리카 수를 늘린다. 그래서 클러스터 전체에 현재 동작하고 있는 레플리카 수만큼만 리소스가 있다 하더라도 업데이트할 수 있다.


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-deployment-recreate
spec:
  strategy:
    type: Recreate
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
```


```sh
# 컨테이너 이미지 업데이트
$ kubectl set image deployment sample-deployment-recreate nginx-container=nginx:1.17
deployment.apps/sample-deployment-recreate image updated

# 레플리카셋 목록 표시 (리소스 상태 변화가 있으면 계속 출력)
$ kubectl get replicasets --watch
NAME                                    DESIRED   CURRENT   READY   AGE
sample-deployment-567547fc8             3         3         3       51m
sample-deployment-847b7dfb49            0         0         0       6d20h
sample-deployment-recreate-5f85cc775b   0         0         0       20s
sample-deployment-recreate-7b8dbc9899   3         3         0       0s
sample-deployment-recreate-7b8dbc9899   3         3         1       0s
sample-deployment-recreate-7b8dbc9899   3         3         3       0s
```


### RollingUpdate


`Recrate`는 위에서 설명한대로 기존 자원을 반환하기 때문에, 추가 리소스를 사용하지 않고 빠른 업데이트가 가능하다. `RollingUpdate`는 업데이트 중에 동시에 정지 가능한 최대 파드 수(`maxUnavailable`)와 업데이트 중에 동시에 생성할 수 있는 최대 파드 수(`maxSurge`)를 설정할 수 있다. 이 설정을 사용하면 추가 리소스를 사용하지 않도록 하거나 많은 리소스를 소비하지 않고 빠르게 전환하는 등 업데이트를 하면서 동작을 제어할 수 있다. 두 값 모두 0으로 설정할 수는 없다. 아래 매피페스트와 같이 `maxUnavailable=0`, `maxSurge=1` 설정으로 하면 `maxSurge` 수만틈 추가 레플리카 수를 늘려 파드를 이동시킨다. `maxUnavailable`과 `maxSurge`는 백분율로도 지정할 수 있다. 지정하지 않을 경우 기본 값은 모두 25%이다.


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-deployment-rollingupdate
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
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
```

```sh
# 컨테이너 이미지 업데이트
$ kubectl set image deployment sample-deployment-rollingupdate nginx-container=nginx:1.17
deployment.apps/sample-deployment-rollingupdate image updated

# 레플리카셋 목록 표시(리소스 상태 변화가 있으면 계속 출력)
$ kubectl get replicasets --watch
NAME                                         DESIRED   CURRENT   READY   AGE
sample-deployment-567547fc8                  3         3         3       57m
sample-deployment-847b7dfb49                 0         0         0       6d20h
sample-deployment-rollingupdate-5f85cc775b   3         3         3       66s
sample-deployment-rollingupdate-7b8dbc9899   1         1         0       1s
sample-deployment-rollingupdate-7b8dbc9899   1         1         1       1s
sample-deployment-rollingupdate-5f85cc775b   2         3         3       66s
sample-deployment-rollingupdate-5f85cc775b   2         3         3       66s
sample-deployment-rollingupdate-7b8dbc9899   2         1         1       1s
sample-deployment-rollingupdate-5f85cc775b   2         2         2       66s
sample-deployment-rollingupdate-7b8dbc9899   2         1         1       1s
sample-deployment-rollingupdate-7b8dbc9899   2         2         1       1s
sample-deployment-rollingupdate-7b8dbc9899   2         2         2       2s
sample-deployment-rollingupdate-5f85cc775b   1         2         2       67s
sample-deployment-rollingupdate-5f85cc775b   1         2         2       67s
sample-deployment-rollingupdate-7b8dbc9899   3         2         2       2s
sample-deployment-rollingupdate-5f85cc775b   1         1         1       67s
sample-deployment-rollingupdate-7b8dbc9899   3         2         2       2s
sample-deployment-rollingupdate-7b8dbc9899   3         3         2       2s
sample-deployment-rollingupdate-7b8dbc9899   3         3         3       3s
sample-deployment-rollingupdate-5f85cc775b   0         1         1       68s
sample-deployment-rollingupdate-5f85cc775b   0         1         1       68s
sample-deployment-rollingupdate-5f85cc775b   0         0         0       68s
```


## 5.4.6 상세 업데이트 파라미터


`Recreate`나 `RollingUpdate`를 사용할 때는 다른 파라미터를 사용하여 설정할 수도 있다.


- minReadySeconds(최소 대기 시간(초)): 파드가 Ready 상태가 된 다음부터 디플로이먼트 리소스에서 파드 기동이 완료되었다고 판단(다음 파드의 교체가 가능하다고 판단)하기까지의 최소 시간(초)
- revisionHistoryLimit(수정 버전 기록 제한): 디플로이먼트가 유지할 레플리카셋 수, 롤백이 가능한 이력 수
- progressDeadlineSeconds(진행 기한 시간(초)): `Recreate`/`RollingUpdate` 처리 타임아웃 시간, 타임아웃 시간이 경과하면 자동으로 롤백


위의 내용은 모두 디플로이먼트의 `spec` 아래에 설정할 수 있다.


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-deployment-params
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 2
  progressDeadlineSeconds: 3600
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
```


## 5.4.7 디플로이먼트 스케일링


디플로이먼트가 관리하면 레플리카셋의 레플리카 수는 레플리카셋과 같은 방법으로 `kubectl apply -f` 또는 `kubectl scale`을 사용하여 스케일 할 수 있다.


```sh
# 레플리카 수를 3에서 4로 변경한 매니페스트를 apply
$ sed -i -e 's|replicas: 3|replicas: 4|' sample-deployment.yaml
$ kubectl apply -f sample-deployment.yaml
deployment.apps/sample-deployment configured

# kubectl scale 명령어를 사용한 스케일링
$ kubectl scale deployment sample-deployment --replicas=5
deployment.apps/sample-deployment scaled

$ kubectl get pods -L app
NAME                                 READY   STATUS    RESTARTS      AGE   APP
sample-deployment-5988795749-5bw7c   1/1     Running   0             56s   sample-app
sample-deployment-5988795749-5rvp4   1/1     Running   0             56s   sample-app
sample-deployment-5988795749-kktn8   1/1     Running   0             57s   sample-app
sample-deployment-5988795749-pc2tr   1/1     Running   0             36s   sample-app
sample-deployment-5988795749-xsj5h   1/1     Running   0             57s   sample-app
```

