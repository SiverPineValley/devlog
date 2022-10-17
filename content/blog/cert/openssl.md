---
title: '[Cert] openssl을 사용한 인증서 파일 생성'
date: 2022-07-30 15:00:00
category: 'cert'
draft: false
---


# 1 비밀키(Private key), 공개키(Public Key) 생성
외부 인증기관에서 인증서를 전달받지 않고, 내부적으로 사용할 RSA 키 페어가 필요하다면 아래 설명된 절차를 통해서 간단하게 키 페어를 만들어 낼 수 있다.

## 1.1 RSA key pair 생성
``` sh
openssl genrsa -des3 -out private.pem 2048
```
private.pem파일을 열어보면 -----BEGIN RSA PRIVATE KEY----- 로 표시되는 것을 확인 할 수 있다. 

## 1.2 Private key에 포함된 정보 확인

RSA private key로부터 public key를 만들어 낼 수 있다. 어떻게 그게 가능한지 보기 위해서 아래 명령어를 사용해보자.
```sh
openssl rsa -text -in private.pem
```
위 명령어로 출력된 결과에 public key를 정의하는데 필요한 modulus와 publicExponent정보가 포함되어있는것을 알 수있다. 실제로 private key로부터 public key를 추출하기 위해서 다음 단계를 살펴보자.

## 1.3 Private key에서 Public key추출하기

```sh
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
```
public.pem 파일을 열어서 -----BEGIN PUBLIC KEY----- 로 표시되는것을 확인 하면 된다.

# 2 비밀키를 사용한 인증서 파일 생성
다음으로는, 인증서(crt) 파일을 생성해보겠다.

## 2.1 비밀 키 생성
``` sh
openssl genrsa -out private.key 2048
```


## 2.2 CRT 파일을 만들기 위해 필요한 정보를 암호화한 인증서 생성 요청 파일 생성
```sh
openssl req -new -key "KEY 경로" -out "CSR 저장 경로" -config "REQ_INFO 경로"
```
- Key 경로: Private Key가 저장된 경로
- CSR 저장 경로: CSR 파일이 저장될 경로
- REQ_INFO 경로: 인증서 생성 요청 파일 경로


위 명령어를 실행하기 전에 REQ_INFO 파일을 만든다.

```
[req] 
default_bit = 2048 
prompt = no 
distinguished_name = dn 

[dn] 
C=KR 
L=Seoul 
O=COMPANY 
OU=DEV 
emailAddress=EMailAddress ex)test@test.com
CN=IP 또는 Domain
```


## 2.3 인증서 파일(crt) 생성
```sh
openssl req -x509 -days "인증서유효기간(일)" -key "KEY 경로" -in "CSR 경로" -out "CRT 저장 경로" -days "인증서유효기간(일)" -config "REQ_INFO 경로"
```
- 인증서 유효기간 : 일단위로 입력
- KEY 경로 : PrivateKey가 저장된 경로
- CSR 경로 : CSR 파일이 저장된 경로
- CRT 저장 경로 : CRT 파일을 저장 할 경로
- REQ_INFO 경로 : 인증서 생성 요청 정보 파일 경로


# 출처
https://jjig810906.tistory.com/78 [프로그램마귀:티스토리]</br>
https://www.letmecompile.com/certificate-file-format-extensions-comparison/