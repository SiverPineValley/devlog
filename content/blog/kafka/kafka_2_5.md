---
title: '2-5) ISR (In-Sync-Replicas)'
date: 2024-12-07 15:00:00
category: 'kafka'
draft: false
---

- `복제(replication)`은 브로커의 또 다른 역할 중 하나이다.

</br>

<div align="left">
  <img src="./images/스크린샷 2024-12-07 오후 2.43.26.png" width="500px" />
</div>

</br>

- `ISR(In-Sync-Replicas)`는 리더 파티션과 팔로워 파티션이 모두 싱크된다는 의미이다. 즉, 리더 파티션의 모든 데이터가 팔로워 파티션에 모두 복제된 상태를 의미한다. 만약, ISR로 묶이지 않은 두 개의 브로커가 존재할 때 리더 파티션의 브로커에 장애가 발생해서 리더 파티션을 팔로워 파티션이 이어 받게 된다면 특정 데이터는 유실될 수 있다. 이러한 유실을 감수하더라도 리더 파티션을 선출할지를 결정하는 옵션이 `unclean.leader.election.enable` 이다.
	- unclean.leader.election.enable=true: 유실을 감수함. 복제가 안 된 팔로워 파티션을 리더로 승급.
	- unclean.leader.election.enable=false: 유실을 감수하지 않음. 해당 브로커(ISR 상태의 브로커 혹은 리더 브로커)가 복구될 때 까지 중단.