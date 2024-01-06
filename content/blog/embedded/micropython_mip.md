---
title: '[MicroPython] mip를 통한 MicroPython 라이브러리 받기'
date: 2023-08-14 17:00:00
category: 'embedded'
draft: false
---


최근 Raspberry Pi Pico W와 MicroPython을 사용한 작은 프로젝트를 하나 하고 있다. Thonny라는 IDE를 사용해서 Raspberry Pi Pico 의 파일을 옮기거나 빼올 수 있는데, 몇 개월 동안 씨름하고 나서야 외부 라이브러리를 받아오는 방법을 발견하였다. 직접 `.py` 코드 파일을 넣어주고, 이 파일을 import하는 방법도 가능하지만, 대부분의 라이브러리들이 단일 파일로 작성되어 있지 않으므로 매우 번거롭다.

</br>

mip를 사용하면 `/lib` 디렉토리 내에 모듈별로 .mpy 파일로 저장되며 소스 코드 내에서 라이브러리명을 import하여 받아올 수 있다.

</br>

자세한 방법은 [github.com/micropython/micropython-lib](https://github.com/micropython/micropython-lib/tree/master) 에서 메뉴얼을 찾아볼 수도 있지만, 보다 명확하고 간단하게 설명해보고자 한다.

</br>

## 1. 인터넷이 바로 사용 가능한 MCU의 경우,


MCU 자체적으로 인터넷에 연결된 경우에는 매우 간단하다. 그냥 python 스크립트를 열어서 아래와 같이 입력하면 되기 때문이다. 다운로드 가능한 라이브러리의 패키지 목록은 [github.com/micropython/micropython-lib/micropython](https://github.com/micropython/micropython-lib/tree/master/micropython) 에서 확인 가능하다.


```python
import mip
mip.install("package-name")
```

</br>

## 2. PC에서 다운받아서 옮기는 경우,


위의 케이스와 다르게 Rasbperry Pi Pico의 경우 `wlan`을 통해 인터넷을 잡아준 것이 아니라면, PC를 통해 라이브러리를 받아올 수도 있다. 매번 wlan 설정을 해주는 것 보다, 아래 절차대로 하는게 맘 편하므로 아래 방법을 추천한다.

</br>

### 2.1 Python3 설치 (공홈 참고)


[Python](https://www.python.org/downloads/)

</br>

### 2.2 pip 업그레이드

```sh
python -m pip install --upgrade pip
```

</br>

### 2.3 mpremote 모듈 설치


PC에서 설치할 경우 mpremote의 install 기능을 사용하여 전달 가능하다. mpremote를 설치를 하더라도 바로 명령어가 먹지 않을 수도 있는데, 실체 설치된 경로의 바이너리를 환경변수에 설정해주어야 한다.


```sh
pip install --user mpremote
```


</br>

### 2.4 패키지 설치


아래와 같이 설치하면 PC에 연결된 MCU를 인식하여 라이브러리를 전송해준다. 만약, 인식되지 않았다면 `mpreote link` 명령어등을 사용하여 연결을 먼저 한 뒤 전송해주어야 한다.


```sh
mpremote mip install {package-name}
```


</br>