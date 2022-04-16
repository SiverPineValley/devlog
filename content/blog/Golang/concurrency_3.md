---
title: '[Go 언어 문법 정리] 04. 병행 처리 (3) 병행 처리 활용'
date: 2022-04-16 21:55:23
category: 'Golang'
draft: false
---

앞서 배운 병행 처리 코드를 다양하게 활용하여 네 가지 패턴을 만들어보았다.

|활용|내용|
|---|------|
|타임아웃|시간이 오래 걸리는 작업에 타임아웃 처리하기|
|공유 메모리|채널을 사용하여 여러 고루틴의 공유 메모리 접근 제어하기|
|파이프라인|여러 고루틴을 파이프라인 형태로 연결하기|
|맵 리듀스|고루틴을 사용하여 맵리듀스 패턴 구현하기|

# 1. 타임아웃

시간이 오래 걸리는 작업에 select문을 사용하면 타임아웃 기능을 쉽게 구현할 수 있다.
아래 소스 코드는 채널을 사용하여 타임아웃 패턴을 구현하였다.
process 함수 내에서 타임아웃이 되기 전에 작업이 끝나면 done 채널에 메시지가 먼저 전달되어 select 문에서 done 케이스가 먼저 실행된다.
반대로, 타임아웃이 되면 process 함수 내로 quit 채널에 값이 전달되어 함수가 그대로 종료된다.

이렇게 구현된 이유는 먼저, process 내에서 quit 채널에 대한 처리를 하지 않는다면 타임아웃되더라도 done 채널은 그대로 동작한다.
물론, 엄마 함수가 메모리에서 제거되었기 때문에 done 채널에 값은 전달되어도 그냥 무시된다.

만약, 타임아웃 되었을 때 done 채널을 닫으면(close) done 채널이 전달될 때 런타임 에러(panic: send on closed channel)이 발생한다.
타임아웃으로 done 채널을 닫을 때는 process() 함수에서 done 채널은 외부에서 닫힐 수 있다는 것을 고려해야 한다.

예제처럼 process()함수에 quit 채널을 전달해주면, 에러 처리를 별도로 하지 않더라도 정상 동작이 가능하다.

```go
import (
    "fmt"
    "time"
)

func main() {
    quit := make(chan struct{})
    done := process(quit)
    timeout := time.After(1 * time.Second)

    select {
        case d := <-done:
        fmt.Println(d)
        case <-timeout:
        quit <- struct{}{}
        fmt.Println("Time out!!")
    }
}

func process(quit <- chan struct{}) chan string {
    done := make(chan string)
    go func() {
        go func() {
            time.Sleep(10 * time.Second) // heavy job

            done <- "Complete !!"
        }()
        <- quit
        return
    }()

    return done
}
```

# 2. 공유 메모리

여러 스레드에서 공유 메모리를 사용할 때는 보통 스레드 하나에서 공유 메모리에 접근하는 것을 보장하기 위해 Critical Section의 코드를 실행 하기 전에 Mutex를 잠그고, 처리를 완료한 후에 해제한다. 이전에 배운바와 같이 Go에서도 sync 패키지를 사용하여 Mutex를 사용할 수 있다.

하지만, Go는 메모리를 공유하는 방식이 아니라 채널을 통해 메시지를 전달하는 방식으로 여러 고루틴간의 동기화를 권장한다.
본 장에서는 공유 메모리를 구현하기 위해 아래와 같은 구조체를 정의하였다.

```go
const (
    set = iota
    get
    remove
    count
)

type SharedMap struct {
    m map[string]interface{}
    c chan commond
}

type command struct {
    key string
    value interface{}
    action int
    result chan<- interface{}
}
```

SharedMap 내부에서는 실제 맵 정보를 가리키는 `m m[string]interface{}{}` 필드와 채널을 통해 SharedMap에 명령을 전달할 `c chan command` 필드가 있다.
key와 value, 수행할 액션을 나타내는 action을 command 구조체에 담아 채널로 전달하고, 처리 결과는 command 구조체의 result 채널로 확인한다.
result는 결과를 전송달하기 위한 용도로만 사용되므로, 송신 전용 채널 (chan<-)으로 정의했다.

command의 action으로 사용할 값은 코드 상부의 상수로 정의한다.
위 사전 정의된 내용을 사용하여 아래와 같이 공유 메모리 예제를 구현할 수 있다.

```go
import "fmt"

func (sm SharedMap) Set(k string, v interface{}) (r bool) {
    callback := make(chan interface{})
    sm.c <- command{action: set, key: k, value: v, result: callback}
    r = (<-callback).(bool)
    return
}

func (sm SharedMap) Get(k string) (v interface{}, r bool) {
    callback := make(chan interface{})
    sm.c <- command{action: get, key: k, result: callback}
    result := (<-callback).([2]interface{})
    v = result[0]
    r = result[1].(bool)
    return
}

func (sm SharedMap) Remove(k string) (r bool) {
    callback := make(chan interface{})
    sm.c <- command{action: remove, key: k, result: callback}
    r = (<-callback).(bool)
    return
}

func (sm SharedMap) Count() (r int) {
    callback := make(chan interface{})
    sm.c <- command{action: count, result: callback}
    r = (<-callback).(int)
    return
}

func (sm SharedMap) run() {
    for cmd := range sm.c {
  switch cmd.action {
            case set:
                sm.m[cmd.key] = cmd.value
                _, ok := sm.m[cmd.key]
                cmd.result <- ok
            case get:
                v, ok := sm.m[cmd.key]
                cmd.result <- [2]interface{}{v, ok}
            case remove:
                _, ok := sm.m[cmd.key]
                if !ok {
                    cmd.result <- false
                } else {
                    delete(sm.m, cmd.key)
                    _, ok = sm.m[cmd.key]
                    cmd.result <- !ok
                }
            case count:
                cmd.result <- len(sm.m)
  }
    }
}

func NewMap() SharedMap {
    sm := SharedMap{
        m: make(map[string]interface{}),
        c: make(chan command),
    }
    go sm.run()
    return sm
}

func main() {
    m := NewMap()

    // Set item
    ok := m.Set("foo", "bar")
    fmt.Println(ok)

    // Get item
    t, ok := m.Get("foo")

    // Check if item exists
    if ok {
        bar := t.(string)
        fmt.Println("bar: ", bar)
    }

    // Remove item
    ok = m.Remove("foo")
    fmt.Println(ok)

    // Count item
    fmt.Println("Count: ", m.Count())

    return
}
```

# 3. 파이프라인

유닉스에서는 셸 명령어를 파이프라인(|)으로 연결할 수 있다. 파이프를 통해 셸 명령어를 실행하면 파이프 이전 명령어의 output이 파이프 이후 명령어의 input으로 입력된다.

```shell
find src | grep .go$ | xargs wc -l
```

위 명령은 src 디렉터리의 파일 중 (find src), 파일 이름이 .go로 끝나는 파일을 필터링해서(grep .go$), 파일의 정보를 라인 수와 함께 출력한다. (xargs wc -l)
Go에서는 기본 라이브러리인 ip.Pipe()를 사용하면 유닉스 스타일로 파이프라인을 생성할 수 있다.
`io.Pipe()`를 호출하면 *PipeReader와*PipeWriter가 반환되는데, 두 함수는 내부적으로 연결되어 있어서, *PipeReader의 결과가*PipeWriter의 입력으로 바로 전달된다. 하지만 `io.Pipe()`는 두 함수간 연결으로만 동작하므로, 다양하게 활용하기에는 제약이 있다.

위의 스크립트를 고루틴으로 구현하기 위해서는 세 가지 함수 구현이 필요하다.

1. find(path string) <- chan string
2. grep(pattern string, in <-chan string) <-chan string
3. display(in <- chan result)

함수 세 개를 다음과 같이 채널로 연결할 수 있다.

```go
path, pattern := pargeAgrs()
ch1 := find(path)
ch2 := grep(pattern, ch1)
display(ch2)
```

find()함수의 결과는 grep() 함수의 매개변수로 전달되고, grep()의 결과는 display()의 매개변수로 전달된다.
이를 main()에서 아래와 같이 구현이 가능하다. 이를 통해 display()에서 반환한 채널을 대기시켜 전체 작업이 완료될 때 까지 프로그램을 종료시키지 않고 대기시킬 수 있다.

```go
type Job struct { name, log string }
type jobHandler func(Job) Job

func pipe(handler jobHandler, in <- chan Job) <-chan Job
```

이를 모두 이용하면 다음과 같이 구현 가능하다.

```go
const BUF_SIZE = 1000

var (
 workers = runtime.NumCPU()
)

func Find(path string) <-chan string {
 out := make(chan string, BUF_SIZE)
 done := make(chan struct{}, workers)
 for i := 0; i < workers; i++ {
  go func() {
   filepath.Walk(path, func(file string, info os.FileInfo, err error) error {
    out <- file
    return nil
   })
   done <- struct{}{}
  }()
 }
 go func() {
  for i := 0; i < cap(done); i++ {
   <-done
  }
  close(out)
 }()

 return out
}

func Grep(pattern string, in <-chan string) <-chan string {
 out := make(chan string, cap(in))
 go func() {
  regex, err := regexp.Compile(pattern)
  if err != nil {
   fmt.Println(err)
   return
  }

  for file := range in {
   if regex.MatchString(file) {
    out <- file
   }
  }
  close(out)
 }()
 return out
}

func Show(in <-chan string) <-chan struct{} {
 quit := make(chan struct{})
 go func() {
  for file := range in {
   c, err := lineCount(file)
   if err != nil {
    fmt.Println(err)
    continue
   }
   fmt.Println("8d %s\n", c, file)
  }
  quit <- struct{}{}
 }()
 return quit
}

func lineCount(file string) (int, error) {
 f, err := os.Open(file)
 if err != nil {
  return 0, err
 }
 defer f.Close()

 info, err := f.Stat()
 if err != nil {
  return 0, err
 }

 if info.Mode().IsDir() {
  return 0, fmt.Errorf("%s is a directory", file)
 }

 count := 0
 buf := make([]byte, 1024*8)
 newLine := []byte{'\n'}

 for {
  c, err := f.Read(buf)
  if err != nil && err != io.EOF {
   fmt.Println(err)
   return 0, err
  }

  count += bytes.Count(buf[:c], newLine)

  if err == io.EOF {
   break
  }
 }
 return count, nil
}

func main() {    
 runtime.GOMAXPROCS(runtime.NumCPU())
 path := "/Users/parkjongin/workspace/go/src/golang-practice"
 pattern := ".go$"
 <-common.Show(common.Grep(pattern, common.Find(path)))
 return
}
```
