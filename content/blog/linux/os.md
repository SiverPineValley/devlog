---
title: '[Linux] OS 확인 하는 법'
date: 2022-08-13 16:00:00
category: 'linux'
draft: false
---


리눅스는 오픈소스 답게 엄청나게 많은 대분류와 종류들이 있다. 서버 작업할 때 리눅스의 정확한 버전을 알기 어려울 때가 있는데, 아래의 방법들 중 하나를 사용하면 된다.
예시는 kubernetes nginx1.16 Offical 컨테이너 이미지에서 사용하였다.


## 1. OS 커널 정보
```sh
$ uname -a
Linux sample-pod 5.10.76-linuxkit #1 SMP PREEMPT Mon Nov 8 11:22:26 UTC 2021 aarch64 GNU/Linux
```

## 2. 리눅스 버전 확인
```sh
# /etc/redhat-release
$ cat /etc/redhat-release

# /etc/issue
$ cat /etc/*issue*
Debian GNU/Linux 10 \n \l

Debian GNU/Linux 10
```

## 3. OS 비트 확인
```sh
$ getconf LONG_BIT
64
```