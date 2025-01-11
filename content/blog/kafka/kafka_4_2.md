---
title: '4-2) 토픽을 생성하는 두 가지 방법'
date: 2024-12-23 23:00:00
category: 'kafka'
draft: false
---

- Kafka에서 토픽을 생성하는 방법에는 두 가지 방법이 있다. 첫 번째로 kafka-topics.sh 와 같은 CLI툴을 사용하여 명시적으로 생성하는 방법이다. 토픽을 효과적으로 유지보수하기 위해 추천되는 방법이다. 두 번 째로는 컨슈머나 프로듀서가 카프카 브로커에 생성되지 않은 토픽에 대한 데이터를 요청할 때이다.

- 두 번째 방법에 대한 옵션이 바로 `auto.create.topics.enable=true` 이다. 이 값은 true가 default인데, false로 설정하면 토픽이 자동 생성되지 않는다.