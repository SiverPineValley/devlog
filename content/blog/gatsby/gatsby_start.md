---
title: '[Gatsby Blog 만들기 - 1] Gastby Blog 설치 (gatsby-starter-bee)'
date: 2021-09-25 20:39:13
category: 'gatsby'
draft: false
---

오랫만에 다시 Gatsby 블로그를 개설했다. 너무 간만인지 개삽질을 거듭해서 아래와 같이 정리하게 되었다. Windows WSL2 기반으로 작성했으며, WSL2 설치는 아래 [Blog](https://www.lainyzine.com/ko/article/how-to-install-wsl2-and-use-linux-on-windows-10/)를 참조하였다.

# 설치 방법 😎

## 1. nvm 설치

가장 먼저, NodeJS를 설치했다. 다만, 그 전에 WSL2 설치하니 NodeJS가 기존 system 버전으로 잡혀있어서 nvm을 먼저 설치했다.

그 후에 최신 Stable 버전인 14.17.6 버전으로 설치했다.

```sh
# 빌드 환경 설치
$ sudo apt-get install build-essential libssl-dev

# nvm 설치
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

# NodeJS 설치
$ nvm install 14.17.6
$ nvm use 14.17.6
$ nvm ls
```

여기까지 했을 때, 현재 버전이 14.17.6으로 되어있으면 정상적으로 NodeJS가 설치된 것이다.

추가로, 내가 설치하려는 [gatsby-starter-bee](https://github.com/JaeYeopHan/gatsby-starter-bee)는 npm이 7.0.0 버전 이상이어야 dependency 오류가 발생하지 않았으므로, 아래와 같이 npm 버전도 업데이트한다.

```sh
# npm 업데이트
$ npm install -g npm@latest
```

## 2. Gatsby 설치 및 프로젝트 생성

```sh
# gatsby 설치
$ npm install -g gatsby-cli

# gatsby 프로젝트 init
$ gatsby new new-gatsby https://github.com/JaeYeopHan/gatsby-starter-bee

```

## 3. Gatsby 로컬 빌드

```sh
$ cd new-gatsby/
$ npm start
# open localhost:8000
```

## 4. Gastby 설치 오류 발생 시 🤢

나 같은 경우에는 여러 가지 오류가 발생해서 설치 중 많은 고통을 느끼게 했었다.

### 1) npm 버전 문제

npm 버전이 7.0.0 이상이어야 dependency에서 문제가 잡히지 않았다. 최초 설치시에는 6버전대였는데,
위에 설명한대로 잘 따라왔다면 이 문제는 발생하지 않을 것이다.

### 2) python2 미설치 문제

python2가 설치되지 않아서 생겼던 문제인데, 결론적으로는 python2만 설치해주면 끝이나 WSL2에 기본 설치된 python3의 기본 경로때문에 문제가 발생했다.

분명히 python2로 alias도 설정했으나, PATH 변수의 python3 바이너리만 찾아서 빌드를 해대서 문제가 발생했다.

아래와 같이 해결을 했다.

```sh
# 빌드 도구 미리 설치
$ sudo apt-get update
$ sudo apt-get g++
$ sudo apt-get install build-essential gdb
$ sudo apt-get make

# python2.7.18 다운로드
$ wget https://www.python.org/ftp/python/2.7.18/Python-2.7.18.tgz

# 압축 해제
$ tar xzf Python-2.7.18.tgz
$ Python-2.7.18

# 빌드 및 설치
$ ./configure --enable-optimizations
$ sudo make altinstall
$ make

# python 버전 설정
alias python=python2
python2

# python 바이너리 교체
sudo cp /usr/bin/local/python  /usr/bin/python
```

참고로 이 부분에서 gcc, g++, make과 같은 빌드 도구들을 미리 설치해 놓는 것이 좋다.

WSL2의 경우 기본 설치되지 않았을 확률이 높으므로...

마지막의 바이너리 교체는 python2 설치 경로가 위와 같을때 그대로 하면 되고, 아니면 설치된 경로에 맞게 넣으면 된다.
