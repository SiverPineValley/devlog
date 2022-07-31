---
title: '[쿠버네티스 완벽 가이드] 06. API 리소스와 kubectl (3)'
date: 2022-07-31 17:00:00
category: 'kubernetes'
draft: true
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

