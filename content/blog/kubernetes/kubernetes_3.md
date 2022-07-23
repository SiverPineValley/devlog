---
title: '[쿠버네티스 완벽 가이드] 03. 쿠버네티스 환경'
date: 2022-07-23 21:20:12
category: 'kubernetes'
draft: false
---


# 3. 쿠버네티스 환경의 종류


쿠버네티스는 여러 플랫폼 환경에서 클러스터를 구성할 수 있다. 크게는 다음과 같은 세 가지 방법을 고려할 수 있다.

- 로컬 쿠버네티스: 물리 머신 한 대에 구축하여 사용
- 쿠버네티스 구축 도구: 도구를 사용하여 온프레미스/클라우드에 클러스터를 구축하여 사용
- 관리형 쿠버네티스 서비스: 퍼블릭 클라우드의 관리형 서비스로 제공하는 클러스터 사용


쿠버네티스가 제공하는 기능 중에는 쿠버네티스 환경에 따라 일부 사용할 수 없는 기능들도 존재하지만, 기본적으로는 어떤 쿠버네티스 환경에서도 동일하게 동작한다. 이것은 CNCF가 제공하는 인증 프로그램인 쿠버네티스 적합성 인증 프로그램을 준수하도록 각 프로그램이 만들어지기 때문이다.


## 3.1 로컬 쿠버네티스


로컬 쿠버네티스는 물리 머신에서 손쉽게 쿠버네티스를 테스트할 수 있는 방법이다. 한 대의 머신에 올인원으로 구성되어 이중화가 보장되지 않는다.


### 3.1.1 미니 큐브 (Minikube)


미니큐브(Minikube)는 물리 머신에 쿠버니티스를 쉽게 구축하고 실행할 수 있는 도구이다. 주요 특징으로는 단일 노드 구성이라 여러 대의 구성이 필요한 쿠버네티스 기능 등은 사용할 수 없다. 또한, 미니큐브는 로컬 가상 머신에 쿠버네티스를 설치하기 위해 하이퍼바이저가 필요하다.


미니큐브는 하이퍼바이저를 맞는 드라이버를 통해 조작함으로써 자동으로 호스트가 되는 컨테이너나 가상 머신을 생성하고 그 환경에 쿠버네티스를 설치한다.


### 3.1.2 Docker Desktop for Mac/Windows


Docker Desktop for MAC/Windows는 18.06.0 CE부터 로컬 머신에서 쿠버네티스를 사용할 수 있게 되었다. 하지만, 현재는 쿠버네티스 버전을 지정할 수 없으므로 특정 버전을 사용하고 싶은 경우에는 주의해야 한다.


Docker Desktop for MAC/Windows를 설치하고 쿠버네티스를 사용하려면, 기동 후에 Preference에서 쿠버네티스를 활성화해야 한다. 여러 쿠버네티스 클러스터를 사용하는 경우에는 kubectl의 컨텍스트를 전환하여 사용해야 한다.


```shell
$ kubectl config use-context docker-desktop
Switched to context "docker-desktop".
```

kubectl에서는 로컬 머신에 기동 중인 도커 호스트를 쿠버네티스 노드로 인식한다. 또, 쿠버네티스 클러스터 기능을 담당하고 있는 구성 요소 그룹도 컨테이너로 기동된다. 쿠버네티스를 활성화할 때 `Show system containers (advanced)`도 활성화하면 docker container ls 명령어로 구성 요소를 확인할 수 있다.


### 3.1.3 kind


kind는 쿠버네티스 자체 개발을 위한 도구로, 쿠버네티스의 SIG-Testing이라는 분과회에서 만들어졌다. 이름처럼 도커 컨테이너를 여러 개 기동하고 그 컨테이너를 쿠버네티스 노드로 사용하는 것으로, 여러 대로 구성된 쿠버네티스 클러스터를 구축한다. 현재 로컬 환경에서 멀티 노드 클러스터를 구축하려면 kind를 사용하는 것이 가장 좋다.

```shell
# kind 설치
$ brew install kind

# kind 버전 확인
$ kind version
kind v0.10.0 go1.15.7 darwin/amd64
```

아래는 클러스터를 구축하고 구성 설정은 아래 YAML 파일로 관리할 수 있다. 마스터 노드 세 대와 워커 노드 세 대로 구성하였다. 실제로 클러스터를 구축하려면 위 구성 설정 파일을 지정하고, `kind create cluster` 명령어를 실행한다. 클러스터를 구축할 때는 Docker Desktop for Mac/Windows의 도커 환경이 기동되고 있어야 한다.

```yaml
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
  image: kindest/node:v1.18.2
- role: control-plane
  image: kindest/node:v1.18.2
- role: control-plane
  image: kindest/node:v1.18.2
- role: worker
  image: kindest/node:v1.18.2
- role: worker
  image: kindest/node:v1.18.2
- role: worker
  image: kindest/node:v1.18.2
```


여러 쿠버네티스 클러스터를 사용하는 경우에는 kubectl의 컨텍스트를 전환하여 사용해야 한다.


```shell
$ kuberctl config use-context kind-kindcluster
Switched to context "kind-kindcluster".
```

사용하지 않는 kind 클러스터는 다음과 같이 간단히 삭제할 수 있다.


```shell
$ kind delete cluster --name kindcluster
Deleting cluster "kindcluster" ...
```


kind는 내부에서 kubeadm이라는 구축 도구를 사용하며, 구축 시 설정 파일에 대해 패치를 적용하는 kubeadmConfigPatches와 kubeadmConfigPatchesJson6902 등을 사용하여 다양한 클러스터를 구축할 수 있다. 앞라 클러스터를 사용할 때도 이 설정을 사용하여 FeatureGate를 활성화한다.


## 3.2 쿠버네티스 구축 도구


다음으로는 쿠버네티스 구축 도구를 사용하여 환경을 구성하는 방법이다. 로컬 환경과는 다르게, 모두 여러 노드의 쿠버네티스 클러스터를 구축할 수 있다.


### 3.2.1 쿠버니티스 서비스 수준 목표 (SLO)


SIG-Scalability 분과회는 쿠버네티스의 확장성을 논의한다. SIG-Scalability 다음과 같은 서비스 수준 지표(Service Level Indicator, SLI)와 서비스 수준 목표(Service Level Objective, SLO)를 정의하고 있다.


- API 응답 시간
  - 단일 객체의 변경 API 요청에 대해 지난 5분 동안 99%가 1초 내에 돌아올 것(일부 제외)
  - 비스트리밍(non-streaming)의 API 요청에 대해 지난 5분 동안 99%가 아래 초 아내로 돌아올 것(일부 제외)
    - 특정 리소스: 1초
    - 네임스페이스 전체: 5초
    - 클러스터 전체: 30초
  - 파드 기동 시간
    - 지난 5분 동안 99%가 5초 이내에 기동할 것 (이미지 다운로드 시간이나 초기화 컨테이너(Init Container) 처리 시간은 포함되지 않음)


이 서비스 수준 목표를 달성할 수 있는 클러스터 최대 구성 범위는 다음과 같다.


|항목|네임스페이스 단위의 상한|클러스터 전체의 상한|
|---|---|---|
|노드 수|-|5000 노드 이하|
|클러스터 내 총 파드 수|-|150000 파드 이하|
|1 노드당 파드 수|-|110 파드 또는 (코어 수 * 10) 중 낮은 쪽|
|서비스 수|5000 이하|10000 이하|


### 3.2.2 큐브어드민


큐브어드민(kubeadmin)은 쿠버네티스에서 제공하는 공식 구축 도구이다.
설치 및 초기 세팅은 아래와 같다. Ubuntu 환경에서 동작하는 명령어 기준으로 작성되었다.


```sh
# 필요한 의존 패키지 설치
$ sudo apt update && sudo apt install -y apt-transport-https curl

# 저장소 등록 및 업데이트
$ curl -s https://packages.cloud.google.com/apt/doc/apt=key.gpg | sudo apt-key add -
$ cat << EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
$ sudo apt update

# 쿠버네티스 관련 패키지 설치
$ sudo apt install -y kubelet=1.18.15-00 kubeadm=1.18.15-00 kubectl=1.18.15-00 docker.io

# 버전 고정
$ sudo apt-mark hold kubelet kubeadm kubectl docker.io

# 오버레이 네트워크용 커널 파라미터 변경
$ cat << EOF | sudo tee /etc/sysctl.d/k8s.conf

$ sudo sysctl --system
```


다음은 쿠버네티스 마스터로 설정할 노드에 아래 내용을 실행한다. --pod-network-cidr 옵션은 클러스터 내부 네트워크용으로 플라넬을 사용하기 위한 설정이다. 이를 위해 사전에 swap이 비활성화되어 있어야 한다. 일시적으로 비활성화하는 경우에는 `sudo swapoff -a` 명령어를 사용한다. 호스트 OS 재기동 후에도 영구적으로 비활성화하려면 /etc/fstab 파일 내 swap 설정 행의 맨 앞에 #을 추가해야 한다.


```sh
# kubeadm 초기화(쿠버네티스 마스터 구축)
$ sudo kubeadmin init \
--kubernetes-version=1.18.15 \
--pod-network-cidr=172.31.0.0/16
```

쿠버네티스 마스터 설정이 성공하면, 쿠버네티스 노드가 될 노드에서 실행해야할 명령어가 출력되고, 그 명령어를 노드가 될 머신에서 실행한다. 쿠버네티스 노드를 여러 대 추가할 경우 각 노드에 아래 명령어를 실행한다.


```sh
$ sudo kubeadmi join 172.31.2.189:6443 --token zpn5s6.jcx9h6k3a78znd3p
```


kubectl에서 사용할 인증용 파일은 /etc/kubernetes/admin.conf에 있으며, 다음과 같이 kubeinit을 실행한 후 표시되는 명령어만 입력하면 준비가 끝난다.


```sh
$ mkdir -p $HOME/.kube
$ sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
$ sudo chown $(id -u):$(id -g) $HOME/.kube/config
```


여기까지 진행되었다면 각 노드에 마스터/워커 노드로 필요한 쿠버네티스 프로세스가 모두 기동 중인 상태이다. 그러나 이것 만으로는 멀티 노드 쿠버네티스 클러스터라고 말하기에 조금 부족하다. 서로 다른 노드에 배포된 바드 간 통신이 되지 않기 때문이다.


### 3.2.3 플라넬


기본적으로 도커에서 기동한 컨테이너에 할당된 IP는 호스트 외부에서 접근할 수 없다. 이 문제를 해결하고 멀티 쿠버네티스 클러스터가 되기 위해서는 각 호스트의 내부 네트워크 접속성을 확보해야 한다. 이런 네트워크 구성 방법에 플라넬(Flannel)이 있다. 플라넬은 노드 사이를 연결하는 네트워크 가상 터널(오버레이 네트워크)를 구성하여 클러스터 내부 파드 간 통신을 구현한다.


```sh
# 플라넬 배포
kubectl apply -f \
https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
```


### 3.2.4 랜처


랜처(Rancher)는 랜처 랩(Rancher Lab)에서 개발 중인 오픈소스 컨테이너 플랫폼이다. 랜처는 중앙에서 랜처 서버를 기동시키고 관리자는 랜처 서버를 통해 쿠버네티스 클러스터를 구축하고 관리하는 구조이다. 클라우드 프로바이더 환경에 쿠버네티스 클러스터를 구축하는 경우에도 랜처 서버가 클라우드 프로바이더 API를 사용하여 구축 및 관리를 쉽게할 수 있게 해준다.


## 3.3 퍼블릭 클라우드 관리형 쿠버네티스 서비스


퍼블릭 클라우드 관리형 쿠버네티스 서비스는 영구 볼륨이나 로드 밸런서와의 연계 등을 쉽게 사용할 수 있도록 기능을 제공한다.


### 3.3.1 GKE(Google Kubernetes Engine)


GKE는 가장 먼저 출시된 관리형 쿠버네티스 서비스로, 오랜 기간 운영되어 수많은 편리 기능을 제공한다. 릴리스 채널, 노드 자동 업데이트, 노드 자동 복구, 노드 인스턴스 유형을 자동으로 결정하는 노드 자동 프로비저닝 기능 등이 있다. GKE에서는 쿠버네티스 노드로 GCE(Google Computer Engine)을 사용한다. 또한 GCP(Google Cloud Platform)의 여러 기능과 통합되어 있다. 예를 들어 클라우드 로깅과는 기본으로 연계되어 있어 컨테이너의 로그를 수집하게 되어 있다. 이외에도 고가용성을 가진 HTTP 로드 밸런서나 GPU를 사용할 수 있는 것도 장점이다.


또한, GKE는 노드 풀(NodePool) 기능을 제공한다. 이 기능은 쿠버네티스 클러스터 내부 노드에 레이블을 부여하여 그룹핑하는 기능이다. 노드를 그룹핑하여 머신 성능이 다른 노드를 클러스터에 배치하고 레이블을 부여하면 컨테이너 스케줄링 시 배포 제약 조건으로 사용 가능하다. 이외에 노드를 그룹핑하여 워크로드를 분리하거나 어떤 종류의 노드를 어느 정도의 규모로 클러스터를 구성할 것인지에 대해서도 제어가 가능하다.


### 3.3.2 AKS(Azure Kubernetes Service)


AKS는 마이크로소프트 Azure에서 동작하는 관리형 쿠버네티스 서비스이다. 애저 액티브 디렉터리를 쿠버네티스 역할 기반 액세스 제어(RBAC)와 연계하는 기능, AKS 클러스터의 리소스가 부족할 때 버추얼 쿠버렛(Virtual Kubelet)을 사용하여 Azure Container Instances(ACL)에 버스팅(bursting)하는 기능을 제공하고 있으며, AKS 클러스터를 스케일 아웃하는 것이 아니라 ACI에 버스팅하기 때문에 몇 초 안에 기동할 수 있다.


### 3.3.3 EKS(Elastic Kubernetes Service)
EKS는 AWS re:invent 2017에서 발표한 AWS의 관리하여 쿠버네티스 서비스이다.


이렇게 쿠버네티스 환경은 크게 세 가지 방법으로 구분된다.


- 로컬 쿠버네티스: 물리 머신 한 대에 구축하여 사용
- 쿠버니티스 구축 도구: 도구를 사용하여 온프레미스/클라우드에 클러스터를 구축하여 사용
- 관리형 쿠버네티스 서비스: 퍼블릭 클라우드의 관리형 서비스로 제공하는 클러스터 사용