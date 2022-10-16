---
title: '[쿠버네티스 완벽 가이드] 15. 컨피그 & 스토리지 API 카테고리 (1) - 환경변수, 시크릿, 컨피그맵'
date: 2022-10-16 20:00:00
category: 'kubernetes'
draft: false
---


# 7.1 컨피그 & 스토리지 API 카테고리


컨피그 & 스토리지 API 카테고리는 컨테이너에 대한 설정 파일, 패스워드 같은 기밀 정보를 추가하거나 영구 볼륨을 제공하기 위한 리소스이다.


- 시크릿
- 컨피그맵
- 영구 볼륨 클레임


# 7.2 환경 변수 사용


쿠버네티스에서 개별 컨테이너의 설정 내용은 환경 변수나 파일이 저장되어 있는 영역을 마운트하여 전달하는 것이 일반적이다. 환경 변수를 전달할 때는 파드 템플릿에 `env` 또는 `envForm`을 사용한다. 크게 아래 다섯가지 정보를 환경 변수에 저장한다.


- 정적 설정
- 파드 정보
- 컨테이너 정보
- 시크릿 리소스 기밀 정보
- 컨피그맵 리소스 설정값


## 7.2.1 정적 설정


정적 설정에서는 그 이름 그대로 `spec.containers[].env`에 정적인 값을 설정한다. 컨테이너 내부에 보면 환경 변수가 설정된 것을 확인할 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      env:
        - name: MAX_CONNECTION
          value: "100"
```


```sh
# sample-env 파드의 환경 변수 확인
$ kubectl exec -it sample-env -- env | grep MAX_CONNECTION
MAX_CONNECTION=100
```


## 7.2.2 파드 정보


어떤 노드에서 파드가 기동하고 있는지와 파드 자신의 IP 주소, 기동 시간 등 파드에 관한 정보는 `spec.containers[].env.valueFrom.fieldRef`를 사용하면 참조할 수 있다. 이번에는 기동 중인 쿠버네티스 노드 이름을 `K8S_NODE` 환경 변수로 등록해보자. 위에서 출력한 YAML 형식에 따라 키를 지정하기 위해 `spec.nodeName`을 지정한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env-pod
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      env:
        - name: K8S_NODE
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```


```sh
# 파드가 기동 중인 노드 확인
$ kubectl get pods -o wide sample-env-pod
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE                   NOMINATED NODE   READINESS GATES
sample-env-pod   1/1     Running   0          46s   10.244.3.4   kind-clusetr-worker2   <none>           <none>

# sample-env-pod 환경 변수 'K8S_NODE' 확인
$ kubectl exec -it sample-env-pod -- env | grep K8S_NODE
K8S_NODE=kind-clusetr-worker2
```


## 7.2.3 컨테이너 정보


컨테이너 리소스 정보는 `spec.containers[].env.valueFrom.resourceFieldRef`를 통해 확인할 수 있다. 파드에는 여러 컨테이너 정보가 포함되어 있으므로, 각 컨테이너 정보에 대해서는 `fieldRef`에서 확인할 수 없는 점에 주의해야 한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env-container
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      env:
        - name: CPU_REQUESTS
          valueFrom:
            resourceFieldRef:
              containerName: nginx-container
              resource: requests.cpu
        - name: CPU_LIMITS
          valueFrom:
            resourceFieldRef:
              containerName: nginx-container
              resource: limits.cpu
```


```sh
# sample-env-container 파드에 지정한 CPU_REQUESTS와 CPU_LIMITS 환경 변수 확인
$ kubectl exec -it sample-env-container -- env | grep CPU
CPU_REQUESTS=0
CPU_LIMITS=4
```


## 7.2.4 환경 변수 이용 시 주의 사항


쿠버네티스로 전달되는 환경 변수에는 주의 사항이 있다. 예를 들어, 아래 파드 매니페스트를 보면, 환경 변수가 설정되고 컨테이너가 기동된 후 '100'과 '호스트명'이 출력될 것 처럼 보인다. 그러나, 이 파드를 기동하면 [${TESTENV}, ${HOSTNAME}]이라는 문자열이 그대로 출력된다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env-fail
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      command: ["echo"]
      args: ["${TESTENV}", "${HOSTNAME}"]
      env:
        - name: TESTENV
          value: "100"
```


쿠버네티스에서 `command`나 `args`로 실행할 명령어를 지정할 때는 일반적인 방식으로 환경 변수를 사용할 수 없다. 파드 매니페스트 내부에 정의된 환경 변수에만 `$(TESTENV)`라는 형태로 불러올 수 있다. 이에 따라 매니페스트 파일을 수정하면 다음과 같다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env-fail2
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      command: ["echo"]
      args: ["$(TESTENV)", "$(HOSTNAME)"]
      env:
        - name: TESTENV
          value: "100"
```


```sh
# 일부 환경 변수가 설정되지 않음
$ kubectl logs sample-env-fail2
100 $(HOSTNAME)
```


어디까지나 `command`나 `args`에서 참조 가능한 것은 그 파드의 매니페스트 내부에 정의된 환경 변수만이다. 만약 OS에서만 참조할 수 있는 환경 변수를 사용하는 경우 `Entrypoint(spec.containers[].command)`를 entrypoint.sh 등의 셸 스크립트로 하여 셸 스크립트 내부에서 처리할 수 있도록 한다.


여기서는 정적 환경 변수(TESTENC=100)를 예제로 설명했다. 시크릿이나 컨피그맵에서 정의한 env, 파드나 컨테이너 정보를 `fieldRef`나 `resourceFieldRef`에서 참조한 env도 마찬가지로 [$(SOME_ENVIRONMENT)] 형식으로만 사용할 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-env-fail3
  labels:
    app: sample-app
spec:
  containers:
    - name: nginx-container
      image: nginx:1.16
      command: ["echo"]
      args: ["$(K8S_NODE)", "${K8S_NODE}"]
      env:
      - name: K8S_NODE
        valueFrom:
          fieldRef:
            fieldPath: spec.nodeName
```


```sh
# 외부 정보를 바탕으로 정의된 환경 변수 사용
$ kubectl logs sample-env-fail3
kind-clusetr-worker ${K8S_NODE}
```


# 7.3 시크릿


시크릿은 아래와 같이 몇 가지 타입으로 나눌 수 있다.


|종류|개요|
|---|---|
|Opaque|일반적인 범용 용도|
|kubernetes.io/tls|TLS 인증 사용|
|kubernetes.io/basic-auth|기본 인증용|
|kubernetes.io/dockerconfigjson|도커 레지스트리 인증 정보용|
|kubernetes.io/ssh-auth|SSH 인증 정보용|
|kubernetes.io/service-account-token|서비스 어카운트 토큰용|
|kubernetes.io/token|Bootstrap 토큰용|


## 7.3.1 일반적인 범용 용도의 시크릿 (Opaque)


일반적인 스키마리스 시크릿을 생성하는 경우 타입에 Opaque를 지정한다. 생성 방법에는 다음과 같은 네 가지 패턴이 있다.


- kubectl로 파일에서 값을 참조하여 생성 (--from-file)
- kubectl로 envfile에서 값을 참조하여 생성 (--from-env-file)
- kubectl로 직접 값을 전달하여 생성 (--from-literal)
- 매니페스트에서 생성 (-f)


시크릿 리소스에서는 하나의 시크릿 안에 여러 키-밸류 값이 저장된다. 하나의 시크릿당 저장 가능한 데이터 사이즈는 총 1MB이다. 예를 들어, 데이터베이스 인증 정보를 생성하는 경우 시크릿명은 `db-auth`, key는 `username`, `password` 두 가지를 지정한다. 물론 쿠버네티스 클러스터 내부에서 여러 데이터베이스 인증 정보를 사용하는 경우도 있으므로, 이런 경우 시크릿명을 유니크한 이름으로 정의하거나 시스템별로 네임스페이스를 분리해야 한다.


### kubectl로 파일에서 값을 참조하여 생성 (--from-file)


kubectl을 사용하여 파일에 값을 참조함으로써 생성하는 경우에는 `--from-file` 옵션을 지정한다. 일반적으로 파일명이 그대로 키가 되기 때문에 확장자는 붙이지 않는 것이 좋다. 확장자를 붙이는 경우 `--from-file=username=username.txt`와 같이 지정한다. 또한, 파일 생성 시 개행 코드가 들어가지 않도록 주의한다.


```sh
# 시크릿에 포함된 값을 파일로 내보내기
$ echo -n "root" > ./username
$ echo -n "rootpassword" > ./password

# 파일에서 값을 참조하여 시크릿 생성
$ kubectl create secret generic --save-config sample-db-auth \
--from-file=./username --from-file=./password
secret/sample-db-auth created

# 시크릿 확인 (base64 인코드)
$ kubectl get secrets sample-db-auth -o json | jq .data
kubectl get secrets sample-db-auth -o json | jq .data
{
  "password": "cm9vdHBhc3N3b3Jk",
  "username": "cm9vdA=="
}

# 일반 텍스트로 변경하려면 base64로 디코드가 필요하다.
$ kubectl get secrets sample-db-auth -o json | jq -r .data.username | base64 --decode
root
```


### kubectl로 envfile에서 값을 참조하여 생성(--from-env-file)


하나의 파일에서 일괄적으로 생성하는 경우에는 envfile로 생성하는 방법도 있다. 도커에서 `--env-file` 옵션을 사용하여 컨테이너를 기동한 경우 이 방법을 사용하면 그대로 시크릿을 이관할 수 있다.


```
username=root
password=rootpassword
```


```sh
# envfile로 시크릿 생성
$ kubectl create secret generic --save-config sample-db-auth \
--from-env-file ./env-secret.txt
secret/sample-db-auth created
```


### kubectl로 값을 직접 전달하여 생성(--from-literal)


```sh
# 직접 옵션으로 값을 지정하여 시크릿 생성
$ kubectl create secret generic --save-config sample-db-auth \
--from-literal=username=root --from-literal=password=rootpassword
secret/sample-db-auth created
```


### 매니페스트에서 생성(-f)


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sample-db-auth
type: Opaque
data:
  username: cm9vdA== # root
  password: cm9vdHBhc3N3b3Jk # rootpassword
```


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sample-db-auth-nobase64
type: Opaque
stringData:
  username: root
  password: rootpassword
```

매니페스트에서 생성하는 경우 base64로 인코드한 값을 매니페스트에 추가한다. base64 인코드되지 않은 경우 `stringData` 필드를 사용하여 일반 텍스트로 작성할 수 있다.


## 7.3.3 TLS 타입 시크릿


인증서로 사용할 시크릿을 생성하는 경우 `type`에 `tls`를 지정한다. TLS 타입의 시크릿은 인그레스 리소스 등에서 사용하는 것이 일반적이다. TLS 타입의 시크릿도 매니페스트로 생성할 수 있지만, 기본적으로 비밀키와 인증서 파일을 생성하는 것을 추천한다.


```sh
# 자체 서명된 인증서 생성
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout ~/tls.key -out ~/tls.crt -subj "/CN=sample1.example.com"

# TLS 시크릿 생성
$ kubectl create secret tls --save-config tls-sample --key ./tls.key --cert ./tls.crt
secret/tls-sample created
```


## 7.3.4 도커 레지스트리 타입의 시크릿


사용하고 있는 컨테이너 레지스트리가 프라이빗 저장소인 경우, 도커 이미지를 가져오려면 인증이 필요하다. 쿠버네티스에서는 이 인증 정보를 시크릿으로 정의하여 사용할 수 있다. 도커 인증용 시크릿을 생성하는 경우 `type`에 `docker-registry`를 지정한다.


### kubectl로 직접 생성


```sh
# 도커 레지스트리 인증 정보의 시크릿 생성
$ kubectl create secret docker-registry --save-config sample-registry-auth \
--docker-server=REGISTRY_SERVER \
--docker-username=REGISTRY_USER \
--docker-password=REGISTRY_USER_PASSWORD \
--docker-email=REGISTRY_USER_EMAIL
secret/sample-registry-auth created

# base64로 인코드된 dockercfg 형식의 JSON 데이터
$ kubectl get secrets -o json sample-registry-auth | jq .data
{
  ".dockerconfigjson": "eyJhdXRocyI6eyJSRUdJU1RSWV9TRVJWRVIiOnsidXNlcm5hbWUiOiJSRUdJU1RSWV9VU0VSIiwicGFzc3dvcmQiOiJSRUdJU1RSWV9VU0VSX1BBU1NXT1JEIiwiZW1haWwiOiJSRUdJU1RSWV9VU0VSX0VNQUlMIiwiYXV0aCI6IlVrVkhTVk5VVWxsZlZWTkZVanBTUlVkSlUxUlNXVjlWVTBWU1gxQkJVMU5YVDFKRSJ9fX0="
}

# base64로 디코드한 dockercfg 형식의 JSON 데이터
$ kubectl get secrets sample-registry-auth -o yaml | grep "\.dockerconfigjson" | awk -F' ' '{print $2}' | base64 --decode
{"auths":{"REGISTRY_SERVER":{"username":"REGISTRY_USER","password":"REGISTRY_USER_PASSWORD","email":"REGISTRY_USER_EMAIL","auth":"UkVHSVNUUllfVVNFUjpSRUdJU1RSWV9VU0VSX1BBU1NXT1JE"}}}
```


### 이미지 다운로드 시 시크릿 사용


인증이 필요한 도커 레지스트리의 프라이빗 저장소에 저장된 이미지를 다운로드 하는 경우, 시크릿을 사전에 생성한 후 파드 정의 `spec.imagePullSecrets`에 docker-registry 타입의 시크릿을 지정해야 한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-pull-secret
spec:
  containers:
    - name: secret-image-container
      image: REGISTRY_NAME/secret-image:latest
  imagePullSecrets:
    - name: sample-registry-auth
```


## 7.3.5 기본 인증 타입 시크릿


사용자명과 패스워드로 인증하는 시스템을 사용하는 경우 기본 인증용 스키마를 가진 시크릿을 생성한다.


### kubectl로 직접 값을 전달하여 생성(--from-literal)


kubectl로 직접 값을 전달하여 생성하려면 `--from-literal` 옵션을 사용한다. 기본 인증 타입은 `--type` 옵션에서 지정한다.


```sh
# 직접 옵션에서 type과 함께 지정하여 생성
$ kubectl create secret generic --save-config sample-basic-auth \
--type kubernetes.io/basic-auth \
--from-literal=username=root --from-literal=password=rootpassword
```


### 매니페스트에서 생성(-f)


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sample-basic-auth
type: kubernetes.io/basic-auth
data:
  username: cm9vdA== # root
  password: cm9vdHBhc3N3b3Jk # rootpassword
```


## 7.3.6 SSH 인증 타입의 시크릿


비밀키로 인증하는 시스템을 사용하는 경우 SSH 인증용 스키마를 가진 시크릿을 생성한다.


### kubectl로 파일에서 값을 참조하여 생성(--from-file)


비밀키 파일은 크기 때문에 Opaque 타입처럼 --from-file 옵션을 사용하여 생성하는 것이 좋다. 그리고 SSH 인증 타입은 --type 옵션에서 지정한다. 또한, 리소스를 생성하지 않고 매니페스트를 출력하는 경우 `--dry-run`, `-o yaml` 옵션을 함께 사용한다.


```sh
# SSH 비밀키 생성
$ ssh-keygen -t rsa -b 2048 -f sample-key -C "sample"

# 파일에서 type과 값을 참조하여 시크릿 생성
$ kubectl create secret generic --save-config sample-ssh-auth \
--type kubernetes.io/ssh-auth \
--from-file=ssh-privatekey=./sample-key
secret/sample-ssh-auth created
```


### 매니페스트에서 생성(-f)


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sample-ssh-auth
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: LS0tLS1CRUdJTi...
```


## 7.3.7 시크릿 사용


시크릿을 컨테이너에서 사용할 경우 다음과 같이 크게 두 패턴으로 나뉜다.


- 환경 변수로 전달: 시크릿의 특정 키만, 시크릿의 전체 키
- 볼륨으로 마운트: 시크릿의 특정 키만, 시크릿의 전체 키


### 환경 변수로 전달


환경 변수로 전달할 경우 특정 키만 전달하거나 시크릿 전체를 전달하는 두 가지 방법이 있다. 시크릿의 특정 키를 전달할 경우에는 `spec.containers[].env`의 `valueFrom.secretKeyRef`를 사용하여 지정한다. env로 하나씩 정의하기 때문에 환경 변수명을 지정할 수 있는 것이 특징이다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-secret-single-env
spec:
  containers:
    - name: secret-container
      image: nginx:1.16
      env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: sample-db-auth
              key: username
```


```sh
# sample-seret-single-env 파드의 DB_USERNAME 환경 변수 확인
$ kubectl exec -it sample-secret-single-env -- env | grep DB_USERNAME
DB_USERNAME=root
```


`envFrom`에서 여러 시크릿을 가져오면 키가 충돌할 가능성이 있다. 이런 경우 접두사를 붙여 충돌을 방지할 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-secret-prefix-env
spec:
  containers:
    - name: secret-container
      image: nginx:1.16
      envFrom:
      - secretRef:
          name: sample-db-auth
        prefix: DB1_
      - secretRef:
          name: sample-db-auth
        prefix: DB2_
```


```sh
# sample-secret-prefix-env 파드의 접두사가 DB인 환경 변수 확인
$ kubectl exec -it sample-secret-prefix-env -- env | grep ^DB
DB2_password=rootpassword
DB2_username=root
DB1_password=rootpassword
DB1_username=root
```


### 볼륨으로 마운트


볼륨으로 마운트하는 경우에도 특정 키만 마운트하거나 시크릿 전체를 마운트하는 두 가지 방법이 있다. 시크릿의 특정 키를 사용하는 경우 `spec.volumes[]`의 `secret.items[]`를 사용하여 저장한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-secret-single-volume
spec:
  containers:
    - name: secret-container
      image: nginx:1.16
      volumeMounts:
      - name: config-volume
        mountPath: /config
  volumes:
    - name: config-volume
      secret:
        secretName: sample-db-auth
        items:
        - key: username
          path: username.txt
```


```sh
# sample-secret-single-volume 파드의 /config/username.txt 파일 확인
$ kubectl exec -it sample-secret-single-volume -- cat /config/username.txt
root
```


시크릿 전체를 마운트할 수 있으나, 시크릿에 어떤 값이 저장되어 있는지 매니페스트 정의에서 판단하기 힘든 것이 단점이다.


### 동적 시크릿 업데이트


볼륨 마운트를 사용한 시크릿에서는 일정 기간마다(kubelet의 Sync Loop 타이밍) kubeapiserver로 변경을 확인하고 변경이 있을 경우 파일을 교체한다. 기본 업데이트 주기는 60초로 설정되어 있다. 이 주기를 조정하려면 kubelet의 --sync-frequency 옵션을 지정해야 한다. 또한, 환경 변수를 사용한 시크릿의 경우 파드를 기동할 때 환경 변수가 정해지기 때문에 동적으로 변경할 수 없다.


```sh
# 시크릿에 마운트된 디렉터리 확인
$ kubectl exec -it sample-secret-multi-volume -- ls -la /config
total 4
drwxrwxrwt 3 root root  120 Oct 10 10:49 .
drwxr-xr-x 1 root root 4096 Oct 10 10:49 ..
drwxr-xr-x 2 root root   80 Oct 10 10:49 ..2022_10_10_10_49_22.2776941385
lrwxrwxrwx 1 root root   32 Oct 10 10:49 ..data -> ..2022_10_10_10_49_22.2776941385
lrwxrwxrwx 1 root root   15 Oct 10 10:49 password -> ..data/password
lrwxrwxrwx 1 root root   15 Oct 10 10:49 username -> ..data/username

# 파드의 /config/username 파일 내용 확인
$ kubectl exec -it sample-secret-multi-volume -- cat /config/username
root

# 시크릿 변경 전 경과 시간 확인
$ kubectl get pods sample-secret-multi-volume
NAME                         READY   STATUS    RESTARTS   AGE
sample-secret-multi-volume   1/1     Running   0          94s

# 시크릿 내용 업데이트
$ cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
    name: sample-db-auth
type: Opaque
data:
    # root > admin으로 변경
    username: YWRtaW4=
EOF
secret/sample-db-auth configured

# 시크릿에 마운트된 디렉터리를 확인
$ kubectl exec -it sample-secret-multi-volume -- ls -la /config
total 4
drwxrwxrwt 3 root root  120 Oct 10 10:49 .
drwxr-xr-x 1 root root 4096 Oct 10 10:49 ..
drwxr-xr-x 2 root root   80 Oct 10 10:49 ..2022_10_10_10_49_22.2776941385
lrwxrwxrwx 1 root root   32 Oct 10 10:49 ..data -> ..2022_10_10_10_49_22.2776941385
lrwxrwxrwx 1 root root   15 Oct 10 10:49 username -> ..data/username

# root에서 admin으로 변경됨
$ kubectl exec -it sample-secret-multi-volume -- cat /config/username
admin

# 동적으로 파일이 변경된 후의 경과 시간 확인
$ kubectl get pods sample-secret-multi-volume
NAME                         READY   STATUS    RESTARTS   AGE
sample-secret-multi-volume   1/1     Running   0          4m38s
```

# 7.4 컨피그맵


컨피그맵은 설정 정보 등을 키-밸류 값으로 저장할 수 있는 데이터 저장 리소스이다. 키-밸류 형식 외에도 nginx.conf나 httpd.conf 같은 설정 파일 자체도 저장할 수 있다.


## 7.4.1 컨피그맵 생성


컨피그맵은 Generic 타입의 시크릿과 거의 동일한 방법으로 생성된다.


- kubectl로 파일에서 값을 참조하여 생성 (--from-file)
- kubectl로 직접 값을 전달하여 생성 (--from-literal)
- 매니페스트로 생성 (-f)


### kubectl로 파일에서 값을 참조하여 생성 (--from-file)


이 방식의 경우 일반적으로 파일명이 그대로 키가 된다. 키 이름을 변경하고 싶은 경우에는 `--from-file=nginx.conf=sample-nginx.conf` 등과 같이 지정하면 된다. 컨피그맵 매니페스트는 data가 아닌 binaryData 필드를 사용하여 UTF-8 이외의 데이터를 포함하는 바이너리 데이터를 저장할 수 있다. 쿠버네티스에 직접 등록하는 것이 아니라 매니페스트 파일로 저장하려면 `--dry-run=client -o yaml` 옵션을 사용한다.


```sh
# 파일로 컨피그맵 생성
$ kubectl create configmap --save-config sample-configmap --from-file=./nginx.conf=sample-nginx.conf
configmap/sample-configmap created

# 컨피그맵에 등록된 데이터 확인
$ kubectl get configmaps sample-configmap -o json | jq.data
{
  "sample-nginx.conf": "user  nginx;\nworker_processes  auto;\nerror_log  /var/log/nginx/error.log warn;\npid        /var/run/nginx.pid;\n"
}

# 컨피그맵에 등록된 데이터 확인 (describe)
$ kubectl describe configmaps sample-configmap
Name:         sample-configmap
Namespace:    default
Labels:       <none>
Annotations:  <none>

Data
====
sample-nginx.conf:
----
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;


BinaryData
====

Events:  <none>

$ kubectl create configmap sample-configmap-binary \
--from-file image.jpg \
--from-literal=index.html="Hello, Kubernetes" \
--dry-run=client -o yaml \
> sample-configmap-binary.yaml

$ cat sample-configmap-binary.yaml
apiVersion: v1
binaryData:
  image.jpg: /9j/4AAQSk...
data:
  index.html: Hello, Kubernetes
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: sample-configmap-binary
```


컨피그맵에 저장된 컨텐츠를 웹 서버에서도 사용할 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-binary-webserver
spec:
  containers:
  - name: nginx-container
    image: nginx:1.16
    volumeMounts:
    - name: config-volume
      mountPath: /usr/share/nginx/html
  volumes:
  - name: config-volume
    configMap:
      name: sample-configmap-binary
```


```sh
$ kubectl apply -f sample-configmap-binary-webserver.yaml
pod/sample-configmap-binary-webserver created

# 로컬 머신 8080 포트에서 파드의 80번 포트로 포트 포워딩
$ kubectl port-forward sample-configmap-binary-webserver 8080:80
Forwarding from [::1]:8080 -> 80

# 브라우저로 표시
$ open http://localhost:8080/image.jpg
```


### kubectl로 직접 값을 전달하여 생성(--from-literal)


```sh
$ kubectl create configmap --save-config web-config \
> --from-literal=connection.max=100 --from-literal=connection.min=10
configmap/web-config created
```


### 매니페스트로 생성(-f)


매니페스트로 생성할 경우 시크릿과 다르게 base64로 인코드되지 않고 추가된다. 밸류를 여러 행으로 전달하는 경우 YAML 문법 스타일에 맞춰 `Key: |`등과 같이 다음 행부터 정의한다. 그리고 숫자는 큰따옴표로 둘러싸도록 한다.


```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-configmap
data:
  thread: "16"
  connection.max: "100"
  connection.min: "10"
  sample.properties: |
    property.1=value-1
    property.2=value-2
    property.3=value-3
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log;
    pid /run/nginx.pid;
```


## 7.4.2 컨피그맵 사용


컨피그맵을 컨테이너에서 사용하는 경우 크게 두 가지 방법이 있다.


- 환경 변수로 전달: 컨피그맵의 특정 키만, 컨피그맵의 전체 키
- 볼륨으로 마운트: 컨피그맵의 특정 키만, 컨피그맵의 전체 키


### 환경 변수로 전달


컨피그맵의 특정 키를 전달하는 경우 `spec.containers[].env`의 `valueFrom.configMapKeyRef`를 사용하여 지정한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-single-env
spec:
  containers:
    - name: configmap-container
      image: nginx:1.16
      env:
        - name: CONNECTION_MAX
          valueFrom:
            configMapKeyRef:
              name: sample-configmap
              key: connection.max
```


```sh
# 파드의 CONNECTION_MAX 환경 변수 내용 확인
$ kubectl exec -it sample-configmap-single-env -- env | grep CONNECTION_MAX
CONNECTION_MAX=100
```


컨피그맵 전체 키를 환경 변수로 전달하는 것도 가능하다. 키마다 각각의 env를 지정할 필요가 없다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-multi-env
spec:
  containers:
    - name: configmap-container
      image: nginx:1.16
      envFrom:
      - configMapRef:
          name: sample-configmap
```


### 볼륨으로 마운트


볼륨으로 마운트하는 경우도 특정 키만 마운트하거나 컨피그맵 전체를 마운트하는 두 가지 방법이 있다. 컨피그맵의 특정 키만 마운트할 경우에는 `spec.volumes[]`의 `configMap.items[]`를 사용하여 지정한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-single-volume
spec:
  containers:
    - name: configmap-container
      image: nginx:1.16
      volumeMounts:
      - name: config-volume
        mountPath: /config
  volumes:
    - name: config-volume
      configMap:
        name: sample-configmap
        items:
        - key: nginx.conf
          path: nginx-sample.conf
```


```sh
# 파일로 저장된 컨피그맵 확인
$ kubectl exec -it sample-configmap-single-volume -- cat /config/nginx-sample.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
```


컨피그맵 전체를 지정할 때는 아래와 같은 매니페스트를 사용한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-multi-volume
spec:
  containers:
    - name: configmap-container
      image: nginx:1.16
      volumeMounts:
      - name: config-volume
        mountPath: /config
  volumes:
    - name: config-volume
      configMap:
        name: sample-configmap
```


## 7.4.3 시크릿과 컨피그맵


### 시크릿과 컨피그맵 사용 구분


앞서 설명한 시크릿과 컨피그맵은 모두 설정 정보나 프리셋을 저장한다는 점에서 유사하지만, 시크릿은 기밀 정보를 취급하기 위한 리소스라는 차이점이 있다. 시크릿 데이터는 쿠버네티스 마스터가 사용하는 분산 KVS(Key-Value Store)의 etcd에 저장된다. 실제 시크릿을 사용하는 파드가 있을 경우에만 etcd에서 쿠버네티스 노드로 데이터를 보낸다. 이때 쿠버네티스 노드상에 영구적으로 데이터가 남지 않도록 하기 위해 시크릿 데이터는 메모리상에 구축된 임시 파일 시스템인 tmpfs 영역에 저장된다. 또한, 시크릿이 안전한 이유는 `kubectl` 명령어로 표시했을 때 값이 보기 어렵게 되어 있다는 점이다. 실제로 조회를 해보면 base64로 인코딩되어 사람이 바로 읽을 수 없게 되어 있다.


매니페스트에 저장된 데이터는 base64로 인코드되어 있을 뿐이다. 따라서 그대로 깃 저장소에 업로드하는 것은 피하는 것이 좋다.


### 컨피그맵과 시크릿의 데이터 마운트 시 퍼미션 변경


컨피그맵에 저장된 스크립트를 파드에서 실행하는 경우 컨피그맵 데이터에서 볼륨을 생성할 때 실행 권한을 부여할 수 있다. 시크릿도 작성된 기밀 데이터를 파드에 마운트하는 경우 데이터에서 볼륨을 생성할 때 퍼미션을 부여할 수 있다. 둘 다 기본 값 0644(rw-r--r--)로 마운트된다. 퍼미션은 8진수 표기에서 10진수 표기로 기술해야 한다.


|10진수 표기|8진수 표기|raw 표기|
|---|---|---|
|256|0400|r--------|
|384|0600|rw-------|
|420|0644|rw-r--r--|
|448|0700|rwx------|
|493|0755|rwxr-xr-x|
|511|0777|rwxrwxrwx|


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-configmap-scripts
spec:
  containers:
  - name: configmap-container
    image: nginx:1.16
    command: ["/config/test.sh"]
    volumeMounts:
    - name: config-volume
      mountPath: /config
  volumes:
  - name: config-volume
    configMap:
      name: sample-configmap
      items:
      - key: test.sh
        path: test.sh
        mode: 493 # 0755
```


```sh
$ kubectl apply -f sample-configmap-scripts.yaml
pod/sample-configmap-scripts created

$ kubectl logs sample-configmap-scripts
Hello, Kubernetes
```


아래 매니페스트에서는 시크릿 내부의 모든 데이터를 0400으로 마운트한다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-secret-secure
spec:
  containers:
  - name: secret-container
    image: nginx:1.16
    volumeMounts:
    - name: config-volume
      mountPath: /config
  volumes:
  - name: config-volume
    secret:
      secretName: sample-db-auth
      defaultMode: 256
```


```sh
$ kubectl exec -it sample-secret-secure -- ls -l /config
total 0
lrwxrwxrwx 1 root root 15 Oct 16 08:57 password -> ..data/password
lrwxrwxrwx 1 root root 15 Oct 16 08:57 username -> ..data/username

$ kubectl exec -it sample-secret-secure -- ls -l /config/..data/
total 8
-r-------- 1 root root 12 Oct 16 08:57 password
-r-------- 1 root root  4 Oct 16 08:57 username
```


### 동적 컨피그맵 업데이트


볼륨 마운트를 사용한 컨피그맵에서는 일정 시간마다 kubeapiserver로 변경을 확인하고 변경이 있을 경우 파일을 교체한다. 기본 업데이트 간격은 60초로 설정되어 있다. 이 간격을 조정하기 위해서는 kubelet의 `--sync-frequency` 옵션을 설정한다. 한편 환경 변수를 사용한 컨피그맵은 기동할 때 환경 변수가 정해지기 때문에 동적으로 업데이트를 할 수 없다. 따라서 4장에서 설명한 `kubectl rollout restart` 명령어를 사용하여 파드를 재기동한다.


```sh
# 컨피그맵이 마운트되어 있는 디렉터리 확인
$ kubectl exec -it sample-configmap-multi-volume -- ls -al /config
total 12
drwxrwxrwx 3 root root 4096 Oct 16 09:01 .
drwxr-xr-x 1 root root 4096 Oct 16 09:01 ..
drwxr-xr-x 2 root root 4096 Oct 16 09:01 ..2022_10_16_09_01_08.2265248405
lrwxrwxrwx 1 root root   32 Oct 16 09:01 ..data -> ..2022_10_16_09_01_08.2265248405
lrwxrwxrwx 1 root root   21 Oct 16 09:01 connection.max -> ..data/connection.max
lrwxrwxrwx 1 root root   21 Oct 16 09:01 connection.min -> ..data/connection.min
lrwxrwxrwx 1 root root   17 Oct 16 09:01 nginx.conf -> ..data/nginx.conf
lrwxrwxrwx 1 root root   24 Oct 16 09:01 sample.properties -> ..data/sample.properties
lrwxrwxrwx 1 root root   14 Oct 16 09:01 test.sh -> ..data/test.sh
lrwxrwxrwx 1 root root   13 Oct 16 09:01 thread -> ..data/thread

# 파드의 /config/thread 파일 내용 확인
$ kubectl exec -it sample-configmap-multi-volume -- cat /config/thread
16

# 컨피그맵 변경 전의 경과 시간(AGE)확인
$ kubectl get pods sample-configmap-multi-volume
NAME                            READY   STATUS    RESTARTS   AGE
sample-configmap-multi-volume   1/1     Running   0          88s

# 컨피그맵 업데이트
$ cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-configmap
data:
  thread: "32"
EOF
configmap/sample-configmap configured

# 컨피그맵이 마운트되어 있는 디렉터리 확인
$ kubectl exec -it sample-configmap-multi-volume -- ls -al /config
total 12
drwxrwxrwx 3 root root 4096 Oct 16 09:01 .
drwxr-xr-x 1 root root 4096 Oct 16 09:01 ..
drwxr-xr-x 2 root root 4096 Oct 16 09:01 ..2022_10_16_09_01_08.2265248405
lrwxrwxrwx 1 root root   32 Oct 16 09:01 ..data -> ..2022_10_16_09_01_08.2265248405
lrwxrwxrwx 1 root root   21 Oct 16 09:01 connection.max -> ..data/connection.max
lrwxrwxrwx 1 root root   21 Oct 16 09:01 connection.min -> ..data/connection.min
lrwxrwxrwx 1 root root   17 Oct 16 09:01 nginx.conf -> ..data/nginx.conf
lrwxrwxrwx 1 root root   24 Oct 16 09:01 sample.properties -> ..data/sample.properties
lrwxrwxrwx 1 root root   14 Oct 16 09:01 test.sh -> ..data/test.sh
lrwxrwxrwx 1 root root   13 Oct 16 09:01 thread -> ..data/thread

# 변경된 내용 확인
$ kubectl exec -it sample-configmap-multi-volume -- cat /config/thread
32
```


### 시크릿이나 컨피그맵의 데이터 변경 거부


시크릿이나 컨피그맵은 여러 디플로이먼트 등에서 참조되는 경우가 많고, 변경하게 되면 여러 애플리케이션에 영향을 준다. 시크릿이나 컨피그맵의 `immutable`설정을 변경하면 데이터가 변경되는 것을 방지하고 예상치 못한 시스템 변경도 방지할 수 있다. 변경이 거부된 시크릿이나 컨피그맵의 데이터를 변경하는 경우에는 리소스를 한 번 삭제하고 다시 생성하면 된다. 또, 볼륨으로 마운트하고 있는 경우 파드 재생성이 필요하다. 또한, 설정값 자체를 false로 변경하는 것도 불가능하다.


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sample-secret-immutable
type: Opaque
data:
  username: cm9vdA== # root
  password: cm9vdHBhc3N3b3Jk # rootpassword
immutable: true
```


```sh
$ kubectl patch secret sample-secret-immutable -p '{"data": {"username": "a69nZQ=="}}'
The Secret "sample-secret-immutable" is invalid: data: Forbidden: field is immutable when `immutable` is set
```