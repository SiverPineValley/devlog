---
title: '[쿠버네티스 완벽 가이드] 07. 워크로드 API 카테고리 (1) - 파드(Pod)'
date: 2022-08-13 18:00:00
category: 'kubernetes'
draft: false
---


# 5.1 워크로드 API 카테고리란?


다음으로는 쿠버네티스 리소스 중 한 가지인 워크로드 API 카테고리의 리소스들에 대해 살펴보겠다. 워크로드 API 카테고리로 분류된 리소스는 클러스터에 컨테이너를 기동시키기 위해 사용되는 리소스이다. 내부에서 사용되는 리소스를 제외하고, 사용자가 직접 사용하는 리소스는 총 여덟가지 이다. 각 리소스는 파드를 최소 단위로 하여 그것을 관리하는 상위 리소스가 있는 부모 자식 관계로 되어 있다.


- 파드
- 레플리케이션 컨트롤러
- 레플리카 셋
- 디플로이먼트
- 데몬 셋
- 스테이트풀 셋
- 잡
- 크론 잡


# 5.2 파드(Pod)


워크로드 리소스의 최소 단위는 '파드'라고 불리는 리소스이다. 파드는 한 개 이상의 컨테이너로 구성되어 있으며, 같은 파드에 포함된 컨테이너들은 네트워크적으로 격리되어 있지 않고 IP주소를 공유한다. 따라서, 파드 내부의 컨테이너들은 서로 localhost로 통신할 수 있다. 대부분의 경우 하나의 파드에 하나의 컨테이너를 가지지만, 메인 컨테이너와 서브 컨테이너 등 여러 컨테이너를 가질 수 있다. 서브 컨테이너에는 프록시 역할을 하는 컨테이너, 설정값을 동적으로 변화시키는 컨테이너, 로컬 캐시용 컨테이너, SSL용 컨테이너 등을 예로 들 수 있다.


## 5.2.1 파드 디자인 패턴


파드 디자인 패턴에는 크게 세 종류가 있다.


|종류|내용|
|---|---|
|사이드카 패턴(sidecar pattern)|메인 컨테이너에 기능을 추가한다.|
|앰배서더 패턴(ambassador pattern)|외부 시스템과의 통신을 중계한다.|
|어댑터 패턴(adapter pattern)|외부 접속을 위한 인터페이스를 제공한다.|


### 사이드카 패턴


사이드카 패턴은 메인 컨테이너 외에 보조적인 기능을 추가하는 서브 컨테이너를 포함하는 패턴이다. `특정 변경 사항을 감지하여 동적으로 설정을 변경하는 컨테이너`, `깃 저장소와 로컬 스토리지를 동기화하는 컨테이너`, `애플리케이션의 로그 파일을 오브젝트 스토리지로 전송하는 컨테이너` 라는 구성이 자주 사용된다. 파드는 데이터 영역을 공유하고 가지고 있을 수 있기 때문에 데이터와 설정에 관련된 패턴이라고 볼 수 있다.


### 앰배서더 패턴


앰배서더 패턴은 메인 컨테이너가 외부 시스템과 접속할 때 중계하는 역할을 하는 서브 컨테이너이다. 파드에 두 개의 컨테이너가 있어 메인 컨테이너에서 목적지에 localhost를 지정하여 앰버서더 컨테이너로 접속할 수 있다. 앰배서더 컨테이너를 사용하여 외부 시스템과 통신하면 단일 데이터베이스를 사용하거나 샤딩된 분산 데이터베이스를 사용하는 환경 모두에서 특별한 변경 사항 없이 애플리케이션을 느슨한 결합을 유지하며 사용할 수 있다.


### 어댑터 패턴


어댑터 패턴은 서로 다른 데이터 형식을 변환해주는 컨테이너 패턴이다. 예를 들어, 프로메테우스 등의 모니터링 소프트웨어에서는 정의된 형식으로 메트릭을 수집해야 한다. 그러나 대부분의 미들웨어가 제공하는 메트릭 출력 형식은 프로메테우스 메트릭 형식을 지원하지 않는다. 따라서 이러한 경우 어댑터 컨테이너를 사용하면 외부 요청에 맞게 데이터 형식으로 변환하고 데이터를 반환해준다.


## 5.2.2 파드 생성


```sh
# 파드 생성
$ kubectl apply -f sample-pod.yaml
pod/sample-pod created

# 파드 조회
$ kubectl get pods
NAME         READY   STATUS    RESTARTS      AGE
sample-pod   1/1     Running   6 (20m ago)   12d
```


## 5.2.3 두 개의 컨테이너를 포함한 파드 새엇ㅇ


아래의 매니페스트는 nginx와 redis라는 두 개의 컨테이너를 가진 예제이다. redis는 6379/TCP 포트를 바인드한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-2pod
spec:
  containers:
    - name: nginx-container
      image: nginx:1.12
    - name: redis-container
      image: redis:3.2
```


```sh
# 파드 생성
$ kubectl apply -f sample-2pod.yaml
pod/sample-2pod created

# 두 개의 컨테이너를 포함한 파드 확인
$ kubetl get pod -o wide
NAME          READY   STATUS    RESTARTS      AGE   IP           NODE                   NOMINATED NODE   READINESS GATES
sample-2pod   2/2     Running   0             65s   10.244.3.2   kind-cluster-worker    <none>           <none>
sample-pod    1/1     Running   6 (21m ago)   12d   10.244.1.2   kind-cluster-worker2   <none>           <none>
```


파드는 네트워크 네임스페이스를 공유하고 있으므로 (같은 IP 내에서 동작하므로), 같은 포트를 여러 개를 동시에 사용할 수 없다. 파드 내에서는 `containerPort`가 충돌하지 않도록 주의해야 한다.


## 5.2.4 컨테이너 로그인과 명령어 실행


컨테이너 로그인이란 가상 터미널을 생성(-t)하고, 표준 입력을 패스 스루(-i)하면서 /bin/sh를 실행하면 마치 컨테이너에 SSH로 로그인한 상태가 된다. 실제로 컨테이너에 로그인하여 확인하려면 `kubectl exec -it (pod명) -c (컨테이너명) -- /bin/bash`를 실행해야 한다.


```sh
# 컨테이너에 로그인하여 /bin/bash 실행
$ kubectl exec -it sample-pod -c nginx-continer -- /bin/bash

# 확인 작업에 필요한 패키지 설치
root@sample-pod:/# (이후부터는 컨테이너 내부에서 명령어 실행 가능)
$ apt update && apt -y install iproute2 procps

# 컨테이너 내부에서 IP 주소 확인
$ ip a | grep "inet "

# 컨테이너 내부에 LISTEM 포트 확인
ss -napt | grep LISTEN

# 컨테이너 내부 프로세스 확인
$ ps aux
```


## 5.2.5 ENTRYPOINT 명령/CMD 명령과 command/args


도커 파일로 이미지를 생성할 때는 ENTRYPOINT 명령과 CMD 명령을 사용하여 컨테이너 실행 시 명령어를 정의했다. 쿠버네티스에서는 도커용 용어와 다르게 ENTRYPOINT를 command, CMD를 agrs로 보른다. 컨테이너 실행 시 도커 이미지의 ENTRYPOINT와 CMD를 덮어 쓰기하려면 파드 내용 중 `spec.containers[].command`와 `spec.containers[].args`를 지정한다.


아래 이미지를 생성해보면, 컨테이너 내부에서 `/bin/sleep 3600`이 실행 중인지 확인해볼 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-entrypoint
spec:
  containers:
    - name: nginx-container-112
      image: nginx:1.16
      command: ["/bin/sleep"] # ENTRYPOINT를 대체
      args: ["3600"] # CMD를 대체
```

```sh
# 파드 생성
$ kubectl apply -f sample-entrypoint.yaml
pod/sample-entrypoint created

# bash 실행
$ kubectl exec -it sample-entrypoint -- /bin/bash

# procps 설치
root@sample-entrypoint:/# apt update && apt -y install procps

# 실행중인 프로세스 확인
root@sample-entrypoint:/# ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 07:15 ?        00:00:00 /bin/sleep 3600
root          10       0  0 07:15 pts/0    00:00:00 /bin/bash
root         338      10  0 07:16 pts/0    00:00:00 ps -ef
```


## 5.2.6 파드명 제한


파드명에는 RFC1123의 호스트명 규약을 따른 명명 규칙이 있다.


- 이용 가능한 문자는 영문 소문자와 숫자
- 이용 가능한 기호는 '-' 또는 '.'
- 시작과 끝은 영문 소문자


## 5.2.7 호스트의 네트워크 구성을 사용한 파드 기동


쿠버네티스에서 기동한 파드에 할당된 IP 주소는 쿠버네티스 노드의 호스트 IP 주소와 범위가 달라 외부에서 볼 수 없는 IP 주소가 할당된다. 호스트의 네트워크를 사용하는 설정(`spec.hostNetwork`)을 활성화하면 호스트상에서 프로세스를 기동하는 것과 같은 네트워크 구성 (IP 주소, DNS 설정, host 설정 등)으로 파드를 기동시킬 수 있다. `hostNetwork`를 사용한 파드는 쿠버네티스 노드의 IP주소를 사용하는 관계로 포트 번호 충돌을 방지하기 위해 기본적으로 사용하지 않고, 차후 설명할 NodePort 서비스 등으로 해결할 수 있다. 사용할 때는 엣지 환경에서의 사용이나 호스트 측의 네트워크를 감시 또는 제어와 같은 특수 애플리케이션 환경 등에서만 사용하는게 바람직하다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-hostnetwork
spec:
  hostNetwork: true
  containers:
  - name: nginx-container
    image: nginx:1.16
```


```sh
# 파드의 IP 주소 확인
$ kubectl get pod sample-hostnetwork -o wide
NAME                 READY   STATUS    RESTARTS   AGE   IP           NODE                  NOMINATED NODE   READINESS GATES
sample-hostnetwork   1/1     Running   0          50s   172.18.0.5   kind-cluster-worker   <none>           <none>

# 파드가 기동 중인 노드의 IP 주소 확인
$ kubectl get node kind-cluster-worker -o wide
NAME                  STATUS   ROLES    AGE   VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE       KERNEL-VERSION     CONTAINER-RUNTIME
kind-cluster-worker   Ready    <none>   14d   v1.24.0   172.18.0.5    <none>        Ubuntu 21.10   5.10.76-linuxkit   containerd://1.6.4

# 파드의 DNS 설정 확인
$ kubectl exec -it sample-hostnetwork -- cat /etc/resolv.conf
nameserver 192.168.65.2
options ndots:0
```


## 5.2.8 파드 DNS 설정과 서비스 디스커버리


DNS 서버에 관한 설정(`dnsPolicy`)은 파드 정의 `spec.dnsPolicy`에 설정한다. 설정할 수 있는 값은 아래 네 가지이다.


|설정값|개요|
|---|---|
|ClusterFirst(기본값)|클러스터 내부 DNS에 질의하여 해석되지 않으면 업스트림(upstream)에 질의한다.|
|None|파드 정의 내에서 정적으로 설정한다.|
|Default|파드가 구동하는 쿠버네티스 노드의 /etc/resolv.conf를 상속받는다.|
|ClusterFirstWithHostNet|ClusterFirst의 동작과 같다(hostNetwork 사용 시 설정)|


### ClusterFirst(기본값)


일반적으로 파드는 클러스터 내부 DNS를 사용하여 이름을 해석한다. 이는 서비스 디스커버리나 클러스터 내부 로드밸런싱을 위함이다. `dnsPolicy`가 `ClusterFirst`인 경우 클러스터 내부의 DNS 서비스에 질의하고, 클러스터 내부 DNS에서 해석이 안 되는 도메인에 대해서는 업스트림 DNS 서버에 질의한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-dnspolicy-clusterfirst
spec:
  dnsPolicy: ClusterFirst
  containers:
  - name: nginx-container
    image: nginx:1.16
```


```sh
$ kubectl apply -f sample-dnspolicy-clusterfirst.yaml
pod/sample-dnspolicy-clusterfirst created

$ kubectl exec -it sample-dnspolicy-clusterfirst -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```


### None


DNS 서버를 수동으로 설정하려면 `spec.dnsPolicy: None`이라고 설정한 후 `dnsConfig`에 설정하고 싶은 값을 작성하면 된다. 정적으로 외부 DNS 서버만 설정하면 클러스터 내부 DNS를 사용한 서비스 디스커버리는 사용할 수 없게 된다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-dnspolicy-none
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 8.8.4.4
    searches:
    - example.com
    options:
    - name: ndots
      value: "5"
  containers:
  - name: nginx-container
    image: nginx:1.16
```


```sh
$ kubectl exec -it sample-dnspolicy-none -- cat /etc/resolv
search example.com
nameserver 8.8.8.8
nameserver 8.8.4.4
options ndots:5
```


## Default


쿠버네티스 노드의 DNS 설정을 그대로 상속받는 경우 `spec.dnsPolicy: Default`로 설정한다. dnsPolicy의 기본값은 Default가 아니므로 주의하자.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-dnspolicy-default
spec:
  dnsPolicy: Default
  containers:
  - name: nginx-container
    image: nginx:1.16
```


```sh
$ kubectl exec -it sample-dnspolicy-none -- cat /etc/resolv
nameserver 192.168.65.2
options ndots:0
```


### ClusterFirstWithHostNet


`hostNetwork`를 사용한 파드에 클러스터 내부의 DNS를 참조하고 싶은 경우에는 `spec.dnsPolicy: ClusterNetworkWithHostNet`을 설정한다. `hostNetwork`를 사용하는 경우 기본값 ClusterFirst의 설정값은 무시되고 쿠버네티스 노드의 네트워크 설정(DNS 설정 포함)이 사용되기 때문에 명시적으로 `ClusterFirstWithHostNet`을 지정하도록 하자.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-dnspolicy-clusterfirstwithhostnet
spec:
  dnsPolicy: ClusterFirstWithHostNet
  hostNetwork: true
  containers:
  - name: nginx-container
    image: nginx:1.16
```


```sh
# 경합하는 파드 삭제
$ kubectl delete pod sample-hostnetwork

# 컨테이너 내부의 DNS 설정 파일 
$ kubectl exec -it sample-dnspolicy-clusterfirstwithhostnet -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```


## 5.2.9 정적 호스트명 해석 설정: /etc/hosts


리눅스 운영체제에서는 DNS로 호스트명을 해석하기 전에 /etc/hosts 파일로 정적 호스트명을 해석한다. 쿠버네티스에서는 파드 내부 모든 컨테이너에 /etc/hosts를 변경하는 기능이 준비되어 있으며 `spec.Aliases`로 지정하여 사용할 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-hostaliases
spec:
  containers:
    - name: nginx-container
      image: nginx:1.12
  hostAliases:
  - ip: 8.8.8.8
    hostnames:
    - google-dns
    - google-public-dns
```


```sh
$ kubectl exec -it sample-hostaliases -- cat /etc/hosts
# Kubernetes-managed hosts file.
127.0.0.1	localhost
::1	localhost ip6-localhost ip6-loopback
fe00::0	ip6-localnet
fe00::0	ip6-mcastprefix
fe00::1	ip6-allnodes
fe00::2	ip6-allrouters
10.244.3.5	sample-hostaliases

# Entries added by HostAliases.
8.8.8.8	google-dns	google-public-dns
```


## 5.2.10 작업 디렉터리 설정


컨테이너에서 동작하는 애플리케이션의 작업 디렉터리(Working Directory)는 도커 파일의 WORKDIR 명령 설정을 따르지만, `spec.containers[].workingDir`로 덮어 쓸 수도 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-workingdir
spec:
  containers:
  - name: nginx-container
    image: nginx:1.16
    workingDir: /tmp
```


실제로 workingDir를 설정한 경우 프로세스가 실행되는 디렉터리가 변경된 것을 확인할 수 있다.


```sh
# workingDir: 미지정
$ kubectl exec it sample-pod -- pwd
/

# workingDir: /tmp로 설정
$ kubectl exec -it sample-workingdir -- pwd
/tmp
```

