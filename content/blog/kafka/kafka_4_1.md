---
title: '4-1) 카프카 CLI 툴 소개'
date: 2024-12-23 22:45:00
category: 'kafka'
draft: false
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

</br>

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

</br>

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

</br>

## 4-1-3) kafka-console-producer.sh

- 토픽에 데이터를 produce할 때 사용하는 스크립트로, 실행하면 텍스트를 입력할 수 있고 입력 후 엔터를 누르면 별 다른 메시지 없이 produce된다. produce된 메시지는 vlaue 값으로 전달된다. 이 때 메시지 키는 null로 전송된다.
- 메시지 키를 가지는 레코드를 전송하기 위해서는 몇 가지 추가 옵션을 작성해야 한다. key.seperator를 선언하지 않으면 기본 설정은 Tab delimiter(\t) 이므로 key.seperator를 선언하지 않고 메시지를 보내려면 메시지 키를 작성하고 탭 키를 누른 다음 메시지를 작성하고 엔터를 누른다. 여기서는 명시적으로 구분하기 위해 콜론(:)으로 구분하였다. 메시지 키를 전송하지 않는 경우에는 각 파티션에 라운드 로빈 방식으로 전달되지만 메시지 키를 같이 전달하면 키의 해시값을 작성하여 존재하는 파티션 중 하나에 들어간다. 따라서 동일 키를 가진 메시지들은 같은 파티션으로 들어간다. 이 때 동일 키를 가진 메시지들은 순서가 보장된 형태가 된다.

```sh
# 메시지만 Produce
./kafka-console-producer.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka
>hello
>kafka 

# Key 값도 Produce
./kafka-console-producer.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka \
--property "parse.key=true" \
--property "key.separator=:"
>key1:no1
>key2:no2
>key3:no3
```

</br>

## 4-1-4) kafka-console-consumer.sh

- 토픽의 데이터를 consume할 때 사용한다. `--from-beginning` 옵션은 토픽의 첫 번째 데이터부터 출력한다.
- Producer와 마찬가지로 key를 표시하기 위해서는 `print.key=true`, `key.separator` 옵션을 같이 사용해야 한다.
- `--max-messages` 옵션은 최대 컨슘 메시지를 설정할 수 있다.
- `--partiion` 옵션은 특정 파티션만 컨슘할 수 있다.
- `--group` 옵션은 컨슈머 그룹을 기반으로 동작한다. 컨슈머 그룹이란 특정 목적을 가진 컨슈머들을 묶음으로 사용하는 것을 말한다. 컨슈머 그룹으로 토픽의 레코드를 가져갈 경우 어느 레코드 까지 가졌는지(offset) 브로커에 저장된다.

```sh
# 메시지 Consume
./kafka-console-consumer.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka \
--property "print.key=true" \
--property "key.separator=:" \
--from-beginning

# Consumer 그룹 사용
./kafka-console-consumer.sh --bootstrap-server my-kafka:9092 \
--topic hello.kafka \
--group hello-group \
--from-beginning
```

</br>

## 4-1-5) kafka-console-groups.sh

- `--describe` 옵션을 사용하면 해당 컨슈머 그룹이 어떤 토픽을 대상으로 레코드를 가져갔는지, 파티션 별 현재 오프셋, 마지막 레코드의 오프셋, 컨슈머 랙, 컨슈머 ID, 호스트 정보를 알 수 있다.
- `컨슈머 랙` 이란 마지막 레코드 오프셋과 현재 오프셋의 차이이다.
- 컨슈머 그룹의 offset 리셋에는 다음과 같은 옵션들이 있다.
	- `--to-earliest`: 가장 처음 오프셋으로 리셋
	- `--to-latest`: 가장 마지막 오프셋으로 리셋
	- `--to-current`: 현 시점 기준 오프셋으로 리셋
	- `--to-datetime {YYYY-MM-DDTHH:mm:SS.sss}`: 특정 시점으로 오프셋 리셋 (레코드 타임스탬프 기준)
	- `--to-offset {long}`: 특정 오프셋으로 리셋
	- `--shift-by {+/- long}`: 현재 컨슈머 오프셋에서 앞뒤로 옮기며 리셋

```sh
# Consumer Group 리스트
./kafka-consumer-groups.sh --bootstrap-server my-kafka:9092 \
--list

# Consumer Group 상세 정보
./kafka-consumer-groups.sh --bootstrap-server my-kafka:9092 \
--group {group 명} \
--describe

# Offset 리셋 (group - topic의 오프셋을 맨 처음 레코드의 오프셋으로 되돌림)
./kafka-consumer-groups.sh --bootstrap-server my-kafka:9092 \
--group {group 명} \
--topic {topic 명}
--reset-offsets --to-earliest --execute
```

</br>

## 4-1-6) kafka-producer-perf-test.sh

- kafka producer로 성능을 측정할 때 사용한다.

```sh
./kafka-producer-perf-test.sh --producer-props \
--bootstrap-servers my-kafka:9092 \
--topic {topic 명} \
--num-records 10 \
--throughput 1 \
--record-size 100 \
--print-metric
```

</br>

## 4-1-7) kafka-reassign-partitions.sh

- 리더 파티션이 특정 브로커에 몰리는 현상을 해소하기 위해 파티션을 분산해서 운영할 때 사용.
- Kafka 브로커에는 `auto.leader. rebalance.enable` 옵션이 있는데 이 기본 값은 true로써 클라이언트 단위에서 리더 파티션을 자동 리밸런스하도록 도와준다.

```sh
$ cat partition.json
{
	"partitions": [
		{
			"topic": "hello.kafka", "partition": 0, "replicas": [ 0 ]
		}
	], "version": 1
}

./kafka-reassign-partitions.sh --zookeeper my-kafka:2181 \
--reassignment-json-file partitions.json --execute
```

</br>

## 4-1-8) kafka-delete-records.sh

- 특정 파티션의 특정 offset까지의 모든 레코드를 지울 때 사용.

```sh
$ cat delete.json
{
	"partitions": [
		{
			"topic": "hello.kafka", "partition": 0, "offset": 5
		}
	], "version": 1
}

./kafka-delete-records.sh --bootstrap-server my-kafka:9092 \
--offset-json-file delete.json
```

</br>
</br>

## 4-1-9) kafka-dump-log.sh

- Kafka의 파일 단위로 Dump된 로그를 확인하기 위해 사용하는 명령어.

```sh
./kafka-dump-log.sh \
--files data/hello.kafka-0/00000000000000000000.log \
--deep-iteration
```