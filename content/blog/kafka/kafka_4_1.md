---
title: '4-1) 카프카 CLI 툴 소개'
date: 2024-12-07 16:10:00
category: 'kafka'
draft: true
---

- **Kafka CLI**: 카프카를 운영할 때 가장 많이 접하는 도구로, 카프카 브로커 운영에 필요한 다양한 명령을 내릴 수 있다. 카프카 클라이언트 애플리케이션을 운영할 때는 카프카 클러스터와 연동하여 데이터를 주고받는 것도 중요하지만 토픽이나 파티션 변경과 같은 명령을 실행할 경우도 많이 발생한다. 그렇기 때문에 카프카 커맨드 라인 툴과 각 툴별 옵션에 대해서도 알고 있어야 한다.
- `zookeeper` 실행
```sh
bin/zookeeper-server-start.sh config/zookeeper.properties
```

- Kafka Broker 실행
```sh
bin/kafka-server-start.sh config/server.properties
```

- Kafka Broker API Version 체크
```sh
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

- Kafka 생성 토픽 확인
```sh
bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

## 4-1-1) kafka-topics.sh

- 토픽을 생성하기 위해서는 `Kafka 클러스터 정보`와 `토픽 이름`을 알고 있어야 한다. 두 값은 토픽을 만들기 위한 필수 값이다. 이렇게 만들어진 토픽은 파티션 개수, 복제 개수 등과 같은 다양한 옵션이 포함되어 있지만 모두 브로커의 기본값으로 생성된다.
- 토픽의 설정을 변경하는 것은 가능하나, partition 개수를 줄이는 것은 불가능하다.

```sh
# Kafka 토픽 생성 (--create)
./kafka-topics.sh --create \
--bootstrap-server my-kafka:9092 \
--partitions 10 \
--replication-factor 1 \
--config retention.ms=172800000
--topic hello.kafka

# Kafka 토픽 설명 (--describe)
./kafka-topics.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka
--describe

# Kafka 토픽 옵션 변경 (--alter)
./kafka-topics.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka
--alter --partitions 12

# Kafka 토픽 삭제
./kafka-topics.sh --delete \
--bootstrap-server my-kafka:9092 \
--topic hello.kafka \
--if-exists
```

## 4-1-2) kafka-configs.sh

- 토픽에 일부 옵션을 설정하기 위해서는 `kafka-configs.sh` 명령어를 사용해야 한다. `--alter`과 `-add-config` 옵션을 사용하여 `min.insync.replicas` 옵션을 토픽별로 설정할 수 있다.
- 브로커에 설정된 각종 기본 값은 `--broker`, `--all`, `--describe` 옵션을 사용하여 조회할 수 있다.

```sh
# Kafka 옵션 변경 (min.insync.replicas)
./kafka-configs.sh --bootstrap-server my-kafka:9092 \
--alter \
--add-config min.insync.replicas=2 \
--topic hello.kafka

# Kafka 브로커에 설정된 옵션 조회
./kafka-configs.sh --bootstrap-server my-kafka:9092 \
--broker 0 \
--all \
--describe 
```
