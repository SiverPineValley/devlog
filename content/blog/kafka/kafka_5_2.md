---
title: '5-2) 프로듀서 애플리케이션 개발'
date: 2024-01-11 15:30:00
category: 'kafka'
draft: false
---

## 5-2-1) java를 이용한 프로듀서 애플리케이션 개발

```gradle
plugins {  
    id 'java'  
}  
  
group 'com.example'  
version '1.0'  
  
sourceCompatibility = 1.8  
targetCompatibility = 1.8  
  
repositories {  
    mavenCentral()  
}  
  
dependencies {  
    implementation 'org.apache.kafka:kafka-clients:3.9.0'  
    implementation  'org.slf4j:slf4j-simple:1.7.36'  
}
```

```java
package com.example;  
  
import org.apache.kafka.clients.producer.KafkaProducer;  
import org.apache.kafka.clients.producer.ProducerConfig;  
import org.apache.kafka.clients.producer.ProducerRecord;  
import org.apache.kafka.common.serialization.StringSerializer;  
import org.slf4j.Logger;  
import org.slf4j.LoggerFactory;  
  
import java.util.Properties;  
  
public class SimpleProducer {  
    private final static Logger logger = LoggerFactory.getLogger(SimpleProducer.class);  
    private final static String TOPIC_NAME = "test";  
    private final static String BOOTSTRAP_SERVERS = "my-kafka:19092";  
  
    public static void main(String[] args) {  
  
        Properties configs = new Properties();  
        configs.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);  
        configs.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
        configs.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
  
        KafkaProducer<String, String> producer = new KafkaProducer<>(configs);  
  
        String messageValue = "testMessage";  
        ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, messageValue);
        producer.send(record);
        logger.info("{}", record);
        producer.flush();  
        producer.close();  
    }  
}
```

- `ProducerConfig` 을 통해 프로듀서의 필수 설정(bootstrap_servers)을 설정한다.
- `KafkaProducer<>` 객체 생성 후 `send()` 함수를 통해 record를 프로듀스 할 수 있다. `flush()` 함수는 배치를 강제로 전송하는 함수이고, `close()`는 프로듀서와의 연결을 종료한다.

</br>

## 5-2-2) 메시지 키가 존재하는 레코드 프로듀스

```java
KafkaProducer<String, String> producer = new KafkaProducer<>(configs);  
  
ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, "Pangyo", "Pangyo");  
producer.send(record);  
ProducerRecord<String, String> record2 = new ProducerRecord<>(TOPIC_NAME, "Busan", "Busan");  
producer.send(record2);  
producer.flush();  
producer.close();  
}
```

</br>

- `ProducerRecord<>`를 통해 레코드 생성 시 파라미터를 3개 넣으면 키를 부여할 수 있다.

## 5-2-3) 레코드에 파티션 번호를 지정하여 전송하는 프로듀서

```java
KafkaProducer<String, String> producer = new KafkaProducer<>(configs);  

int partitionNo = 0;  
ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, partitionNo, "Pangyo", "Pangyo");  
producer.send(record);
producer.flush();  
producer.close();
```

- 파티션을 지정해서 보내고 싶다면, `ProducerRecord<>`를 통해 레코드 생성 시 토픽명, 파티션 번호, 키, 값 순서대로 넣어서 생성하면 된다.

</br>

## 5-2-4) 커스텀 파티셔너를 가지는 프로듀서

```java
package com.example;  
  
import org.apache.kafka.clients.producer.Partitioner;  
import org.apache.kafka.common.Cluster;  
import org.apache.kafka.common.InvalidRecordException;  
import org.apache.kafka.common.PartitionInfo;  
import org.apache.kafka.common.utils.Utils;  
  
import java.util.List;  
import java.util.Map;  
  
public class CustomPartitioner  implements Partitioner {  
  
    @Override  
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes,  
                         Cluster cluster) {  
  
        if (keyBytes == null) {  
            throw new InvalidRecordException("Need message key");  
        }  

		// Pangyo 키를 가지면 파티션을 0으로 보냄
        if (((String)key).equals("Pangyo"))  
            return 0;  

		// 그 외에는 해시 값대로 전송
        List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);  
        int numPartitions = partitions.size();  
        return Utils.toPositive(Utils.murmur2(keyBytes)) % numPartitions;  
    }  
  
  
    @Override  
    public void configure(Map<String, ?> configs) {}  
  
    @Override  
    public void close() {}  
}
```

```java
public static void main(String[] args) {  
  
    Properties configs = new Properties();  
    configs.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);  
    configs.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
    configs.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
    configs.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, CustomPartitioner.class);  
  
    KafkaProducer<String, String> producer = new KafkaProducer<>(configs);  
  
    ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, "Pangyo", "Pangyo");  
    producer.send(record);  
    producer.flush();  
    producer.close();  
}
```

- 프로듀서 사용 환경에 따라 특정 데이터를 가지는 레코드를 특정 파티션에만 프로듀스해야할 필요가 있다. 이런 경우를 위해 커스텀 파티셔너를 설정할 수 있다. `PARTITIONER_CLASS_CONFIG` 설정에 특정 파티셔너 클래스를 지정함으로써 설정 가능하다.

</br>

## 5-2-5) 레코드 전송 결과를 확인하는 프로듀서 애플리케이션

```java
public static void main(String[] args) {  
  
    Properties configs = new Properties();  
    configs.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);  
    configs.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
    configs.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());  
    //configs.put(ProducerConfig.ACKS_CONFIG, "0");  
  
    KafkaProducer<String, String> producer = new KafkaProducer<>(configs);  
  
    ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, "Pangyo", "Pangyo");  
    try {  
        RecordMetadata metadata = producer.send(record).get();  
        logger.info(metadata.toString());  
    } catch (Exception e) {  
        logger.error(e.getMessage(),e);  
    } finally {  
        producer.flush();  
        producer.close();  
    }  
}
```

- KafkaProducer의 `send()` 메소드는 `Future` 객체를 반환한다. 이 객체는 `RecordMetadata`의 비동기 결과를 표현한 것으로, ProducerRecord가 카프카 브로커에 정상적으로 적재되었는지에 대한 데이터가 포함되어 있다. 위와 같이 `get()`메서드를 사용하면, 프로듀서에서 보낸 데이터의 결과를 동기적으로 가져올 수 있다.

- 위 소스 코드를 실행하면 다음과 같은 RecordMetadata의 로그를 확인할 수 있다. test 토픽의 0번 파티션으로 전송하였고, 4번 offset으로 저장되었다는 의미이다. 이는 `acks=1`로 설정되어 리더 파티션의 결과까지 기다리기 때문에 확인 가능하다. 만약, `acks=0`으로 설정된다면, 오프셋 값이 -1과 같이 의미 없는 값으로 표출된다.

```
[main] INFO com.example.ProducerWithSyncCallback - test-0@4
```
</br>

## 5-2-6) 프로듀서 애플리케이션의 안전한 종료

```java
producer.close();
```

- 프로듀서를 안전하게 종료하기 위해서는 꼭 `close()` 메소드를 사용하여 Accumulator에 남아 있는 레코드를 카프카 클러스터로 전송하면서 종료하는 것이 좋다.