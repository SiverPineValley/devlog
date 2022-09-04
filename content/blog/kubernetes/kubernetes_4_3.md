---
title: '[쿠버네티스 완벽 가이드] 06. API 리소스와 kubectl (3)'
date: 2022-08-06 18:00:00
category: 'kubernetes'
draft: false
---


## 4.5.6 매니페스트 파일 설계


지금까지는 kubectl로 '한개 리소스가 정의된 한 개의 매니페스트 파일'을 적용하는 예들이었다면 실제로는 한 개의 매니페스트 파일에 여러 개의 리소스를 정의하거나 여러 매니페스트 파일을 동시에 적용할 수도 있다.


### 하나의 매니페스트 파일에 여러 리소스 정의


매니페스트 파일에는 여러 리소스를 한 개의 매니페스트 파일에 정의할 수 있다. 따라서 어떤 서비스에서 사용할 여러 종류의 리소스를 한 개의 매니페스트 파일로 통합할 수 있다. 일반적인 사용 사례로는 '파드를 기동하는 워크로드 API 카테고리의 리소스'와 '외부에 공개하는 서비스 API 카테고리의 리소스'를 매니페스트에 통합하여 작성하는 방법을 생각해볼 수 있다. 이 경우 한 개의 매니페스트 파일로 서비스를 외부에 공개할 수 있게 된다. 실행 순서를 정확하게 지켜야 하거나 리소스 간 결합도를 높이고 싶다면 하나의 매니페스트로 관리하는 것이 좋을 수 있다.


아래 매니페스트를 적용하면 위에서부터 리소스 순서대로 적용된다. 위에서 부터 차례대로 적용되지만, 중간에 에러가 발생하면 이후 정의된 리소스는 적용되지 않게 된다.


```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order1-deployment
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
---
apiVersion: v1
kind: Service
metadata:
  name: order2-service
spec:
  type: LoadBalancer
  ports:
    - name: "http-port"
      protocol: "TCP"
      port: 8080
      targetPort: 80
  selector:
    app: sample-app
```


### 여러 매니페스트 파일을 동시에 적용


여러 매니페스트 파일을 동시에 적용하려면 디렉터리 안에 적용하고 싶은 여러 매니페스트 파일을 배치해 두고 `kubectl apply` 명령어를 실행할 때 해당 디렉터리를 지정하면 된다. 파일명 순으로 매니페스트 파일이 순차적으로 적용되기 때문에 순서를 제어하고 싶을 때는 파일명 앞에 연번의 인덱스 번호 등을 지정하여 사용하면 된다. `kubectl apply -f ./ -R` 과 같이 `-R` 옵션을 사용하면 재귀적으로 디렉터리 안에 존재하는 매니페스트 파일들을 적용할 수도 있다.



## 4.5.7 어노테이션과 레이블


쿠버네티스에서는 각 리소스에 대해 어노테이션과 레이블이라는 메타데이터를 부여할 수 있다. 둘다 쿠버네티스가 리소스를 관리할 때 사용한다는 점에서 비슷하지만 용도가 조금 다르다. 어노테이션과 레이블은 '[접두사]/키:값' 으로 구성된다. 접두사 부분은 옵션으로, 지정하는 경우 DNS 서브 도메인 형식이어야 한다.


|명칭|개요|
|---|---|
|어노테이션|시스템 구성 요소가 사용하는 메타데이터|
|레이블|리소스 관리에 사용되는 메타데이터|


### 어노테이션


어노테이션(annotation)은 아래와 같이 `metadate.annotations`로 설정할 수 있는 메타데이터로, 리소스에 대한 메모라고 생각하면 된다. 어노테이션 자체는 단순히 key-value 값이므로, 어노테이션 값으로 어떤 처리를 하는 시스템 구성 요소가 없으면 아무 일도 일어나지 않는다. 리소스에 의미를 가지지 않는 메모를 하고 싶을 때도 사용할 수 있고, 값에 수치를 사용하는 경우에는 큰따옴표("")로 묶어야 한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-annotation
  annotations:
    annotation1: val1
    annotation2: val2
spec:
  containers:
    - name: nginx-container
      image: nginx:1.12
```


kubectl을 통해서도 부여 가능하다.


```sh
$ kubectl apply -f sample-annotations.yaml

# 어노테이션 부여
$ kubectl annotate pods sample-annotation annotation3=val3

# 어노테이션 부여 (덮어 쓰기)
$ kubectl annotate pods sample-annotation annotation3=val-new --overwrite

# 어노테이션 확인
$ kubectl get pods sample-annotation -o json | jp .metadata.annotations

# 어노테이션 삭제
$ kubectl annotate pods sample-annotations annotations3-
```


어노테이션은 크게 다음과 같이 사용된다.
- 시스템 구성 요소를 위한 데이터 저장
- 모든 환경에서 사용할 수 없는 설정
- 정식으로 통합되기 전의 기능을 설정


#### 시스템 구성 요소를 위한 데이터 저장


이전에 `kubectl create`을 쓰지 말고 `kubectl apply`를 사용해야 하는 이유를 설명했을 때 등장한 `kubectl.kubernetes.io/last-applied-configuration`도 어노테이션 중 하나이다. 이 어노테이션은 '이전에 적용한 매니페스트' 내용이 저장되어 있다. 이 어노테이션은 사용자가 따로 저장하는 것이 아니라 시스템 자체적으로 저장한 데이터이다.


#### 모든 환경에서 사용할 수 없는 설정


쿠버네티스 클러스터의 파드에 대해 클러스터 외부에서 접속할 수 있도록 외부 로드 밸런서 등과 연계하는 서비스 리소스 등에서 사용된다. 서비스 리소스를 생성하면 GKE 에서는 Google Cloud Load Balancing(GCLB), EKS에서는 AWS Classic Load Balancer(CLB) 또는 Network Load Balancer(NLB)와 연계한다. 대부분의 경우 로드 밸런서와 연계하는 서비스 리소스는 외부에서 접속할 수 있도록 글로벌 IP 주소가 부여된 글로벌 엔드포인트가 생성된다. 그러나 GKE와 EKS는 어노테이션을 부여하면 로컬 IP 주소가 부여된 인터널 엔드포인트 생성도 가능하다.


#### 정식으로 통합되기 전의 기능을 설정


최근에는 쿠버네티스 생태계가 많이 성숙한 덕분에 거의 보이지 않지만, 쿠버네티스에 공식적으로 통합되기 전의 실험적인 기능과 평가 중인 새로운 기능 설정을 어노테이션으로 사용하는 경우도 있다. 스토리지클래스(StorageClass)나 초기화 컨테이너(Init Container)등이 있다.


### 레이블


레이블은 `metadata.labels`에 설정할 수 있는 메타데이터다. 레이블은 리소스를 구분하기 위한 정보이다. 컨테이너는 하나의 프로세스와 같은 아주 작은 리소스이다. 파드도 여러 컨테이너로 이루어진 작은 리소스이다. 쿠버네티스는 파드와 같은 리소스를 대량으로 처리할 뿐만 아니라, 서비스, 인그레스, 컨피그맵, 시크릿 등등과 같은 리소스들도 처리한다. 레이블은 이러한 수 많은 리소스에 대해 동일한 레이블로 그룹핑하여 처리하거나 어떤 처리 조건으로 사용되기 때문에 리소스를 효율적으로 관리할 수 있는 구조를 가진다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-label
  labels:
    label1: val1
    label2: val2
spec:
  containers:
    - name: nginx-container
      image: nginx:1.12
```


매니페스트에 작성할 수도 있지만, kubectl에서 직접 부여할 수도 있다.


```sh
# 레이블 부여
$ kubectl label pods sample-label label3=val3

# 레이블 부여 (덮어 쓰기)
$ kubectl label pods sample-label label3=val3-new --overwrite

# 레이블 확인
$ kubectl get pods sample-label -o json | jq .metadata.labels

# 레이블 삭제
$ kubectl label pods sample-label label3-
```


#### 개발자가 사용하는 레이블


개발자가 많은 리소스를 효율적으로 관리하는 데 레이블은 정말 유용하게 사용된다. `kubectl get -l`과 같이 `-l` 옵션을 사용해서 특정 label이 있는 pod 들을 필터링하여 표시할 수 있다. `-L` 옵션은 해당 파드의 뒤에 입력된 label 값을 같이 표시해준다. `--show-label`은 모든 레이블을 표시할 때 사용된다.


```sh
# label1=val1, label2 레이블을 가진 파드 표시
$ kubectl get pods -l label1=val1,label2

# 파드와 label1 레이블 표시
$ kubectl get pods -L label1

# 모든 레이블 표시
$ kubectl get pods --show-labels
```


#### 시스템이 사용하는 레이블


파드 수를 유지하는 리소스(ReplicaSet) 에서는 레이블에 부여된 파드 수를 계산하여 레플리카 수를 관리한다. 대상 파드 수가 레플리카 수의 설정보다 많으면 기존 파드 중 하나를 삭제하고, 부족하면 하나를 생성한다. 따라서 조건에 일치하는 파드를 별도로 생성하게 되면 기존 파드가 정지하는 경우가 발생할 수 있다. 마찬가지로, 외부 요청을 로드 밸런서로 받은 후에 파드로 전송하는 서비스 리소스(LoadBalancer)에서는 이 레이블을 기준으로 목적지 파드를 설정한다. 이 경우 실수로 레이블을 지정하게 되면 다른 파드에 트래픽이 전송되어 문제가 발생한다.


레이블 키 이름에는 다음과 같이 권장되고 있다.


|레이블 키 이름|개요|
|---|---|
|app.kubernetes.io/name|애플리케이션 이름|
|app.kubernetes.io/version|애플리케이션 버전|
|app.kubernetes.io/component|애플리케이션 내 구성 요소|
|app.kubernetes.io/part-of|애플리케이션이 전체적으로 구성하는 시스템 이름|
|app.kubernetes.io/instance|애플리케이션이나 시스템을 식별하는 인스턴스명|
|app.kubernetes.io/managed-by|이 애플리케이션을 관리하는 데 사용되는 도구|


## 4.5.8 Prune을 사용한 리소스 삭제: -prune 옵션


쿠버네티스를 실제 운용할 때 수동으로 kubectl 명령어를 사용하는 일은 거의 없다. 수동으로 운영하는 것은 휴먼 에러가 발생하기 쉽고, 사람이 파악하고 관리할 수 있는 리소스 수에 한계가 있기 때문에 권장되지 않는다. Git 저장소에서 매니페스를 관리하고 변경이 있을 때만 `kubectl apply` 명령어를 사용하여 자동으로 매니페스트를 적용시키는 방법이 있다. 하지만 매니페스트에서 삭제된 리소스를 삭제하는 데 필요한 kubectl delete 명령어를 자동으로 실행하려면 매니페스트에서 삭제된 리소스를 감지할 수 있는 구조를 만들어야 한다.


여기서 필요한 것이 `kubectl apply` 명령어에서 사용 가능한 `--prune` 옵션이다. 이 옵션은 `kubectl apply` 명령어어를 실행할 때 매니페스트에서 삭제된 리소스를 감지하여 자동으로 삭제하는 기능을 구현할 수 있다. 그래서 CI/CD 파이프라인에서는 업데이트된 매니페스트에 대해 kubectl apply --prune 명령어를 계속 실행하는 것만으로 매니페스트에서 삭제된 리소스도 자동으로 삭제할 수 있다.


Prune은 레이블과 일치하는 전체 리소스의 목록에서 읽어들인 매니페스트 안에 '포함되지 않는 리소스'를 모두 삭제하는 구조로 동작한다.


```sh
# 초기 생성
$ kubectl apply -f ./prune-sample --prune -l system=a

# 파일 삭제
$ rm prune-sample/sample-pod1.yaml

# 삭제 후 다시 업데이트
$ kubectl apply -f ./prune-sample --prune -l system=a
```


## 4.5.9 편집기로 편집: edit


`kubectl edit` 명령어는 편집기 상에서 해당 리소스를 편집할 수 있다. 편집에 사용되는 편집기는 환경 변수 EDITOR이나 KUBE_EDITOR로 지정할 수 있다.


```sh
# 환경 변수 EDITOR에 vim을 일시적으로 정의(~/.bashrc 등에 추가하면 영구적으로 사용 가능)
$ export EDITOR=vim

# 파드 정의 편집(환경 변수 EDITOR에 정의된 편집기 실행)
$ kubectl edit pod sample-pod
```


## 4.5.10 리소스 일부 정보 업데이트: set


매니페스트 파일을 업데이트하지 않고 일부 설정값(또는 이 설정값을 가진 특정 리소스)만 `kubectl set` 명령어를 사용하여 간단히 동작 상태를 변경할 수 있다. 변경 가능한 설정값은 다음과 같다.


- env
- image
- resources
- selector
- serviceaccount
- subject


예를 들어, 컨테이너 이미지만 업데이트 하는 경우, 다음과 같이 하면 된다. 다만, `kubectl set`은 매니페스트 파일만 업데이트 되는 것이라, 실제 서버상의 리소스에 적용되는 것이 아니다.


```sh
# sample-pod 내 nginx-container 컨테이너의 컨테이너 이미지 확인
$ kubectl describe pod sample-pod

# 컨테이너 이미지를 nginx:1.17에서 nginx:1.16으로 변경
# 서식: kubectl set image 리소스 종류 리소스명 컨테이너명=컨테이너 이미지 지정
$ kubectl set image pod sample-pod nginx-container=nginx:1.16

# sample-pod 내 nginx-container 컨테이너의 컨테이너 이미지 확인
$ kubectl describe pod sample-pod
```


## 4.5.11 로컬 매니페스트와 쿠버네티스 등록 정보 비교 출력: diff


쿠버네티스에서는 매니페스트를 적용할 때 '실제로 쿠버네티스 클러스터에 등록된 정보'와 '로컬에 있는 매니페스트' 내용의 차이가 있는지 알 수 없다면 매니페스트를 적용하기 힘들 수 있다. 이에 `kubectl diff`명령어를 사용하여 둘의 차이를 확인할 수 있다.


```sh
# 컨테이너 이미지를 nginx:1.15로 변경
$ kubectl set image pod sample-pod nginx-container=nginx:1.15

# 클러스터 등록 정보와 매니페스트의 차이점 확인
$ kubectl diff -f sample-pod.yaml

# 상태 코드 확인
$ echo $?
```


## 4.5.12 사용 가능한 리소스 종류의 목록 가져오기: api-resources


`kubectl api-resources` 명령어는 사용 가능한 리소스 목록을 가져올 수 있다.


```sh
# 모든 리소스 종류 표시(일부 발췌)
$ kubectl api-resources

# 네임 스페이스에 속하는 리소스
$ kubectl api-resources --namespaced=true
```

## 4.5.13 리소스 정보 가져오기: get


`kubectl get` 명령어는 리소스 목록을 가져올 수 있다.


```sh
# 파드 목록 표시
$ kubectl get pods sample-pod

# label1=val1과 label2 레이블을 가진 파드를 표시
$ kubectl get pods -l label=val1,label2 --show-labels

# 파드 목록 표시(더 상세히 표시)
$ kubectl get pods -o wide

# YAML 형식으로 파드의 상세 목록 출력
$ kubectl get pods -o yaml

# Custom Columns (모든 파드의 파드명과 기동 중인 호스트 IP주소를 표시)
$ kubectl get pods -o custom-columns="NAME:{.metadata.name},NodeIP:{.status.hostIP}"

# JSON Path(sample-pod의 파드명 표시)
$ kubectl get pods sample-pod -o jsonpath="{.metadata.name}"

# .spec.containers[].name이 nginx-container에 일치하는 요소의 .spec.containers[].image를 출력
$ kubectl get pods sample-pod -o jsonpath="{.spec.containers[?(@.name == 'nginx-container')].image}"

# Go Template(가장 유연한 출력 방식. 여기서는 모든 파드의 이름과 파드 안에서 기동 중인 각 컨테이너 이미지를 표시)
$ kubectl get pods -o go-template="{{range .items}}{{.metadata.name}}:{{range .spec.containers}}{{.image}}{{end}} {{end}}"

# 노드 목록 표시
$ kubectl get nodes

# 생성된 모든 종료의 리소스를 표시 (시크릿/컨피그맵/인그레스는 제외)
$ kubectl get all

# --watch 옵션을 사용하여 리소스 상태의 변화가 있을 때 결과를 계속 출력
$ kubectl get pods --watch

# --output-watch-events 옵션을 사용하면 해당 리소스가 API처럼 어떤 처리가 되었는지 이벤트 정보도 함께 표시할 수 있다.
$ kubectl get pods --watch --output-watch-events
```


## 4.5.14 리소스 상세 정보 가져오기: describe


```sh
# 파드 상세 정보 표시
$ kubectl describe pod sample-pod

# 노드 상세 정보 표시
$ kubectl describe node 
```


## 4.5.15  실제 리소스 사용량 확인: top


`kubectl describe` 명령어에서 확인할 수 있는 리소스 사용량은 쿠버네티스가 파드에 확보한 값을 타나낸다. 실제 파드 내부의 컨테이너가 사용하고 있는 리소스 사용량은 `kubectl top`명령어를 사용하여 확인할 수 있다. 리소스 사용량은 노드와 파드 단위로 확인한다. 또, `kubectl top`명령어는 `metric-server`라는 추가 구성 요소를 사용한다. 일반적인 쿠버네티스 환경이라면 배포되겠지만, 배포되지 않을 경우에는 수동으로 배포해야 한다.


```sh
# 노드 리소스 사용량 확인
$ kubectl top node
error: Metrics API not available
```


그런데 위 명령어 사용 시 위와 같이 에러가 발생하였다. 확인해보니 쿠버네티스를 설치했다고 메트릭스 서버까지 같이 설치되지는 않는 모양이다. 그래서 별도로 설치를 진행하였다.


```sh
# metric 서버 실행
$ kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# kubectl에 접근하여 파드와 노드의 정보를 얻어올 수 있도록 설정 (tls 통신이 가능하도록 수정)
$ kubectl edit deployments.apps -n kube-system metrics-server
```

yaml 파일 내부에서 args 찾아가서 아래 두 설정을 추가한다.
|Arguments|Detail|
|---|---|
|--kubelet-insecure-tls|인증서가 공인 기관에 승인 받지 않아 안전하지 않기 때문에 보안적으로 취약하지만, 무시하겠다는 의미|
|--kubelet-preferred-address-types=InternalIP|kubelet 연결에 사용할 때 사용하는 주소 타입을 지정|


```sh
# 파드별 리소스 사용량 확인
$ kubectl -n kube-system top pod

# 파드 리스트 표시 및 컨테이너별 리소스 사용량 확인
$ kubectl -n kube-system get pods
$ kubectl -n kube-system top pod --containers
```


## 4.5.16 컨테이너에서 명령어 실행: exec


파드 내부의 컨테이너에서 특정 명령어를 실행시키려면 `kubectl exec` 명령어를 사용한다. 이 명령어를 사용하여 /bin/bash 등의 셸을 실행하여 마치 컨테이너에 로그인한 것과 같은 상태를 만들 수 있다. 명령어를 사용하기 전 `--`는 필수로 붙여서 사용해야 한다.


```sh
# 파드 내부의 컨테이너에서 /bin/ls 실행
$ kubectl exec -it sample-pod -- /bin/ls


# 여러 컨테이너에 존재하는 파드의 특정 컨테이너에서 /bin/ls 실행
$ kubectl exec -it sample-pod -c nginx-container -- /bin/ls

# 파드 내부의 컨테이너에서 /bin/bash 실행(종료하려면 exit 실행)
$ kubectl exec -it sample-pod -- /bin/bash

# 파이프 등 특정 문자가 포함된 경우 /bin/bash에 인수를 전달하는 형태로 실행
$ kubectl exec -it sample-pod -- /bin/bash -c "ls -all --classify | grep lib"
```


## 4.5.17 파드에 디버깅용 임시 컨테이너 추가: debug


컨테이너 이미지로 경량의 Distroless나 Scratch 이미지 등을 사용하는 경우 디버깅용 도구 등이 전혀 들어 있지 않기 때문에, 문제가 발생했을 때 `kubectl exec` 명령어를 사용하여 컨테이너 안으로 들어가도 디버깅을 수행하기 어렵다. 이 문제를 해결하기 위해 사용 가능한 것이 `kubectl debug` 명령어이다. 이 명령어는 파드에 추가 임시 컨테이너를 기동하고 그 컨테이너를 사용하여 디버깅이나 트러블슈팅을 수행한다.


```sh
# sample-pod에 임의의 명령어로 디버깅용 컨테이너를 기동하여 접속 (4장에서 생성한 k8s-alpha에서 실행)
$ kubectl debug sample-pod --image=amsy810/tools:v2.0 -it -- bash
```


## 4.5.18 로컬 머신에서 파드로 포트 포워딩: port-forwarding


디버깅 용도 등으로 JMX 클라이언트에서 컨테이너에서 실행 중인 자바 애플리케이션 서버에 접속하거나, 데이터베이스 클라이언트에서 컨테이너에서 기동 중인 MySQL 서버에 접속해야 하는 경우가 있다. 그런 경우 kubectl을 실행하는 로컬 머신에서 특정 파드로 트래픽을 전송하는 `kubectl port-forwarding` 명령어를 사용할 수 있다.


```sh
# localhost:8888에서 파드의 80/TCP 포트로 전송 (종료하려면 Ctrl + C 입력)
$ kubectl port-forward sample-pod 8888:80

# 다른 터미널에서 접속 확인
$ curl -I localhost:8888
```


## 4.5.19 컨테이너 로그 확인: logs


```sh
# 파드 내의 컨테이너 로그 출력
$ kubectl logs sample-pod

# 특정 파드 내의 특정 컨테이너 로그 출력
$ kubectl logs sample-pod -c nginx-container

# 실시간 로그 출력
$ kubectl logs -f sample-pod

# 최근 1시간 이내, 10건의 로그를 타임스탬프와 함께 출력
$ kubectl logs --since=1h --tail=10 --timestamp=true sample-pod

# app=sample-app 레이블을 가진 모든 파드의 로그 출력
$ kubectl logs --selector app=sample-app
```


## 4.5.20 컨테이너와 로컬 머신 간의 파일 복사: cp


```sh
# sample-pod의 /etc/hostname 파일을 로컬 머신에 복사
$ kubectl cp sample-pod:/etc/hostname ./hostname

# hostname 파일 확인
$ cat hostname

# 가져온 로컬 파일을 컨테이너로 복사
$ kubectl cp hostname sample-pod:/tmp/newfile

# 컨테이너의 /tmp를 확인
$ kubectl exec -it sample-pod -- ls /tmp
```


## 4.5.21 kubectl 플러그인과 패키지 관리자: plugin/krew


kubectl에는 하위 명령어가 확장할 수 있도록 플러그인이 준비되어 있다. kubectl 플러그인 관리는 수동으로 할 수 있지만, krew 라는 플러그인 관리자를 통해 관리할 것을 추천한다.


```sh
# krew 설치
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"

# 플러그인 목록 표시
$ kubectl plugin list

# 플러그인 설치
$ kubectl krew install tree rolesum sort-manifests open-svc view-serviceaccount-kubeconfig
```


## 4.5.22 kubectl에서 디버깅


kubectl은 쿠버네티스 마스터의 API와 통신하여 클러스터를 관리한다. 따라서 어떤 에러가 발생했을 때는 API통신이나 kubectl 설정에 문제가 있는 경우가 대부분이다. kubectl 명령어를 실행할 때 -v 옵션으로 로그 레벨을 지정하면 면령어 실행 내용을 좀 더 상세히 볼 수 있다. 리소스 등을 생성했을 때 HTTP Request/Response 내용을 표시하는 경우 -v=6 이상의 로그 레벨로 출력하면 된다.


Request Body/Resposne Body 까지 확인하려면 -v=8 이상의 레벨로 출력한다.


```sh
$ kubectl -v=6 get pod

$ kubectl -v=8 apply -f sample-pod.yaml
```


## kubectl의 기타 팁


### alias 생성


```sh
# kubectl 명령어를 k로 사용할 수 있도록 alias 설정
$ alias k='kubectl'
```


### kube-ps1


kube-ps1은 bash나 zsh의 프롬프트에 현재 작업 중인 쿠버네티스 클러스터와 네임스페이스를 표시한다. 맥 운영체제에서는 brew로 설치할 수 있다. 설치 후에는 다음 표시된 순서로 bashrc나 zshrc에 내용을 추가한다.


```sh
$ brew update
$ brew install kube-ps1
$ source "/opt/homebrew/Cellar/kube-ps1/0.7.0/share/kube-ps1.sh"
$ PS1='$(kube_ps1)'$PS1
$ kubeon

# 프롬프트에 현재 작업 중인 클러스터와 네임스페이스 표시
```


### 파드가 기동하지 않는 경우의 디버깅


쿠버네티스 환경에서 파드가 기동되지 않는 경우에는 디버깅할 때 주로 다음 세 가지 방법이 사용된다.

1. `kubectl logs` 명령어를 사용하여 컨테이너가 출력하는 로그를 확인하는 방법이다. 이 방법은 주로 애플리케이션에 문제가 있을 때 유용하다.
2. `kubectl describe` 명령어로 표시되는 Events 항목을 확인하는 방법이다. 이 방법은 주로 쿠버네티스 설정이나 리소스 설정에 문제가 있을 때 유용하다. 명령어를 실행하면 에러 메시지를 확인할 수 있어 리소스 부족으로 스케줄리 불가능/스케줄링 정책에 해당하는 노드가 없음/볼륨 마운트 실패 등의 원인을 파악 가능하다.
3. 마지막으로 `kubectl run` 명령어를 사용하여 실제 컨테이너 셸로 확인하는 방법이다. 이는 주로 컨테이너 환경이나 애플리케이션에 문제가 있을 때 유용하다. 기동한 애플리케이션이 정지되면 파드도 정지되어 `kubectl exec` 명령어로 셸을 실행할 수 없다. 그런 경우에는 애플리케이션의 `ENTRYPOINT`를 덮어 씌워 일시적으로 컨테이너를 기동시켜 확인할 수 있다.


# 출처
https://m.blog.naver.com/isc0304/221860790762