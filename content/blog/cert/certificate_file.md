---
title: '[Cert] 인증서 파일 확장자 설명'
date: 2022-07-30 14:30:00
category: 'cert'
draft: false
---


openssl을 사용하여 인증서 파일을 생성하기 전에 각 파일 확장자 명이 궁금하여 찾아보다가 잘 정리된 자료가 있어 정리하였다.


https를 지원하는 웹서버를 설정하거나 서명이나 암호화 관련된 개발을 하게되면 한번씩 인증서 관련된 파일을 다룰 일이 생기게 된다. 이때 항상 프로그램이나 라이브러리들이 지원하는 형식이 달라서 인증서 형식을 변환해아 하는데 현재 갖고있는 파일의 형식이 무엇인지를 알아야 제대로 활용이 가능하다. 인증서 파일의 경우 인코딩 방식과 확장자가 일치하는 경우도 있고, 그렇지 않은 경우도 있기 때문에 아래와 같이 비교해서 정리해 보았다.


# 인코딩 (확장자로 쓰이기도 한다.)
- `der`: 
    - Distinguished Encoding Representation (DER)
    - 바이너리 DER 형식으로 인코딩된 인증서. 텍스트 편집기에서 열었는데 읽어들일 수 없다면 이 인코딩일 확률이 높다.


- `pem`: 
    - PEM (Privacy Enhanced Mail)은 Base64인코딩된 ASCII text file이다.
    - 원래는 secure email에 사용되는 인코딩 포멧이었는데 더이상 email쪽에서는 잘 쓰이지 않고 인증서 또는 키값을 저장하는데 많이 사용된다.
    - `-----BEGIN XXX-----`, `-----END XXX-----` 로 묶여있는 text file을 보면 이 형식으로 인코딩 되어있다고 생각하면 된다. (담고있는 내용이 무엇인지에 따라 XXX 위치에 CERTIFICATE, RSA PRIVATE KEY 등의 키워드가 들어있다)
    - 인증서(Certificate = public key), 비밀키(private key), 인증서 발급 요청을 위해 생성하는 CSR(Certificate Signing Request) 등을 저장하는데 사용된다.


# 확장자
- `cer`, `crt`:
    - .crt, .cer 인증서를 나타내는 확장자인 cer과 crt는 거의 동일하다고 생각하면 된다. (cer은 Microsoft 제품군에서 많이 사용되고, crt는 unix, linux 계열에서 많이 사용된다.)
    - 확장자인 cer이나 crt만 가지고는 파일을 열어보기 전에 인코딩이 어떻게되어있는지 판단하긴 힘들다.


-  `key`:
    - 개인 또는 공개 PKCS#8 키를 의미


- `p12`:
    - PKCS#12 형식으로 하나 또는 그이상의 certificate(public)과 그에 대응하는 private key를 포함하고 있는 key store 파일이며 패스워드로 암호화 되어있다. 열어서 내용을 확인하려면 패스워드가 필요하다.


- `pfx`:
    - PKCS#12는 Microsoft의 PFX파일을 계승하여 만들어진 포멧이라 pfx와 p12를 구분없이 동일하게 사용하기도 한다.


# 표준 비교


- PKCS #8은 Public-Key Cryptography Standards (PKCS) 표준 중의 일부로 private key를 저장하는 문법에 관한 표준이다. PKCS #8 private keys 는 일반적으로 PEM 형식으로 인코딩된다.
- PKCS #12는 하나의 파일에 여러 암호화 관련 엔티티 들을 합쳐서 보관하는 방식에 관한 표준이다.
- X.509는 public key infrastructure (PKI)에 대한 ITU-T의 표준 (RFC 5280) 으로 공개키(public key) 인증서의 format, revocation list(더이상 유효하지 않은 인증서들에 대한 정보 배포), certification path(chain) validation 알고리즘 등을 정의한다. 보통 X.509 인증서라 하면 RFC 5280에 따라서 인코딩되거나 서명된 디지털 문서를 말한다.


# 출처
https://www.letmecompile.com/certificate-file-format-extensions-comparison/