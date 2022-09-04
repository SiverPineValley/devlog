---
title: '[쿠버네티스 완벽 가이드] 11. 워크로드 API 카테고리 (5) - 잡, 크론잡'
date: 2022-09-04 12:00:00
category: 'kubernetes'
draft: false
---


# 5.7 잡


잡(Job)은 컨테이너를 사용하여 한 번만 실행되는 리소스다. 더 정확히는, N개의 병렬로 실행하면서 지정한 횟수의 컨테이너 실행(정상 종료)을 보장하는 리소스이다. 잡과 레플리카셋의 차이점은 '기동 중인 파드가 정지되는 것을 전제로 만들어졌는지'에 있다. 기본적으로 레플리카셋 등에서 파드의 정지는 예상치 못한 에러다. 반면 잡의 경우는 파드의 정지가 정상 종료되는 작업에 적합하다. 예를 들어 '특정 서버와의 rsync'나 'S3 등의 오브젝트 스토리지에 파일 업로드' 등을 들 수 있다. 레플리카셋 등에서는 정상 종료 횟수 등을 셀 수 없기 때문에 배치 처리인 경우에는 잡을 적극적으로 이용하자.


## 5.7.1 잡 생성


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-job
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 10
  template:
    spec:
      containers:
      - name: sleep-container
        image: amsy810/tools:v2.0
        command: ["sleep"]
        args: ["60"]
      restartPolicy: Never
```

```sh
# 잡 생성
$ kubectl apply -f sample-job.yaml
job.batch/sample-job created

# 잡 목록 표시 (잡 생성 직후)
$ kubectl get jobs
NAME         COMPLETIONS   DURATION   AGE
sample-job   0/1           35s        35s

# 잡이 생성한 파드 확인
$ kubectl get pods --watch
NAME                                 READY   STATUS      RESTARTS      AGE
sample-job-plrnz                     0/1     Completed   0             116s
```


## 5.7.2 restartPolicy에 따른 동작 차이


잡의 매니페스트에는 `spec.template.spec.restartPolicy`에 `OnFailure` 또는 `Never` 중에 하나를 지정해야 한다.


- `Never`: 장애가 발생하면 신규 파드가 생성된다.
- `OnFailure`: 다시 동일한 파드를 사용하여 잡을 다시 시작한다.


### restartPolicy: Never


Docker에서는 `spec.containers[].command`에서 지정한 프로그램은 프로세스 ID=1로 실행된다. 프로세스 ID=1에서 `sleep`명령어를 실행하면 **SIGKILL** 신호를 보내도 프로세스를 정지할 수 없기 때문에 별도 프로세스를 시작하는 형태로 기동해야 한다. 아래 매니페스트로 컨테이너를 생성하고 실제로 컨테이너상의 sleep 프로세스를 정지시켜 보면 신규 파드를 생성하여 잡을 계속 실행하려고 한다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-job-never-restart
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 10
  template:
    spec:
      containers:
      - name: sleep-container
        image: amsy810/tools:v2.0
        command: ["sh", "-c"]
        args: ["$(sleep 3600)"]
      restartPolicy: Never
```


```sh
# 잡이 생성한 파드 확인
$ kubectl get pods
NAME                                 READY   STATUS    RESTARTS      AGE
sample-job-never-restart-xjkgb       1/1     Running   0             27s

# 컨테이너상의 sleep 프로세스 정지
$ kubectl exec -it sample-job-never-restart-xjkgb -- sh -c 'kill -9 `pgrep sleep`'

# 생성된 파드가 기동됨
$ kubectl get pods
NAME                                 READY   STATUS    RESTARTS      AGE
sample-job-never-restart-f6gh9       1/1     Running   0             31s
sample-job-never-restart-xjkgb       0/1     Error     0             107s
```


### restartPolicy: OnFailure


`OnFailure`은 `Never`와 달리 내부 프로세스가 정지되면 RESTARTS 카운터가 증가하고, 사용했던 파드를 다시 사용하여 잡을 실행하려고 한다. 파드가 기동하는 노드나 파드 IP 주소는 변경되지 않지만, 영구 볼륨이나 쿠버네티스 노드의 영역(hostPath)을 마운트하지 않은 경우라면 데이터 자체가 유실된다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-job-onfailure-restart
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 10
  template:
    spec:
      containers:
      - name: tools-container
        image: amsy810/tools:v2.0
        command: ["sh", "-c"]
        args: ["$(sleep 3600)"]
      restartPolicy: OnFailure
```


```sh
# 잡이 생성한 파드 확인
$ kubectl get pods
NAME                                 READY   STATUS    RESTARTS      AGE
sample-job-onfailure-restart-rfpxs   1/1     Running   0             25s

# 파드상의 sleep 프로세스 정지
$ kubectl exec -it sample-job-onfailure-restart-rfpxs -- sh -c 'kill -0 `pgrep sleep`'

# 같은 파드 재시작
$ kubectl get pods
NAME                                 READY   STATUS    RESTARTS      AGE
sample-job-onfailure-restart-rfpxs   1/1     Running   0             85s
```


## 5.7.3 태스크와 작업 큐 병렬 실행


아래 매니페스트에서는 `spec`아래 `completions`, `parallelism`, `backoffLimit`을 설정한다.


- `completions`: 성공 횟수 지정
- `parallelism`: 병렬성 지정
- `backoffLimit`: 실패 허용 횟수


이 설정들은 아주 중요한 파라미터들이며, 잡의 워크로드에 따라 적절히 설정하여 사용하여야 한다. 이 파라미터들 중 `completions`는 나중에 변경할 수 없으나, `parallelism`이나 `backoffLimit`은 도중에 변경할 수 있다. 변경하려면 매니페스트를 수정하고 `kubectl apply` 명령어를 실행한다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-paralleljob
spec:
  completions: 10
  parallelism: 2
  backoffLimit: 10
  template:
    metadata:
      name: sleep-job
    spec:
      containers:
      - name: sleep-container
        image: amsy810/tools:v2.0
        command: ["sleep"]
        args: ["30"]
      restartPolicy: Never
```


### One Shot Task: 1회만 실행하는 태스크


1회만 실행하려면 `completions`=1 / `parallelism`=1 / `backoffLimit`=0 으로 지정한다. 이 경우 실행/성공 횟수가 1이 되면 종료 / 한 개 병렬로 실행 / 실패 횟수가 0이 되면 종료 조건 때문에 성공하던 실패하던 한 번만 실행된다.


### Multi Task: N개 병렬로 실행하는 태스크


`completions`와 `parallelism`을 변경하여 병렬 태스크를 생성할 수 있다. `completions`=5, `parallelism`=3인 경우 먼저 3개가 병렬 실행되어 성공하고나면, 남은 2개의 `completions` 수가 2개라 2개의 병렬만 실행된다.


### Multi WorkQueue: N개 병렬로 실행하는 작업 큐


지금까지의 태스크 잡처럼 개별 파드의 정상 종료가 성공 횟수에 도달할 때까지 실행하는 것이 아니라, 큰 처리 전체가 정상 종료할 때까지 몇 개의 병렬 수로 계속 실행하고 싶은 경우가 있다. 그런 경우 작업 큐의 잡을 사용한다. 작업 큐의 잡은 성공 횟수(`completions`)를 지정하지않고, 병렬 수(`parallelism`)만 지정한다. 이 경우 `parallelism`으로 지정한 병렬 수로 파드를 실행하고, 그 중 하나라도 정상 종료하면 그 이후는 파드를 생성하지 않는다. 또 그때 이미 실행중인 나머지 파드는 강제적으로 정지하지 않고 개별 처리가 종료할 때까지 계속 동작한다.


작업 큐의 잡을 사용하려면 처리 전체의 진행을 관리하기 위한 메시지 큐를 사용해야 한다. 그리고 파드 내의 애플리케이션에는 그 메시지로부터 반복하여 데이터를 계속 가져오는 처리를 구현해 둔다. 또한, 메시지 큐가 빈 것을 확인하면 그 파드를 정상 종료하도록 구현해 둠으로써 작업 큐의 잡에서 전체 처리를 정지할 수 있다.


태스크와 작업 큐는 잡을 표시할 때 **COMPLETIONS**의 출력 형식이 다르다. 앞서 설명한 Multi WorkQueue 예에서는 세 개 중에 하나만 정상 종료되면 되기 때문에 하나도 정상 종료하지 않는 시점에서 0/1 of 3으로 출력된다. 이는 세 개 병렬로 실행 중 하나가 정상 종료하면 되지만 하직 하나도 정상 종료하지 않는 것을 나타낸다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-multi-workqueue-job
spec:
  # 지정하지 않음
  # completions: 1
  parallelism: 3
  backoffLimit: 1
  template:
    metadata:
      name: sleep-job
    spec:
      containers:
      - name: sleep-container
        image: amsy810/tools:v2.0
        command: ["sleep"]
        args: ["30"]
      restartPolicy: Never
```


```sh
# 'Multi Task' 실행 중의 잡 표시
$ kubectl apply -f sample-multi-workqueue-job.yaml
job.batch/sample-multi-workqueue-job created

# 'Multi WorkQueue' 실행 중의 잡 표시
$ kubectl get job sample-multi-workqueue-job
NAME                         COMPLETIONS   DURATION   AGE
sample-multi-workqueue-job   0/1 of 3      9s         9s

# 'Multi WorkQueue' 실행 중의 파드 표시
$ kubectl get pods
NAME                                 READY   STATUS      RESTARTS      AGE
sample-multi-workqueue-job-8vcl9     0/1     Completed   0             83s
sample-multi-workqueue-job-dz5kt     0/1     Completed   0             83s
sample-multi-workqueue-job-v2srb     0/1     Completed   0             83s
```


### Single WorkQueue: 한 개씩 실행하는 작업 큐


Multi WorkQueue의 응용으로 `completions`를 지정하지 않고 `parallelism`에 1을 지정한 경우 한 번 정상 종료할 때까지 한 개씩 실행하는 작업 큐가 된다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-single-workqueue-job
spec:
  # 지정하지 않음
  # completions: 1
  parallelism: 1
  backoffLimit: 1
  template:
    metadata:
      name: sleep-job
    spec:
      containers:
      - name: sleep-container
        image: amsy810/tools:v2.0
        command: ["sleep"]
        args: ["30"]
      restartPolicy: Never
```


## 5.7.4 일정 기간 후 잡 삭제


잡 리소스는 한 번만 실행하는 태스크로 생성하는 경우가 있는데, 잡은 종료 후에 삭제되지 않고 계속 남는다. `spec.ttlSecondsAfterFinished`를 설정하여 잡이 종료한 후 일정 시간 경과 후 삭제하도록 설정할 수 있다.


```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sample-job-ttl
spec:
  # 잡 종료 30초 후 파드 파기
  ttlSecondsAfterFinished: 30
  completions: 1
  parallelism: 1
  backoffLimit: 10
  template:
    spec:
      containers:
      - name: tools-container
        image: amsy810/tools:v2.0
        command: ["sleep"]
        args: ["60"]
      restartPolicy: Never
```


```sh
# Job 상태 모니터링
$ kubectl apply -f sample-job-ttl.yaml
job.batch/sample-job-ttl created

$ kubectl get job sample-job-ttl --watch --output-watch-events
EVENT      NAME             COMPLETIONS   DURATION   AGE
ADDED      sample-job-ttl   0/1           17s        17s        # 잡 기동
MODIFIED   sample-job-ttl   0/1           62s        62s
MODIFIED   sample-job-ttl   1/1           64s        64s        # 잡 완료 (+60초 후)
DELETED    sample-job-ttl   1/1           64s        94s        # 잡 자동 삭제 (+30초 후)

# 삭제되고 나면 job 모니터링 불가
$ kubectl get job sample-job-ttl
Error from server (NotFound): jobs.batch "sample-job-ttl" not found
```


## 5.7.5 매니페스트 사용하지 않고 잡 생성


```sh
# 매니페스트 사용 없이 명령어로 잡 생성
$ kubectl create job sample-job-by-cli \
--image=amsy810/tools:v2.0 \
-- sleep 30
job.batch/sample-job-by-cli created
```


# 5.8 크론잡


크론잡은 크론과 같이 스케줄링된 시간에 잡을 생성한다. 크론잡은 잡의 변형된 형태로 보이지만, 크란잡과 잡의 관계는 디플로이먼트와 레플리카셋의 관계이다. 즉, 크론잡이 잡을 관리하고 잡이 파드를 관리하는 3계층 구조라고 할 수 있다.


## 5.8.1 크론잡 생성


```yaml
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: sample-cronjob
spec:
  schedule: "*/1 * * * *"
  concurrencyPolicy: Allow
  startingDeadlineSeconds: 30
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  suspend: false
  jobTemplate:
    spec:
      completions: 1
      parallelism: 1
      backoffLimit: 0
      template:
        spec:
          containers:
          - name: tools-container
            image: amsy810/tools:v2.0
          restartPolicy: Never
```


```sh
# 크론잡 생성
$ kubectl apply -f sample-cronjob.yaml
Warning: batch/v1beta1 CronJob is deprecated in v1.21+, unavailable in v1.25+; use batch/v1 CronJob
cronjob.batch/sample-cronjob created

# 스케줄 되지 않은 경우 잡이 존재하지 않음
kubectl get cronjobs
NAME             SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
sample-cronjob   */1 * * * *   False     0        <none>          17s

$ kubectl get jobs
No resources found in default namespace.

# LAST SCHEDULE이 업데이트됨
$ kubectl get cronjobs
NAME             SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
sample-cronjob   */1 * * * *   False     1        46s             104s

$ kubectl get jobs
NAME                      COMPLETIONS   DURATION   AGE
sample-cronjob-27704532   0/1           2m29s      2m29s
sample-cronjob-27704533   0/1           89s        89s
sample-cronjob-27704534   0/1           29s        29s
```


## 5.8.2 크론잡 일시 정지


크론잡은 지정한 시간에 잡을 계속 생성한다. 점검이나 어떤 이유로 잡 생성을 원치 않을 경우에는 일시정지할 수 있다. 크론잡에서는 `spec.suspend`가 ture로 설정되어 있으면 스케줄 대상에서 제외된다.


```sh
# 클라이언트에서 크론잡 일시 정지 진행
$ kubectl patch cronjob sample-cronjob -p '{"spec": {"suspend": true}}'
cronjob.batch/sample-cronjob patched

# 크론잡이 일시 정지한 상태
$ kubectl get cronjobs
NAME             SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
sample-cronjob   */1 * * * *   True      6        41s             6m39s
```


## 5.8.3 임의 시점에 크론잡 실행


```sh
$ kubectl create job sample-job-from-cronjob --from cronjob/sample-cronjob
job.batch/sample-job-from-cronjob created
```


## 5.8.4 동시 실행 제어


크론잡에서는 잡을 생성하는 특성상 동시 실행에 대한 정책을 설정할 수 있다. 잡 실행이 의도한 시간 간격 안에서 정상 종료할 때는 명시적으로 지정하지 않아도 동시 실행되지 않고 새로운 잡을 실행한다. 한편 기존 잡이 아직 실행되고 있을 때는 정책으로 새로운 잡을 실행할지 말지 제어하고 싶은 경우가 있다. 동시 실행에 대한 정책은 `spec.concurrencyPolicy`에서 설정한다.


|정책|개요|
|---|---|
|Allow(기본값)|동시 실행에 대한 제한을 하지 않음|
|Forbid|이전 잡이 종료되지 않았을 때는 다음 잡을 실행하지 않음|
|Replace|이전 잡을 취소하고 잡을 시작|


## 5.8.5 실행 시작 기한 제어


크론잡은 지정한 시간이 되면 쿠버네티스 마스터가 잡을 생성한다. 따라서 쿠버네티스 마스터가 일시적으로 정지되는 경우 등과 같이 시작 시간이 지연되면, 그 지연 시간을 허용하는 시간(초, `spec.startingDeadlineSeconds`)을 지정할 수 있다. 기본값에서는 시작 시간이 아무리 늦어져도 잡을 생성하게 되어 있다.


## 5.8.6 크론잡 이력


크론잡 설정 항목에는 이외에도 저장할 잡 개수를 지정하는 `spec.successfulJobsHistoryLimit`와 `spec.failedJobsHistoryLimit`가 있다.


|설정 항목|개요|
|---|---|
|spec.successfulJobsHistoryLimit|성공한 잡을 저장하는 개수|
|spec.failedJobsHistoryLimit|실패한 잡을 저장하는 개수|


이 설정값은 크론잡이 생성할 잡을 몇 개 유지할지를 지정한다. 잡이 남아 있다는 것은 잡에 연결되어 있는 파드도 'Completed(정상 종료)', 'Error(이상 종료)' 의 상태로 남아 있고 `kubectl log` 명령어로 로그를 확인할 수 있다는 의미이다. 만약 두 값이 모두 0이면, 잡은 종료 즉시 삭제된다. 또 기본 설정값은 두 파라미터 모두 3이다. 그러나 실제 운영 환경에서는 컨테이너 로그를 외부 로그 시스템을 통해 운영하는 것을 추천한다. 로그를 별도 시스템으로 수집하면 `kubectl` 명령어로 로그를 확인할 필요도 없고 가용성이 높은 환경에 로그를 저장할 수 있다.


```sh
# 크론잡이 생성한 잡 확인
$ kubectl get jobs
NAME                      COMPLETIONS   DURATION   AGE
sample-cronjob-27704553   0/1           52s        52s

# 잡이 생성한 파드 확인
$ kubectl get pods
NAME                                 READY   STATUS    RESTARTS        AGE
sample-cronjob-27704553-mjsdz        1/1     Running   0               77s

# 로그 확인
$ kubectl logs sample-cronjob-27704553-mjsdz
Succeeded
```


## 5.8.7 매니페스트를 사용하지 않고 크론잡 생성


```sh
# 매니페스트를 사용하지 않고 명령어로 크론잡 생성
$ kubectl create cronjob sample-cronjob-by-cli \
--image amsy810/random-exit:v2.0 \
--schedule "*/1 * * * * " \
--restart Never
```