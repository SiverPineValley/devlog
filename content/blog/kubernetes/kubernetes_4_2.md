---
title: '[쿠버네티스 완벽 가이드] 05. API 리소스와 kubectl (2)'
date: 2022-07-30 18:00:00
category: 'kubernetes'
draft: false
---

## 4.5 커맨드 라인 인터페이스(CLI) 도구 kubectl


쿠버네티스에서 클러스터 조작은 모두 쿠버네티스 마스터의 API를 통해 이루어진다. 직접 API를 호출해도 되지만, 커맨드 라인 인터페이스 도구 kubectl을 사용하여서도 조작이 가능하다.


### 4.5.1 인증 정보와 컨텍스트 (config)


kubectl이 쿠버네티스 마스터와 통신할 때는 접속 대상의 서버 정보, 인증 정보 등이 필요하다. kubectl은 kubeconfig에 쓰여 있는 정보를 사용하여 접속한다. kubeconfig도 매니페스트와 동일한 형식으로 작성된다.


```
apiVersion: v1
kind: Config
preferences: {}
clusters: # 접속할 클러스터
  - name: sample-cluster
    cluster:
      server: https://localhost:6443
users: # 인증 정보
  - name: sample-user
    user:
      client-certificate-data: LS0tLS1CRUdJTi...
      client-key-data: LS0tLS1CRUdJTi...
contexts: # 접속 정보와 인증 정보 조합
  - name: sample-context
    context:
      cluster: sample-cluster
      namespace: default
      user: sample-user
current-context: sample-context
```


위 파일에서 구체적으로 설정이 되어 있는 부분은 clusters, users, contexts 세 가지로, 각각 배열로 되어 있어 여러 항목을 등록할 수 있다. clusters에서는 접속 대상 클러스터 정보, users에서는 인증 정보를 각각 정의한다. 사용자 인증에는 X.509 클라이언트 인증서/토큰/패스워드/웹훅(Webhook) 등 다양한 방식을 사용할 수 있다. contexts에서는 cluster와 user, 네임스페이스를 지정한 것을 정의한다.


kubectl을 사용하면 위처럼 설정을 직접수정하지 않고도 설정을 수정할 수 있다.


```sh
# 클러스터 (prd-cluster) 정의를 추가, 변경
$ kubectl config set-cluster prd-cluster \
--server=https://localhost:6443

# 인증 정보 정의를 추가, 변경
$ kubectl config set-credentials admin-user \
--client-certificate=./sample.crt \
--client-key-./sample.key \
--embed-certs=true

# 컨텍스트 정의(클러스터/인증 정보/네임스페이스 정의)를 추가, 변경
$ kubectl config set-context prd-admin \
--cluster=prd-cluster \
--user=admin-user \
--namespace=default
```

kubectl은 컨텍스트(current-context)를 전환하여 여러 환경을 여러 권한으로 조작할 수 있도록 설계되어 있다. 여기서 user 설정을 추가할 때의 인증서 파일은 [openssl을 사용한 인증서 파일 생성](https://main--devlog-siverpinevalley.netlify.app/cert/openssl/) 문서를 참고하면 생성할 수 있다.


```sh
# 컨텍스트 목록 표시
$ kubectl config get-contexts

# 컨텍스트 전환
$ kubectl config use-context prd-admin

# 현재 컨텍스트 표시
$ kubectl config current-context

# 명령어 실행마다 컨텍스트 지정 가능
$ kindctl --context prd-admin get pod
```


### 4.5.2 kubectx/kubens를 사용한 전환


컨텍스트나 네임스페이스를 전환할 때 kubectl 사용하는 것이 불편하다면, kubectx, kubems를 사용하면 좀 더 쉽게 전환이 가능하다.


```sh
# 컨텍스트 전환
# kubectl config use-context prd-admin
$ kubectx prd-admin

# 바로 전 컨텍스트로 전환
$ kubectx -

# 네임스페이스 전환
# kubectl config set-context prd-admin --namespace=default
$ kubens default

# 컨텍스트 삭제
$ kubecctx -d prd-admin
```


### 4.5.3 매니페스트와 리소스 생성/삭제 갱신


kubectl을 사용하여 실제 매니페스트를 기반으로 컨테이너를 기동해보겠다. 여기서는 하나의 컨테이너를 가진 파드를 sample-pod라는 이름으로 생성해보겠다. 여기서 pod란?


    파드(Pod) 는 쿠버네티스에서 생성하고 관리할 수 있는 배포 가능한 가장 작은 컴퓨팅 단위이다.

    파드 (고래 떼(pod of whales)나 콩꼬투리(pea pod)와 마찬가지로)는 하나 이상의 컨테이너의 그룹이다. 이 그룹은 스토리지 및 네트워크를 공유하고, 해당 컨테이너를 구동하는 방식에 대한 명세를 갖는다. 파드의 콘텐츠는 항상 함께 배치되고, 함께 스케줄되며, 공유 콘텍스트에서 실행된다. 파드는 애플리케이션 별 "논리 호스트"를 모델링한다. 여기에는 상대적으로 밀접하게 결합된 하나 이상의 애플리케이션 컨테이너가 포함된다. 클라우드가 아닌 콘텍스트에서, 동일한 물리 또는 가상 머신에서 실행되는 애플리케이션은 동일한 논리 호스트에서 실행되는 클라우드 애플리케이션과 비슷하다.

    애플리케이션 컨테이너와 마찬가지로, 파드에는 파드 시작 중에 실행되는 초기화 컨테이너가 포함될 수 있다. 클러스터가 제공하는 경우, 디버깅을 위해 임시 컨테이너를 삽입할 수도 있다.

    도커 개념 측면에서, 파드는 공유 네임스페이스와 공유 파일시스템 볼륨이 있는 도커 컨테이너 그룹과 비슷하다.
    출처: https://kubernetes.io/ko/docs/concepts/workloads/pods/


```yaml
apiVersion: v1
kind: Pod
metadata:
    name: sample-pod
spec:
    containers:
    - name: nginx-container
    image: nginx:1.16
```


여기서 리소스를 생성할 때는 kubectl create 명령어를 사용한다.


```sh
# pod 생성
$ kubectl create -f sample-pod.yaml

# pod 목록 표시
$ kubectl get pods

# pod 삭제 (해당 매니페스트 해당하는 pod 모두 삭제)
$ kubectl delete -f sample-pod.yaml

# 특정 리소스만 삭제
$ kubectl delete pod sample-pod

# 특정 리소스 모두 삭제
$ kubectl delete pod -all

# 리소스 삭제 (삭제 완료 대기)
$ kubectl delete -f sample-pod.yaml --wait

# 리소스 즉시 강제 삭제
$ kubectl delete -f sample-pod.yaml --grace-period 0 --force
```

kubectl 명령어 실행은 바로 완료되지만, 실제 쿠버네티스에 의한 리소스 처리는 비동기로 진행되어 바로 완료되지 않는다. --wait 옵션을 사용하면 삭제 완료를 기다렸다가 명령어 실행을 종료할 수 있다.


리소스 업데이트는 다음과 같이 진행할 수 있다. 명령어는  `kubectl apply -f "매니페스트 파일명"` 으로 실행할 수 있고, 같은 이름으로 실행 중인 pod을 교체하거나 생성되지 않은 pod일 경우에는 새롭게 pod을 실행한다.


```sh
# sample-pod.yaml 파일을 sample-pod-old.yaml로 변경
$ cp sample-pod.yaml sample-pod-old.yaml

#  일부 수정한 sample-pod.yaml 변경 사항
$ diff sample-pod.yaml.old sample-pod.yaml

# 변경 사항이 있을 경우
$ kubectl apply -f sample-pod.yaml
pod/sample-pod configured

# 변경 사항이 없을 경우
$ kubectl apply -f sample-pod.yaml
pod/sample-pod unchanged

# 리소스가 존재하지 않을 경우
$ kubectl apply -f sample-pod.yaml
pod/sample-pod created

# sample-pod에서 사용 중인 이미지 확인
$ kubectl get pod sample-pod -o jsonpath="{.spec.containers[?(@.name == 'nginx-container')].image}"
nginx1.17
```


쿠버네티스는 생성한 리소스 상태를 내부에 기록한다. `kubectl apply` 명령어를 통해 대부분 내부 설정을 변경 가능하지만, 일부 변경 불가능한 항목들도 있다. `kubectl apply`는 앞서 설명한 대로 리소스의 생성/변경이 모두 가능하다는 점에서 `kubectl create` 명령어를 대체할 수 있다. `kubectl apply`는 이전에 적용한 매니페스트, 현재 클러스터에 등록된 리소스 상태, 이번에 적용할 매니페스트에서 산출되는데, `kubectl create --save-config`이나 `kubectl apply`를 실행하여 리소스를 생성한 경우에만 리소스의 `metadata.annotations.kubectl.kubernetes.io/last-applied-configuration`에 원라이너의 JSON형식으로 저장된다. 그 이외의 방법으로는 저장되지 않는다. 그 때문에 '이번에 적용할 매니페스트'에서 특정 필드를 삭제할 경우에는 변경 사항을 산출하지 못하고 의도한 대로 반영되지 않는 필드가 발생하게 된다. 이에 생성 시에도 `kubectl apply`를 사용하는 것이 바람직하다.


## 4.5.4 Server-side apply


앞서 배운 `kubectl apply` 명령어는 client-side의 매니페스트를 참고로 적용하는 명령어로, 명령어가 실행되면 server-side의 매니페스트에도 자동적으로 적용된다. 그런데 server-side 매니페스트를 조절하는 명령어에는 `kubectl set image`라는 명령어도 있다. 이 명령어는 server-side의 매니페스트에만 적용되므로, client-side의 명령어와의 형상이 틀어지게 된다. 이때 다시 client-side의 매니페스트를 수정한뒤 `kubectl apply`를 실행하면, `kubectl set image`로 적용했던 부분은 초기화되버린다.


이를 방지하기 위해 `kubectl apply` 명령어에서는 `--server-side` 옵션을 제공한다. server-side apply는 서버측에서 충돌을 감지하여 사용자에게 알려준다. server-side apply 구조는 충돌 감지와 변경 사항 감지를 위한 필드를 관리하는 것으로 구현된다. 필드를 관리하는 요소를 `manager`라고 부르며, `metadata.managedFields`에 manager와 manager가 관리하는 필드가 저장된다.


kubectl 명령에어서 조작한 필드에 대한 manager의 이름은 기본적으로 kubectl로 되어 있다. CI/CD 등에서 사용되는 kubectl과 관리자/운영자가 콘솔에서 사용하는 kubectl이 구분되지 않으면 양쪽 명령어 실행으로 예기치 않은 충돌이 발생하게 된다. 따라서 server-side apply를 활성화한 후 kubectl apply 명령어를 실행할 때 `--field-manager` 옵션을 사용하여 manager 이름을 자유롭게 변경할 수 있다. 이를 사용하면 같은 kubectl에서 조작하는 경우에도 충돌을 감지할 수 있다.


```sh
# server-side apply를 활성화하여 이전 매니펫트 생성
$ kubectl apply -f sample-pod-old.yaml --server-side

# 이미지 변경
$ kubectl set image pod sample-pod nginx-container=nginx:1.17

# server-side apply를 통해 매니페스트 적용
$ kubectl apply -f sample-pod.yaml --server-side

# 충돌(conflict)를 무시하고 매니페스트 적용
$ kubectl apply -f sample-pod.yaml --server-side --force-conflicts

# Manager 이름을 변경하고 변경 내용을 적용 (CI 도구에서 실행한다고 가정)
$ kubectl apply -f sample-pod.yaml --server-side --field-mansger ci-tool

# spec.containers[].image를 nginx:1.16에서 nginx:1.17로 변경
# Image 변경 적용(개발자/운영자) 콘솔에서 실행한다고 가정
$ kubectl apply -f sample-pod.yaml --server-side
```


## 4.5.5 파드 재기동, 롤백


```sh
# 리소스 생성
$ kubectl apply -f sample-deployment.yaml
$ kubectl apply -f sample-pod.yaml

# Deployment 리소스의 모든 파드 재기동
$ kubectl rollout restart deployment sample-deployment

# 리소스와 연결되어 있지 않은 파드는 재기동 안 됨
$ kubectl rollout restart pod sample-pod

# Deployment 직전 리비전으로 롤백
$ kubectl rollout undo deployment echo
```

