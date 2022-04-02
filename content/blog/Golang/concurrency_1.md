---
title: '[Go 언어 문법 정리] 04. 병행 처리 (1) 고루틴과 채널'
date: 2022-04-02 15:50:20
category: 'Golang'
draft: false
---


## 1. 고루틴(goroutine)


이번에는 Go언어에서 지원하는 몇 가지 병행 처리 기법에 대해서 볼 예정이다.
Go언어의 가장 큰 특징 중 하나인 goroutine이 바로 그러한 기능인데,
`고루틴(goroutine)`은 Go 프로그램 안에서 동시에 독립적으로 실행되는 흐름의 단위로, 스레드와 비슷한 개념이다.
하지만, 스레드와 달리 고루틴은 수 킬로바이트 정도의 아주 작은 리소스에서 동작하므로 한 프로세스에 수천, 수만 개의 고루틴을 동작시킬 수 있다.
고루틴은 정보를 공유하는 방식이 아니라 메시지를 서로 주고받는 방식으로 동작한다.
그래서 Lock으로 공유 메모리를 관리할 필요가 없고 구현도 어렵지 않다.
아래와 같이 go 키워드로 함수를 실행하면 새 고루틴이 만들어진다.


```go
func long() {
	fmt.Println("long 함수 시작", time.Now())
	time.Sleep(3 * time.Second)
	fmt.Println("long 함수 종료", time.Now())
}

func short() {
	fmt.Println("short 함수 시작", time.Now())
	time.Sleep(1 * time.Second)
	fmt.Println("short 함수 종료", time.Now())
}

func main() {
	fmt.Println("main 함수 시작: ", time.Now())

	go long()
	go short()

	time.Sleep(5 * time.Second)
	fmt.Println("main 함수 종료: ", time.Now())
}
```

결과
```
main 함수 시작:  2022-03-01 21:12:30.7620499 +0900 KST m=+1.809606901
short 함수 시작 2022-03-01 21:12:30.847062 +0900 KST m=+1.894619001
long 함수 시작 2022-03-01 21:12:30.847062 +0900 KST m=+1.894619001
short 함수 종료 2022-03-01 21:12:31.8491954 +0900 KST m=+2.896752401
long 함수 종료 2022-03-01 21:12:33.8548548 +0900 KST m=+4.902411801
main 함수 종료:  2022-03-01 21:12:35.847659 +0900 KST m=+6.895216001
```


메인 함수 안에서 long과 short 함수는 go 키워드로 호출되고, 두 함수는 각각 새 고루틴을 생성하며 동시에 시작한다.
각 함수에서는 시작과 종료 시 메시지를 출력하게 하여 실행 시점과 종료 시점을 알 수 있게 했다.


고루틴을 사용할 때 주의할 점이 있다. 실행 중인 고루틴이 있어도 메인 함수가 종료되면 프로그램이 종료된다.
그래서 아직 실행 중인 고루틴이 있다면 메인 함수가 종료되지 않게 해야 한다. 따라서 예시의 main 함수에서는 대기 시간을 잡아 놨다.
이와 같이 비정상적으로 종료되는 것을 막기 위해 메인 함수에서 충분히 긴 시간을 대기하는 것은 효율적이지 않다.
Go에서 제안하는 방법은 메인 함수에서 고루틴의 종료 시점을 확인할 수 있는 채널을 만들고, 만든 채널을 통해 종료 메시지를 대기시키는 것이다.


## 2. 채널(Channel)


`채널(channel)`은 고루틴끼리의 정보를 교환하고 실행의 흐름을 동기화하기 위해 사용된다.
채널은 일반 변수를 선언하는 것과 똑같이 선언하고, `make()` 함수로 생성한다.
채널을 정의할 때는 `chan` 키워드로 채널을 통해 주고받을 데이터의 타입을 지정해주어야 한다.


```go
// 채널 변수 선언 후 make() 함수로 채널 생성
var ch chan string
ch = make(chan string)

// make() 함수로 채널 생성 후 바로 변수에 할당
done := make(chan bool)
```


채널을 정의할 때 지정한 데이터 타입만 채널을 통해 주고받을 수 있다. 타입에 상관없이 받으려면 `chan interface{}` 처럼 타입을 지정하면 된다.
채널로 값을 주고받을 때는 `<-` 연산자를 사용한다.
`<-` 를 채널 변수 오른쪽에 작성하면 채널에 값을 전송하고, `<-`를 채널 변수 왼쪽에 작성하면 채널로부터 값을 수신한다.
채널에 값을 전송하거나 수신할 때 채널이 준비되어 있지 않으면 준비될때 까지 대기한다.


```go
ch <- "msg" // ch 채널에 "msg" 전송
m := <- ch  // ch 채널로부터 메시지 수신
```


고루틴 예시를 채널을 통해 아래와 같이 구현 가능하다.


```go
func long(done chan bool) {
	fmt.Println("long 함수 시작", time.Now())
	time.Sleep(3 * time.Second)
	fmt.Println("long 함수 종료", time.Now())
	done <- true
}

func short(done chan bool) {
	fmt.Println("short 함수 시작", time.Now())
	time.Sleep(1 * time.Second)
	fmt.Println("short 함수 종료", time.Now())
	done <- true
}

func main() {
	fmt.Println("main 함수 시작: ", time.Now())

	done := make(chan bool)
	go long(done)
	go short(done)

	<-done
	<-done
	fmt.Println("main 함수 종료: ", time.Now())
}
```

결과
```
main 함수 시작:  2022-03-01 21:12:30.7620499 +0900 KST m=+1.809606901
short 함수 시작 2022-03-01 21:12:30.847062 +0900 KST m=+1.894619001
long 함수 시작 2022-03-01 21:12:30.847062 +0900 KST m=+1.894619001
short 함수 종료 2022-03-01 21:12:31.8491954 +0900 KST m=+2.896752401
long 함수 종료 2022-03-01 21:12:33.8548548 +0900 KST m=+4.902411801
main 함수 종료:  2022-03-01 21:12:35.847659 +0900 KST m=+6.895216001
```

함수로 done 채널을 전달하고, 각 함수에서는 처리를 완료한 후 done 채널로 완료 메시지를 전달한다.
메인 함수에서는 done 채널로부터 메시지를 전달받고 프로그램을 종료한다.


## 3. 채널 방향


채널은 기본적으로 양방향 통신이 가능하다. 하나의 채널로 값을 송수신할 수 있지만, 실제로 채널을 구조체 필드로 사용하거나 함수의 매개변수로 전달하는 것이 일반적이다.
이때는 채널이 대부분 단방향으로만 사용된다. 채널을 단방향으로만 사용할때는 아래와 같이 방향을 지정해 사용할 수 있다.


```go
chan<- string // 송신 전용 채널
<-chan string // 수신 전용 채널
```


수신 전용 채널에 값을 전달하려고 하거나 송신 채널로부터 값을 수신하려고 하면 컴파일 오류가 발생한다.


## 4. 버퍼드 채널


채널은 지정한 크기의 버퍼를 가질 수 있다. 채널을 생성할 때 버퍼의 크기를 make의 두 번째 매개변수로 전달하면 버퍼드 채널(buffered channel)을 만들 수 있다.
버퍼드 채널은 비동기 방식으로 동작한다. 채널이 꽉 찰 때까지 채널로 메시지를 계속 전송할 수 있고, 채널이 빌 때까지 채널로부터 메시지를 계속 수신할 수 있다.

```go
ch := make(chan int, 100)
```

아래 코드는 버퍼가 꽉 찼는데도 메시지를 계속 전송해서 다음과 같은 에러가 발생한다.

```go
package main

import "fmt"

func main() {
	c := make(chan int, 2)
	c <- 1
	c <- 2
	c <- 3
	fmt.Println(<-c)
	fmt.Println(<-c)
	fmt.Println(<-c)
}
```

```
fatal error: all goroutines are asleep - deadlock!
```

코드를 다음과 같이 수정하면 고루틴에서 채널 c에 전송할 수 있을 때까지 대기하다가, 첫 번째 값을 수신해가는 즉시 바로 채널에 값을 전송한다.

```go
package main

import "fmt"

func main() {
	c := make(chan int, 2)
	c <- 1
	c <- 2
	go func() { c <- 3 }()
	fmt.Println(<-c)
	fmt.Println(<-c)
	fmt.Println(<-c)
}
```


## 5. close & range


채널에 더 이상 전송할 값이 없으면 `close(ch)`를 사용해서 채널을 닫을 수 있다. 채널을 닫은 후 메시지를 전송하면 에러가 발생한다.
채널의 수신자는 채널에서 값을 읽을 때 채널이 닫힌 상태인지 아닌지는 두 번째 매개변수로 확인 가능하다.


```go
v, ok := <-ch
```


ok의 값이 false라면 채널에 더 수신할 값이 없고 채널이 닫힌 상태이다.
`for i := range c` 는 채널 c가 닫힐 때까지 반복하여 채널로부터 수신을 시도한다.
채널을 꼭 닫을 필요는 없지만, range 루프를 돌며 채널에 수신할 값이 없는 것을 알아야 할 때는 채널을 닫아주면 된다.


## 6. select


select는 하나의 고루틴이 여러 채널과 통신할 때 사용한다. case로 여러 채널을 대기시키고 있다가 실행 가능한 상태가 되면 해당 케이스를 수행한다.
select 문에서 default 케이스는 case에 지정된 모든 채널이 사용 가능 상태가 아닐 때 수행한다.
default 케이스는 select 문에서 case의 채널들이 사용 가능 상태가 아닐 때 대기하지 않고 바로 무언가를 처리할 때 사용한다.


```go
func fibonacci(c, quit chan int) {
	x, y := 0, 1
	for {
		select {
		case c <- x:
			x, y = y, x+y
		case <-quit:
			fmt.Println("quit")
			return
		}
	}

}

func main() {
	c := make(chan int)
	quit := make(chan int)
	go func() {
		for i := 0; i < 10; i++ {
			fmt.Println(<-c)
		}
		quit <- 0
	}()
	fibonacci(c, quit)
}
```


고루틴과 채널은 기본적으로 동기식으로 동작하는 go언어에서 비동기 동작을 지원하는 아주 좋은 도구이다.
사용법도 간편하고 다른 저수준 제어에 비해 제어도 쉽다.

