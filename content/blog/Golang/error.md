---
title: '[Go 언어 문법 정리] 05. 에러 처리'
date: 2022-05-29 17:03:25
category: 'Golang'
draft: false
---


## 1. 런타임 에러와 패닉


실행 중에 에러가 발생하면 Go 런타임은 패닉을 발생시킨다. 패닉이 발생하면 패닉 에러 메시지가 출력되고 프로그램이 종료된다.
에러 상황이 심각해서 프로그램을 더 이상 실행할 수 없을 때는 panic() 함수를 사용해 강제로 패닉을 발생시키고 프로그램을 종료할 수 있다.


```go
package main

import "fmt"

func main() {
    fmt.Println(devide(1,0))
}

func divide(a, b int) int {
    return a / b
}
```


함수 안에서 panic()이 호출되면 현재 함수의 실행을 즉시 종료하고 모든 defer 구문을 실행한 후 자신을 호출한 함수로 패닉에 대한 제어권을 넘긴다. 이러한 작업은 함수 호출 스택의 상위 레벨로 올라가며 계속 이어지고, 프로그램 스택의 최상단(main 함수)에서 프로그램을 종료하고 에러 상황을 출력한다. 이러한 작업을 `패니킹(panicking)` 이라 한다.


## 2. recover


recover() 함수는 패니킹 작업으로부터 프로그램의 제어권을 다시 얻어 종료 절차를 중지시키고 프로그램을 계속 이어갈 수 있게 한다.


recover()는 반드시 defer 안에서 사용해야 한다. recover()를 호출하면 패닉 내부의 상황을 error 값으로 복원할 수 있다. recover()로 패닉을 복원한 후에는 패니킹 상황이 종료되고 함수 반환 타입의 제로 값이 반환된다. 이는 자바나 .Net의 try-catch 블록과 유사하다.


```go
func main() {
    fmt.Println("result: ", divide(1,0))
}

func divide(a, b int) {
    defer func() {
        if err := recover(); err != nil {
            fmt.Println(err)
        }
    }()
    return a / b
}
```


다음 protect() 함수는 코드 블록을 클로저로 만들어 넘기면 예상치 못한 패닉에 의해 프로그램이 비정상적으로 종료되는 것을 막을 수 있다.


```go
package main

import "fmt"

func protect(g func()) {
    defer func() {
        log.Println("done")

        if err := recover; err != nil {
            log.Printf("run time panic: %v", err)
        }
    }()

    log.Println("start")
    g()
}

func main() {
    protect(func() {
        fmt.Println(divide(4,0))
    })
}

func divide(a, b int) int {
    return a / b
}
```


## 3. 클로저로 에러 처리


함수가 항상 defer-panic-recover 블록 안에서 실행되도록 클로저를 만들어 반환하는 에러 핸들러 함수를 만들어 보자.


```go
type fType func(int, int) int

func errorHandler(fn fType) fType {
    return func(a int, b int) int {
        defer func() {
            if err, ok := recover().(error); ok {
                log.Printf("run time panic: %v", err)
            }
        }()
        return fn(a, b)
    }
}

func main() {
    fmt.Println(errorHandler(divide)(4,2))
    fmt.Println(errorHandler(divide)(3,0))
}

func divide(a int, b int) int {
    return a / b
}
```


이 처럼 특정 함수 서명에 에러 핸들러 함수를 만들어 놓으면, 서명이 같은 함수는 모두 defer-panic-recover 블록 안에서 실행시킬 수 있다.
에러 핸들러 방식의 단점은 같은 함수 서명에서만 에러 핸들러를 적용할 수 있다는 점이다. 하지만 에러 핸들러에서 처리하는 함수의 매개변수와 반환 타입을 빈 인터페이스 슬라이스(...interface{})로 정의하면 모든 형태의 함수를 처리할 수 있다.

