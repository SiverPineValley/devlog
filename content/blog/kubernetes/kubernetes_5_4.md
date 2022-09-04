---
title: '[쿠버네티스 완벽 가이드] 10. 워크로드 API 카테고리 (4) - 데몬셋, 스테이트풀셋'
date: 2022-08-28 16:10:00
category: 'kubernetes'
draft: false
---


# 5.5 데몬셋


데몬셋(DaemonSet)은 레플리카셋의 특수한 형태라고 할 수 있는 리소스이다. 레플리카셋은 각 쿠버네티스 노드에 총 N개의 파드를 노드의 리소스 상황에 맞게 배치한다. 그래서 각 노드의 파드 수가 동일하다고 할 수 없으며, 모든 노드에 반드시 배치된다고도 할 수 없다. 그러나 대몬셋은 각 노드에 파드를 하나씩 배치하는 리소스이다. 따라서 데몬셋은 레플리카 수를 지정할 수 없고 하나의 노드에 두 개의 파드를 배치할 수도 없다. 쿠버네티스 노드를 늘렸을 때에도 데몬셋의 파드는 자동으로 늘어난 노드에서 기동한다. 따라서 데몬셋은 각 파드가 출력하는 로그를 호스트 단위로 수집하는 플루언트디(Fluentd)나, 각 파드 리소스 사용 현황 및 노드 상태를 모니터링하는 데이터독(Datadog)등 모든 노드에서 반드시 동작해야 하는 프로세스를 위해 사용하는 것이 유용하다.


## 5.5.1 데몬셋 생성


```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sample-ds
spec:
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
# 데몬셋 생성
$ kubectl apply -f sample-ds.yaml
daemonset.apps/sample-ds created

$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS       AGE   IP            NODE                   NOMINATED NODE   READINESS GATES
sample-ds-bfjcl                      1/1     Running   0              18s   10.244.1.12   kind-cluster-worker2   <none>           <none>
sample-ds-hfxsm                      1/1     Running   0              18s   10.244.3.13   kind-cluster-worker    <none>           <none>
sample-ds-v57kf                      1/1     Running   0              18s   10.244.2.13   kind-cluster-worker3   <none>           <none>
```


## 5.5.2  데몬셋 업데이트 전략


디플로이먼트와 마찬가지로, 데몬셋 업데이트에서도 두 가지 업데이트 전략 중 하나를 선택할 수 있다.


|업데이트 전략|내용|
|---|---|
|`OnDelete`|데몬셋 매니페스트가 변경되었을 때 파드를 업데이트하지 않고 다른 이유로 파드가 다시 생성될 때 새로운 정의로 파드를 생성한다.|
|`RollingUpdate`|디플로이먼트와 마찬가지로 파드를 업데이트|


### OnDelete


`OnDelete`에서는 데몬셋 매니페스트를 수정하여 이미지 등을 변경하였더라도 기존 파드는 업데이트 되지 않는다. 디플로이먼트와 달리 데몬셋은 모니터링이나 로그 전송과 같은 용도로 많이 사용되기 때문에, 업데이트는 다음 번에 다시 생성할 때나 수동으로 임의의 시점에 하게 되어 있다. 또한, `type` 외에 지정할 수 있는 항목은 없다.


```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sample-ds-ondelete
spec:
  updateStrategy:
    type: OnDelete
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
# 데몬셋 생성
$ kubectl apply -f sample-ds-ondelete.yaml
daemonset.apps/sample-ds-ondelete created

$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS       AGE   IP            NODE                   NOMINATED NODE   READINESS GATES
sample-ds-ondelete-2hnvb             1/1     Running   0              12s     10.244.1.13   kind-cluster-worker2   <none>           <none>
sample-ds-ondelete-65jvc             1/1     Running   0              12s     10.244.3.14   kind-cluster-worker    <none>           <none>
sample-ds-ondelete-8zf5s             1/1     Running   0              12s     10.244.2.14   kind-cluster-worker3   <none>           <none>

# 하나의 파드만 삭제하여 다시 생성
$ kubectl delete pod sample-ds-ondelete-2hnvb
pod "sample-ds-ondelete-2hnvb" deleted

$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS       AGE    IP            NODE                   NOMINATED NODE   READINESS GATES
sample-ds-ondelete-65jvc             1/1     Running   0              79s    10.244.3.14   kind-cluster-worker    <none>           <none>
sample-ds-ondelete-84d27             1/1     Running   0              2s     10.244.1.14   kind-cluster-worker2   <none>           <none>
sample-ds-ondelete-8zf5s             1/1     Running   0              79s    10.244.2.14   kind-cluster-worker3   <none>           <none>
```


### RollingUpdate


데몬셋도 디플로이먼트와 마찬가지로 `RollingUpdate`를 사용한 업데이트가 가능하다. 그러나 데몬셋에서는 하나의 노드에 하나의 파드만 가지므로, 디플로이먼트와 달리 동시에 생성할 수 있는 최대 파드 수(`maxSurge`)를 설정할 수 없다. 동시에 정지 가능한 최대 파드 수(`maxUnavailable`)만 지정할 수 있다. 이 기본값은 1이며 0으로 지정할 수 없다.


# 5.6 스테이트풀셋


스테이트풀셋(statefulSet)도 데몬셋과 마찬가지로 레플리카셋의 특수한 형태라고 할 수 있다. 이름 그대로 데이터베이스 등과 같은 스테이풀한 워크로드에 사용하기 위한 리소스이다. 레플리카셋과 주요 차이점으 다음과 같다.


- 생성되는 파드명의 접미사는 숫자 인덱스가 부여된 것이다. (sample-statefulset-0, sample-statefulset-1, ...)
- 파드명이 바뀌자 않는다.
- 데이터를 영구적으로 저장하기 위한 구조로 되어 있다.
- 이후 설명할 영구 볼륨(PersistentVolume)을 사용하는 경우에는 파드를 재기동할 때 같은 디스크를 사용하여 다시 생성한다.


## 5.6.1 스테이트풀셋 생성


아래 예제 매니페스트는 스테이트풀셋을 생성하는 예제이다. 스테이트풀셋에서는 `spec.volumeClaimTemplates`를 지정하여 스테이트풀셋으로 생성되는 각 파드에 영구 볼륨 클레임을 설정할 수 있다. 영구 볼륨 클레임을 사용하면 클러스터 외부의 네트워크를 통해 제공되는 영구 볼륨을 파드에 연갈할 수 있으므로, 파드를 재기동할 때나 다른 노드로 이동할 때 같은 데이터를 보유한 상태로 컨테이너가 다시 생성된다. 영구 볼륨은 하나의 파드가 소유할 수도 있고, 영구 볼륨 종류에 따라 여러 파드에서 공유할 수도 있다.


```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sample-statefulset
spec:
  serviceName: sample-statefulset
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
          volumeMounts:
          - name: www
            mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 1G
```


```sh
# 스페이풀셋 생성
$ kubectl apply -f sample-statefulset.yaml
statefulset.apps/sample-statefulset created

# 스페이풀셋  확인
$ kubectl get statefulsets
NAME                 READY   AGE
sample-statefulset   3/3     19s

# 파드 목룍 표시
$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS        AGE    IP            NODE                   NOMINATED NODE   READINESS GATES
sample-statefulset-0                 1/1     Running   0               42s    10.244.3.16   kind-cluster-worker    <none>           <none>
sample-statefulset-1                 1/1     Running   0               37s    10.244.2.16   kind-cluster-worker3   <none>           <none>
sample-statefulset-2                 1/1     Running   0               32s    10.244.1.16   kind-cluster-worker2   <none>           <none>

# 스테이트풀셋에서 사용되고 있는 영구 볼륨 클레임 확인
$ kubectl get persistentvolumeClaims
NAME                       STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
www-sample-statefulset-0   Bound    pvc-50b61905-ce6a-4202-a7a1-cb8ac4c1be8b   1G         RWO            standard       104s
www-sample-statefulset-1   Bound    pvc-f4c76eb2-60eb-489f-8941-bada92a9cc19   1G         RWO            standard       99s
www-sample-statefulset-2   Bound    pvc-4672715a-7451-4338-ac29-6031609c6254   1G         RWO            standard       94s

# 스테이트풀셋에서 사용되고 있는 영구 볼륨 확인
$ kubectl get persistentvolume
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                              STORAGECLASS   REASON   AGE
pvc-4672715a-7451-4338-ac29-6031609c6254   1G         RWO            Delete           Bound    default/www-sample-statefulset-2   standard                2m3s
pvc-50b61905-ce6a-4202-a7a1-cb8ac4c1be8b   1G         RWO            Delete           Bound    default/www-sample-statefulset-0   standard                2m12s
pvc-f4c76eb2-60eb-489f-8941-bada92a9cc19   1G         RWO            Delete           Bound    default/www-sample-statefulset-1   standard                2m8s
```


## 5.6.2 스테이트풀셋 스케일링


스테이트풀셋도 레플리카셋, 디플로이먼트와 같은 방법인 `kubectl apply -f` 또는 `kubectl scale`을 사용하여 스케일링할 수 있다.


```sh
# 레플리카 수를 3에서 4로 변경한 매니페스트를 apply
$ sed -i -e 's|replicas: 3|replicas: 4|' sample-statefulset.yaml

$ kubectl apply -f sample-statefulset.yaml
statefulset.apps/sample-statefulset configured

$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS        AGE     IP            NODE                   NOMINATED NODE   READINESS GATES
sample-statefulset-0                 1/1     Running   0               4m48s   10.244.3.16   kind-cluster-worker    <none>           <none>
sample-statefulset-1                 1/1     Running   0               4m43s   10.244.2.16   kind-cluster-worker3   <none>           <none>
sample-statefulset-2                 1/1     Running   0               4m38s   10.244.1.16   kind-cluster-worker2   <none>           <none>
sample-statefulset-3                 1/1     Running   0               18s     10.244.3.18   kind-cluster-worker    <none>           <none>

$ kubectl scale statefulsets sample-statefulset --replicas=5
statefulset.apps/sample-statefulset scaled

$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS        AGE     IP            NODE                   NOMINATED NODE   READINESS GATES
sample-statefulset-0                 1/1     Running   0               5m25s   10.244.3.16   kind-cluster-worker    <none>           <none>
sample-statefulset-1                 1/1     Running   0               5m20s   10.244.2.16   kind-cluster-worker3   <none>           <none>
sample-statefulset-2                 1/1     Running   0               5m15s   10.244.1.16   kind-cluster-worker2   <none>           <none>
sample-statefulset-3                 1/1     Running   0               55s     10.244.3.18   kind-cluster-worker    <none>           <none>
sample-statefulset-4                 0/1     Pending   0               1s      <none>        <none>                 <none>           <none>
```


스테이트풀셋에서 레플리카 수를 변경하여 파드를 생허아고 삭제하면 레플리카셋이나 데몬셋 등과 달리 기본적으로 파드를 동시에 하나씩만 생성하고 삭제하기 때문에 조금 시간이 더 걸린다. 스케일 아웃일 때는 인덱스가 가장 작은 것부터 파드를 하나씩 생성하고 이전에 생성된 파드가 Ready 상태가 되고 나서 다음 파드를 생성하기 시작한다. 반대로 스케일 인일 때는 인덱스가 가장 큰 파드부터 순서대로 삭제된다. 레플리카셋의 경우 파드가 무작위로 삭제되기 때문에 특정 파드가 마스터가 되는 애플리케이션에는 맞지 않는다. 그러나 스테이트풀셋은 0번째 파드가 항상 먼저 생성되고 가장 마지막에 삭제되므로, 0번째 파드를 마스터 노드로 사용하는 이중화 구조 애플리케이션에 적합하다.


## 5.6.4 스테이트풀셋 업데이트 전략


스테이트풀셋에서도 두 가지 업데이트 전략을 사용한다. `OnDelete`, `RollingUpdate`가 그러한데 `RollingUpdate`가 기본적으로 지정된다. `OnDelete`는 데몬셋과 거의 동일하여 `RollingUpdate`에 대해서만 살펴보겠다.


### RollingUpdate


디플로이먼트의 `RollingUpdate`와 다르게, 스테이트풀셋에서는 추가 파드를 생성하여 업데이트할 수 없다. 또한, 동시에 정지 가능한 최대 파드 수(`maxUnavailable`)를 지정하여 롤링 업데이트를 할 수도 없으므로, 파드마다 Ready 상태인지를 확인하고 업데이트를 하게 된다. `spec.podManagementPolicy`가 `Parallel`로 설정되어 있는 경우에도 병렬로 동시에 처리되지 않고 파드가 하나씩 업데이트된다.


스테이트풀셋의 `RollingUpdate`에서는 `partition`이라는 특정 값을 설정할 수 있다. `partition`을 설정하면 전체 파드 중 어떤 파드까지 업데이트할지를 지정할 수 있다. 이 설정을 사용하면 전체에 영향을 주지 않고 부분적으로 업데이트를 적용하고 확인할 수 있어 안전한 업데이트를 할 수 있다. 또한, `Ondelete`오ㅘ 달리 수동으로 재기동한 경우에도 `partition`보다 작은 인덱스를 가진 파드는 업데이트되지 않는다.


```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sample-statefulset-rollingupdate
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 3
  serviceName: sample-statefulset-rollingupdate
  replicas: 5
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


위의 스테이트풀셋을 기동하보면 0~4 인덱스를 가진 다섯 개의 파드가 생성된다. 이 상태에서 스테이트풀셋 이미지를 수정하면 `partition=3`(위에서부터 세 개의 파드는 업데이트 대상 외)이기 때문에 인덱스 4와 인덱스 3인 파드만 업데이트된다.


## 5.6.5 영구 볼륨 데이터 저장 확인


먼저 컨테이너 내부에 영구 볼륨이 마운트되어 있는지를 확인한다. 영구 볼륨을 사용하고 있을 경우 /dev/sdb 등의 별도 디스크(PV)가 마운트되어 있다.


```sh
# 영구 볼륨 마운트 확인
$ kubectl exec -it sample-statefulset-0 -- df -h | grep /dev/sd
/dev/sda1       95G   2.7G          3%  /etc/hosts
/dev/sdb       976M   2.6M          1%  /usr/share/nginx/html

# 마운트된 영구 볼륨에 같은 이름의 파일이 없는지를 확인하고 샘플 파일 생성
$ kubectl exec -it sample-statefulset-0 -- ls /usr/share/nginx/html/sample.html
ls: cannot access '/usr/share/nginx/html/sample.html': No such file or directory
command terminated with exit code 2

# 영구 볼륨에 sample.html 생성
$ kubectl exec -it sample-statefulset-0 -- touch /usr/share/nginx/html/sample.html

# 생성된 파일 확인
$ kubectl exec -it sample-statefulset-0 -- ls /usr/share/nginx/html/sample.html
/usr/share/nginx/html/sample.html

# 예상치 못한 파드 정지 1 (파드 삭제)
$ kubectl delete pod sample-statefulset-0
pod "sample-statefulset-0" deleted

# 예상치 못한 파드 정지2 (nginx 프로세스 정지)
$ kubectl exec -it sample-statefulset-0 -- /bin/bash -c 'kill 1'

# 파드 정지, 복구 이후에도 파일 유실 없음
$ kubectl exec -it sample-statefulset-0 -- ls /usr/share/nginx/html/sample.html
/usr/share/nginx/html/sample.html
```


복구 후 스테이트풀셋 상태를 확인해보면 IP 주소는 변경되었지만, 파드명은 그대로인 것을 알 수 있다.


```sh
# 파드 목록 표시
$ kubectl get pods -o wide
NAME                                 READY   STATUS    RESTARTS       AGE    IP            NODE                   NOMINATED NODE   READINESS GATES
sample-statefulset-0                 1/1     Running   1 (83s ago)    112s   10.244.3.19   kind-cluster-worker    <none>           <none>
sample-statefulset-1                 1/1     Running   0              27m    10.244.2.16   kind-cluster-worker3   <none>           <none>
sample-statefulset-2                 1/1     Running   0              27m    10.244.1.16   kind-cluster-worker2   <none>           <none>
```


## 5.6.6 스테이트풀셋 삭제와 영구 볼륨 삭제


스테이트풀셋에서 지정한 영구 볼륨은 별도로 해제하기 전에는 스테이트풀셋이 삭제되어도 해제되지 않는다. 스테이트풀셋이 영구 볼륨을 해제하기 전에 볼륨에서 데이터를 백업할 수 있도록 시간을 주기 때문이다.


```sh
# 스테이트풀셋 삭제
$ kubectl delete statefulset sample-statefulset
statefulset.apps "sample-statefulset" deleted

# 스테이트풀셋과 연결되는 영구 볼륨 클레임 확인
$ kubectl get persistentvolumeclaims
NAME                       STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
www-sample-statefulset-0   Bound    pvc-50b61905-ce6a-4202-a7a1-cb8ac4c1be8b   1G         RWO            standard       30m
www-sample-statefulset-1   Bound    pvc-f4c76eb2-60eb-489f-8941-bada92a9cc19   1G         RWO            standard       30m
www-sample-statefulset-2   Bound    pvc-4672715a-7451-4338-ac29-6031609c6254   1G         RWO            standard       30m
www-sample-statefulset-3   Bound    pvc-fc2f7918-bd66-4c39-baa3-8d2ccca53a6e   1G         RWO            standard       26m
www-sample-statefulset-4   Bound    pvc-7ee68d8a-c3c4-4053-9cd4-608021b9d5e7   1G         RWO            standard       25m

# 스테이트풀셋에 연결되는 영구 볼륨 확인
$ kubectl get persistentvolumes
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                              STORAGECLASS   REASON   AGE
pvc-4672715a-7451-4338-ac29-6031609c6254   1G         RWO            Delete           Bound    default/www-sample-statefulset-2   standard                31m
pvc-50b61905-ce6a-4202-a7a1-cb8ac4c1be8b   1G         RWO            Delete           Bound    default/www-sample-statefulset-0   standard                31m
pvc-7ee68d8a-c3c4-4053-9cd4-608021b9d5e7   1G         RWO            Delete           Bound    default/www-sample-statefulset-4   standard                25m
pvc-f4c76eb2-60eb-489f-8941-bada92a9cc19   1G         RWO            Delete           Bound    default/www-sample-statefulset-1   standard                31m
pvc-fc2f7918-bd66-4c39-baa3-8d2ccca53a6e   1G         RWO            Delete           Bound    default/www-sample-statefulset-3   standard                26m

# 다시 스테이트풀셋 생성
$ kubectl apply -f sample-statefulset.yaml
statefulset.apps/sample-statefulset created

# 스테이트풀셋을 한 번 삭제한 후에도 영구 볼륨에 sample.html이 있는지 확인
kubectl exec -it sample-statefulset-0 -- ls /usr/share/nginx/html/sample.html
/usr/share/nginx/html/sample.html

# 영구 볼륨 삭제
$ kubectl delete persistentvolumeclaims www-sample-statefulset-{0..4}
persistentvolumeclaim "www-sample-statefulset-0" deleted
persistentvolumeclaim "www-sample-statefulset-1" deleted
persistentvolumeclaim "www-sample-statefulset-2" deleted
persistentvolumeclaim "www-sample-statefulset-3" deleted

# 영구 볼륨 클레임, 영구 볼륨 삭제 확인
$ kubectl get persistentvolumeclaims
No resources found in default namespace.

$ kubectl get persistentvolume
No resources found
```