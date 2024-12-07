---
title: '2-2) Kafka 클러스터와 브로커, 주키퍼'
date: 2024-12-07 14:30:00
category: 'kafka'
draft: false
---

<div align="left">
  <img src="./images/스크린샷 2024-12-07 오후 2.31.22.png" width="500px" />
</div>

</br>

### 2-2-1) Kafka 클러스터와 브로커

- `카프카 브로커(Kafka Broker)`는 카프카 클라이언트와 데이터를 주고받기 위해 사용하는 주체이자, 데이터를 분산 저장하여 장애 상황에서도 데이터를 안전하게 사용할 수 있도록 도와주는 애플리케이션이다. 보통 브로커는 하나의 서버에서 한개의 프로세스만 동작하는 인스턴스 단위로 이러한 브로커들이 모여 클러스터를 형성한다. 카프카 클러스터로 묶인 브로커들은 프로듀서가 보낸 데이터를 안전하게 분산 저장하고 복제하는 역할을 한다. 브로커는 다음과 같은 역할들을 한다.
	- `컨트롤러`는 클러스터 내 다수의 브로커 중 한대가 역할을 수행하며, 다른 브로커들의 상태를 체크하고, 브로커가 클러스터에서 빠지는 경우 해당 브로커에 존재하는 `리더 파티션(Leader Partition)`을 재분배한다. 카프카는 지속적으로 데이터를 처리해야 하므로 브로커의 상태가 비정상이라면 빠르게 클러스터에서 빼내는 것이 중요하다. 만약 컨트롤러 브로커에 장애가 생기면, 다른 브로커가 컨트롤러 역할을 한다.
	- `데이터 삭제`: 카프카는 다른 메세징 플랫폼과 다르게 컨슈머가 메시지를 가져가더라도 토픽의 데이터는 삭제되지 않는다. 또한, 컨슈퍼나 프로듀서가 데이터 삭제를 요청할 수 도 없다. 오직 브로커만이 데이터를 삭제할 수 있다. 데이터 삭제는 파일 단위로 이루어지는데 이를 `로그 세그먼트(log segment)` 라고 부른다. 이 세그먼트에는 다수의 데이터가 들어가 있기 때문에 일반적인 데이터베이스처럼 데이터를 선별해서 삭제할 수 없다. 
	- `컨슈머 Offset 저장`: `컨슈머 그룹(Consumer Group)`은 토픽이 특정 파티션으로부터 데이터를 가져가서 처리하고 이 파티션의 어느 레코드까지 가져갔는지를 확인하기 위해 offset을 커밋한다. 커밋한 오프셋은 `__consumer_offset` 토픽에 저장된다. 여기에 저장된 offset을 토대로 컨슈머 그룹은 다음 레코드를 가져가서 처리한다.
	- `그룹 코디네이터(Group Cordinator)`: 코디네이터는 컨슈머 그룹의 상태를 체크하고 파티션을 컨슈머와 매칭되도록 분배하는 역할을 한다. 컨슈머가 컨슈머 그룹에서 빠지면 매핑되지 않는 파티션을 정상 동작하는 컨슈머로 할당하여 끊임없이 데이터가 처리되도록 도와준다. 이렇게 파티션을 컨슈머로 재할당하는 과정을 `리밸런스(reblalance)` 라고 한다.

### 2-2-2) 주키퍼

- ​`주키퍼(Zookeeper)`는 카프카 클러스터를 실행하기 위해서 필요한 애플리케이션이다.
	- 주키퍼는 분산형 Configuration 정보를 유지하고 '분산 시스템에서 동기화 서비스를 제공하는 소프트웨어'이다. 카프카에서 Zookeeper를 사용하는데, 여기서는 분산된 Broker들을 관리하는 용도로 사용된다. 즉, Broker들의 목록이나 설정 정보를 관리하며 Zookeeper는 변경사항(Topic 생성 및 제거, Broker 생성 및 제거 등)이 발생하면 모든 Broker들에게 알린다.
	- Zookeeper는 카프카의 Broker, Topic, Partition의 개수 등에 대한 정보를 가지고 있다. 이러한 정보들은 Zookeeper의 리더가 가지고 있고 팔로워가 읽어가 Broker들에 동기화를 해 주는 작업을 진행한다. Zookeeper는 분산 시스템의 정보를 제어하기 위해 Tree 형태로 데이터를 관리하며 동기화 작업을 수행한다. 주키퍼의 root znode에 여러 개의 znode를 생성하여 각 znode당 하나의 클러스터를 연결한다. Kafka 3.0 부터는 주키퍼 없이도 동작이 가능하다.
	- Zookeeper 없이는 카프카가 동작할 수 없다. 하지만 최근 Zookeeper를 제거하는 방식을 개발 중에 있다.
	- Zookeeper 서버는 홀수로 구성해야 한다. 보통 Zookeeper 서버 3개를 구성한다. (1개는 불가능)
	- Zookeeper에는 리더가 있고 나머지 서버에는 팔로워로 구성된다. 리더는 write를하고 팔로워는 read를 한다. 위 Zookeeper 아키텍처 그림에서 보면, 하나의 리더에서 팔로워들이 데이터를 가져가서 클라이언트(여기서는 Broker)에 동기화하는 작업을 진행한다.
	- 위와 같이 홀수로 구성된 Zookeeper 클러스터 형태를 Zookeeper Ensemble(주키퍼 앙상블)이라고 한다.
	- 주키퍼의 수를 홀수로 유지해야 하는 이유는 `Quorum(쿼럼)` 알고리즘을 사용하기 때문이다.Quorum(쿼럼)은 특정 합의체에서 의결을 하는데 필요한 '일정 구성원의 수'를 의미한다. 즉, Zookeeper 앙상블에서 무언가를 의결하기 위해서는 과반수 이상의 Zookeeper서버가 필요하다는 것이다. 이러한 방식으로 Zookeeper가 동작하는 이유는 분산 환경에서 예상치 못한 장애가 발생해도 분산 시스템의 일관성을 유지할 수 있기 때문이다.