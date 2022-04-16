---
title: '[Go 언어 문법 정리] 04. 병행 처리 (2) 저수준 제어'
date: 2022-04-16 19:16:22
category: 'Golang'
draft: false
---


## 1. 저수준 제어

Go에는 고루틴과 채널 외에도 병행 프로그래밍을 위한 저수준 제어 기능이 있다.

|패키지|내용|
|---|------|
|sync|mutex로 공유 메모리 제어|
|sync/atomic|원자성을 보장 (add, compare, swap)|

### 1.1 sync.Mutex

뮤텍스(Mutex)는 여러 고루틴에서 공유하는 데이터를 보호해야 할 때 사용한다.

* func (m *Mutex) Lock(): 뮤텍스 잠금
* func (* Mutex) Unlock(): 뮤텍스 잠금 해제

임계 영역(critical section)의 코드를 실행하기 전에는 뮤텍스의 Lock()메서드로 잠금을 하고, 처리 완료 후에 Unlock() 메서드로 잠금을 해제한다.

```go
package main

import (
 "fmt"
 "runtime"
)

type counter struct {
 i int64
}

// counter 값을 1씩 증가시킴
func (c *counter) increment() {
 c.i += 1
}

func (c *counter) display() {
 fmt.Println(c.i)
}

func main() {
 // 모든 CPU 를 사용하게 함
 runtime.GOMAXPROCS(runtime.NumCPU())

 c := counter{i: 0}   // 카운터 생성
 done := make(chan struct{}) // 완료 신호 수신용 채널

 for i := 0; i < 1000; i++ {
  go func() {
   c.increment()
   done <- struct{}{}
  }()
 }

 for i := 0; i < 1000; i++ {
  <-done
 }

 c.display()
}
```

이 프로그램은 루프를 1000번 돌며 고루틴을 1000개 수행한다. 각 고루틴에서는 counter 타입 변수 c의 값을 increment() 메서드로 1씩 증가시킨다.
increment 메서드는 총 1000번 수행되므로 프로그램 실행 결과로 1000이 출력되어야 한다. 하지만 실제 결과는 1000보다 작은 값이 출력된다. 이는 여러 고루틴이 카운터 c의 내부 필드 i의 값을 동시에 수정하려고 해서
경쟁상태가 만들어졌기 때문이다. 아래와 같이 수정하면 원하는 동작이 수행된다.

```go
package main

import (
 "fmt"
 "runtime"
 "sync"
)

type counter struct {
 i int64
 mu sync.Mutex
}

// counter 값을 1씩 증가시킴
func (c *counter) increment() {
 c.mu.Lock()
 c.i += 1
 c.mu.Unlock()
}

func (c *counter) display() {
 fmt.Println(c.i)
}

func main() {
 // 모든 CPU 를 사용하게 함
 runtime.GOMAXPROCS(runtime.NumCPU())

 c := counter{i: 0}   // 카운터 생성
 done := make(chan struct{}) // 완료 신호 수신용 채널

 for i := 0; i < 1000; i++ {
  go func() {
   c.increment()
   done <- struct{}{}
  }()
 }

 for i := 0; i < 1000; i++ {
  <-done
 }

 c.display()
}
```

### 1.2 sync.RWMutex

sync.RWMutex는 sync.Mutex와 동작 방식이 유사하다. 하지만 sync.RWMutex는 읽기 동작과 쓰기 동작을 나누어 잠금 처리할 수 있다.

* 읽기 잠금: 읽기 잠금은 읽기 작업에 한해 공유 데이터가 변하지 않음을 보장한다. 읽기 잠금일 경우 다른 고루틴에서도 읽기는 가능하나, 쓰기는 불가능하다.
* 쓰기 잠금: 쓰기 잠금은 공유 데이터에 쓰기 작업을 보장하는 것으로, 쓰기 잠금일 경우, 다른 고루틴에서 읽기와 쓰기 모두 불가능하다.

* func (m *Mutex) Lock(): 쓰기 뮤텍스 잠금
* func (*Mutex) Unlock(): 쓰기 뮤텍스 잠금 해제
* func (m *Mutex) RLock(): 읽기 뮤텍스 잠금
* func (*Mutex) RUnlock(): 읽기 뮤텍스 잠금 해제

### 1.3 sync.Once

특정 함수를 한 번만 수행해야 할 때 sync.Once를 사용한다.
sync.Once 구조체는 다음 메서드를 제공한다.

* func (o *Once) Do(f func())

한 번만 수행해야 하는 함수를 Do() 메서드의 매개변수로 전달하면, 여러 고루틴에서 실행한다 해도 해당 함수는 한 번만 실행된다.
아래 코드 수행결과를 보면 `c.increment()`는 1000번 수행되었지만, 카운터 내부 필드 값 i의 초기화 작업은 단 한번만 수행되었다.

```go
package main

import (
 "fmt"
 "runtime"
 "sync"
)

const intialValue = -500

type counter struct {
 i int64
 mu sync.Mutex
 once sync.Once
}

// counter 값을 1씩 증가시킴
func (c *counter) increment() {
 c.once.Do(func() {
  c.i = intialValue
 })
 c.mu.Lock()
 c.i += 1
 c.mu.Unlock()
}

func (c *counter) display() {
 fmt.Println(c.i)
}

func main() {
 // 모든 CPU 를 사용하게 함
 runtime.GOMAXPROCS(runtime.NumCPU())

 c := counter{i: 0}   // 카운터 생성
 done := make(chan struct{}) // 완료 신호 수신용 채널

 for i := 0; i < 1000; i++ {
  go func() {
   c.increment()
   done <- struct{}{}
  }()
 }

 for i := 0; i < 1000; i++ {
  <-done
 }

 c.display()
}
```

```
500
```

### 1.4 sync.WaitGroup

sync.WaitGroup은 모든 고루틴이 종료될 때까지 대기해야 할 때 사용된다.

* func (wg *WaitGroup) Add(delta int): WaitGroup에 대기 중인 고루틴 개수 추가
* func (wg *WaitGroup) Done(): 대기 중인 고루틴의 수행이 종료되는 것을 알려줌
* func (wg *WaitGroup) Wait(): 모든 고루틴이 종료될 때까지 대기

done 채널을 사용하여 고루틴이 종료될 때까지 대기했던 코드를 WaitGroup을 사용하는 코드로 수정하면 아래와 같다.

```go
package main

import (
 "fmt"
 "runtime"
 "sync"
)

type counter struct {
 i int64
 mu sync.Mutex
}

// counter 값을 1씩 증가시킴
func (c *counter) increment() {
 c.mu.Lock()
 c.i += 1
 c.mu.Unlock()
}

func (c *counter) display() {
 fmt.Println(c.i)
}

func main() {
 // 모든 CPU 를 사용하게 함
 runtime.GOMAXPROCS(runtime.NumCPU())

 c := counter{i: 0}   // 카운터 생성
 wg := sync.WaitGroup{}      // WaitGroup 생성

 for i := 0; i < 1000; i++ {
  wg.Add(1) // WaitGroup의 고루틴 개수 1 증가
  go func() {
   defer wg.Done()
   c.increment()
  }()
 }

 wg.Wait()

 c.display()
}
```

### 1.5 원자성을 보장하는 연산

원자성을 보장하는 연산(atomic Operation)이란 쪼갤 수 없는 연산을 말한다.

i += 1 같은 단순 연산이라도 최소 세 단계를 거친다.

1. 메모리에서 값을 읽는다.
2. 값을 1 증가시킨다.
3. 새로운 값을 메모리에 다시 쓴다.

고루틴을 여러 개 동시에 실행하면 CPU는 각 고루틴을 시분할하여 번갈아 실행하는 방식으로 병행처리한다.
즉, i += 1 같은 단순 연산을 처리하는 도중에도 CPU는 해당 연산을 잠시 중단하고 다른 고루틴을 수행하다 동기화 문제가 발생할 수 있다.

sync/atomic 패키지가 제공하는 함수를 사용하면 CPU에서 시분할을 하지 않고 한 번만 처리하도록 제어할 수 있다.

|함수|설명|
|---|------|
|AddT|특정 포인터 변수에 값을 더함|
|CompareAndSwapT|특정 포인터 변수의 값을 주어진 값과 비교하여 같으면 새로운 값으로 대체|
|LoadT|특정 포인터 변수의 값을 가져옴|
|StoreT|특정 포인터 변수에 값을 저장함|
|SwapT|특정 포인터 변수에 새로운 값을 저장하고 이전 값을 가져옴|

다음은 뮤텍스를 사용하지 않고 sync/atomic 패키지의 AddInt64 함수를 사용한 코드이다.

```go
package main

import (
 "fmt"
 "runtime"
 "sync"
 "sync/atomic"
)

type counter struct {
 i int64
}

// counter 값을 1씩 증가시킴
func (c *counter) increment() {
 atomic.AddInt64(&c.i, 1)
}

func (c *counter) display() {
 fmt.Println(c.i)
}

func main() {
 // 모든 CPU 를 사용하게 함
 runtime.GOMAXPROCS(runtime.NumCPU())

 c := counter{i: 0}   // 카운터 생성
 wg := sync.WaitGroup{}      // WaitGroup 생성

 for i := 0; i < 1000; i++ {
  wg.Add(1) // WaitGroup의 고루틴 개수 1 증가
  go func() {
   defer wg.Done()
   c.increment()
  }()
 }

 wg.Wait()

 c.display()
}
```

저수준 제어에서는 앞서 go루틴과 채널로는 해결할 수 없는, 공유 메모리를 사용하는 경우 교착 상태를 제어할 때 필수적으로 사용된다.

흔히 운영체제 수업 때 교착 상태 제어를 위해 사용하는 Mutex를 사용하여 Critical Section에서의 교착 상태를 방지하는 로직 처리를 할 수 있다.

원자성을 보장하는 연산(atomic operation)이란 이러한 상호 배제를 보장하는 연산을 의미한다.

만약 변수의 값 하나를 증가시킨다던가 매우 작은 연산을 위해 Mutex를 사용하면, 배보다 배꼽이 더 큰 상황이 발생한다.

atomic 패키지에서 제공하는 연산들은 CPU단위에서 Mutex를 사용한 것 처럼 원자성이 보장되는 단순 계산 함수를 제공한다.

이러한 연산은 문맥 교환 (Context Change)를 발생시키지 않기 때문에 속도가 보장된다.

이를 통해 Mutex를 사용하지 않더라도 교착 상태를 방지하는 로직의 구현이 가능해진다.
