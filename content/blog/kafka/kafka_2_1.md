---
title: '2-1) 오픈 소스 Apache Kafka 생태계'
date: 2024-12-07 14:00:00
category: 'kafka'
draft: false
---

<div align="left">
  <img src="./images/스크린샷 2024-12-07 오후 2.28.57.png" width="500px" />
</div>

</br>

- Kafka 클러스터는 여러 개의 브로커로 이루어져 있으며 토픽 단위로 데이터가 저장된다. 데이터의 최초 제공자는 Producer라고 하며, Consumer가 토픽을 구독하였다가 이를 받아가는 형태이다.
- Kafka의 모든 기능들은 Java를 기반으로 구현되었기 때문에 go, javascript와 같은 3rd 파티 언어들의 라이브러리들에서는 모든 기능이 제공되지 않을 수도 있다.
- **Kafka Streams**: 토픽에 저장된 데이터를 stateful하게 혹은 stateless하게 데이터를 처리해서 토픽에 다시 데이터를 넣을 때 사용되는 라이브러리.
- **Connector**: 데이터 파이프라인을 운영하는 핵심적인 기능으로, Producer 역할을 하는 소스 커넥터와 Consumer 역할을 하는 싱크 커넥터로 구성되어 있다. 이러한 커넥터가 Producer, Consumer와 구분되는 점은 커넥터는 클러스터 단위로 운영되며, 파이프라인을 템플릿 단위로 지속적으로 반복적으로 여러 번 생성할 수 있고 운영된다는 점에서 차이가 있다. 이러한 특징은 Producer를 개별적으로 만들고 생성하는 것보다 효율적이다.
- **Mirror Maker**: 클러스터 단위로 데이터베이스 카프라를 운영할 때 특정 토픽의 데이터를 완벽하게 복제하기 위해 사용되는 툴.