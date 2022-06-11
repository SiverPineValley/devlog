---
title: '[Go 언어 문법 정리] 06. 패키지'
date: 2022-06-11 14:18:32
category: 'Golang'
draft: false
---

## 1. 운영체제에 종족적인 코드 처리


운영체제에 따라 코드가 다를 경우 다음과 같은 방식으로 처리할 수 있다.


1. ₩runtime.GOOS`로 운영체제를 확인한 후 분기 처리. 해당 상수는 runtime 패키지에 정의되어 있는 상수이고, 운영체제를 확인할 때 사용한다. 운영체제에 따라 darwin, freebsd, linux, windows를 반환하며 이 값으로 분기 처리를 한다.

2. 운영체제별로 .go 파일을 분리
패키지 안에 main.go, util_linux.go, util_windows.go 파일이 있을 때 리눅스로 빌드하면 util_windows.go 파일은 무시된다. 반대의 케이스도 마찬가지로 적용된다.

```go
package main

func main() {
    showOS()
}
```

```go
package main

import (
    "fmt"
    "runtime"
)

func showOS() {
    fmt.Println("현재 파일: util_darwin.go")
    fmt.Println(runtime.GOOS)
}
```

```go
package main

import (
    "fmt"
    "runtime"
)

func showOS() {
    fmt.Println("현재 파일: util_linux.go")
    fmt.Println(runtime.GOOS)
}
```

## 2. Refelction


reflect 패키지를 사용하면 프로그램의 메타 데이터를 활용하여 객체를 동적으로 제어할 수 있다. 즉, 런타임 시 타입이 정해지지 않은 값의 실제 타입을 확인하여 그 값의 메서드를 호출하거나 내부 필드에 접근할 수 있다.


### 2.1 타입/값 정보 확인


reflect 패키지를 이용해서 값의 타입과 실제 값을 확인할 수 있다. reflect.TypeOf(), reflect.ValueOf()가 그것이다. ValueOf() 함수에는 Bool(), Complex(), String(), Int() 와 같이 실제 값을 확인하는 메서드가 있다.


슬라이스와 맵 같은 컬렉션 타입이나 구조체도 리플렉션으로 메타 정보를 확인할 수 있다. 구조체의 태그 정보에 접근할 때도 리플렉션을 사용한다.


```go
type User struct{
    Name string "check:len(3,40)"
    Id int "check:range(1,999999)"
}

u := User{"Jang", 1}
uType := reflect.TypeOf(u)

if fName, ok := uType.FieldByName("Name"); ok {
    fmt.Println(fName.Type, fName.Name, fName.Tag)
}

if fId, ok := uType.FieldByName("Id"); ok {
    fmt.Println(fId.Type, fId.Name, fId.Tag)
}
```


### 2.2 값 변경


reflect.Value 내부의 실제 값이 변경할 수 있는 값이라면 그 값을 동적으로 변경할 수 있다. 변경 가능한 값인지는 reflect.Value.CanSet() 메서드로 확인한다. int, float64, string처럼 변경할 수 없는 값은 그 값을 SetXXX 메서드로 변경할 수 없다. 하지만 Elem() 메서드를 사용하여 주소에 접근하는 방법을 통해 다른 값으로 교체할 수 있다.

```go
x := 1
if v := refelct.ValueOf(x); v.CanSet() {
    v.SetInt(2) // 호출되지 않음
}

fmt.Println(x) // 1

v := reflect.ValueOf(&x)
p := v.Elem()
p.SetInt(3)
fmt.Println(x) // 3
```


### 2.3 함수/메서드 동적 호출


리플렉션을 사용하면 동적으로 함수나 메서드를 호출할 수 있다. 다음 예제는 TitleCase() 함수를 두 번 호출하여 결과값을 출력하는데, 첫 번째 함수를 바로 호출하고 두 번째는 리플렉션을 사용한다.


```go
func TitleCase(s string) string {
    return strings.Title(s)
}

func main() {
    caption := "go is an open source programming language"

    // TitleCase를 바로 호출
    title := TitleCase(caption)
    fmt.Println(title)

    // TitleCase를 동적으로 호출
    titleFuncValue := reflect.ValueOf(TitleCase)
    values := titleFuncValue.Call([]reflect.Value{reflect.ValueOf(caption)})
    title = values[0].String()
    fmt.Println(title)
}
```

```go
func Len(x interface{}) int {
    value := reflect.ValueOf(x)
    switch refelct.TypeOf(x).Kind() {
        case reflect.Array, reflect.Chan, reflect.Map, reflect.Slice, reflect.String:
            return Value.Len()
        default:
            if method := value.MethodByName("Len"); method.IsValid() {
                values := method.Call(nil)
                return int(Values[0].Int())
            }
    }

    panic(fmt.Sprintf("'%v' does not hiave a length", x))
}

func main() {
    a := list.New()
    b := list.New()
    b.PushFront(0.5)
    c := map[string]int{"A": 1, "B": 2}
    d := "one"
    e := []int{5, 0, 4, 1}

    fmt.Println(Len(a), Len(b), Len(c), Len(d), Len(e))
}
```

## 3. Test


Go는 기본 라이브러리로 제공되는 testing 패키지로 유닛 테스트를 할 수 있다.
`go test` 명령어를 실행하면 패키지 디렉터리에 있는 테스트 파일에서 테스트 함수를 찾아 테스트를 수행한다.


- 테스트 파일: 파일 이름이 _test.go로 끝나는 파일
- 테스트 함수: 함수 이름이 Test로 시작하고 *testing.T를 매개변수로 받는 함수


테스트 함수의 성공/실패는 testing.T.Errorf()와 같은 테스트 실패 메서드를 호출하는 것으로 결정된다. 테스트 함수 내에서 testing.T.Errorf()와 같은 테스트 실패 메서드를 호출하면 해당 함수는 FAIL로 처리되고, 테스트 실패 메서드를 호출하지 않으면 SUCCESS로 처리된다. Errorf() 메서드 외에도 testing.T.Fail(), testing.T.Fatal()과 같은 메서드도 있다. 이러한 메서드를 통해 FAIL의 레벨을 제어할 수 있다.

다음은 앞서 작성한 Len() 함수의 유닛 테스트 파일이다.


```go
package main

import (
    "testing"
)

func TestLenForMap(t *testing.T) {
    v := map[string]int{"A": 1, "B": 2}
    actual, expected := Len(v), 2
    if actual != expected {
        t.Errorf("%d != %d", actual, expected)
    }
}

func TestLenForString(t *testing.T) {
    v := "one"
    actual, expected := Len(v), 3
    if actual != expected {
        t.Errorf("%d != %d", actual, expected)
    }
}

func TestLenForSlice(t *testing.T) {
    v := []int{5, 0, 4, 1}
    actual, expected := Len(v), 4
    if actual != expected {
        t.Errorf("%d != %d", actual, expected)
    }
}

func TestLenForChan(t *testing.T) {
    v := make(chan int)
    actual, expected := Len(v), 1
    if actual != expected {
        t.Errorf("%d != %d", actual, expected)
    }
}
```


go test로 돌려보면 위 세개는 PASS, 마지막 하나가 FAIL하여 전체 테스트 결과가 FAIL로 발생하는 것을 확인할 수 있다.


testing 패키지는 벤치마크 테스트 기능도 제공한다. _test.go 파일에 이름은 Benchmark로 시작하고 *testing.B를 매개변수로 받는 함수가 있으면 Go는 이 함수를 벤치마크 함수로 인식한다.


```go
func BenchmarkLenForString(b *testing.B) {
    b.StopTimer()
    v := make([]string, 1000000)
    for i := 0; i < 1000000; i++ {
        v[i] = strconv.Itoa(i)
    }
    b.StartTimer()
    for i := 0; i < b.N; i++ {
        Len(v[i%1000000])
    }
}
```

이 함수는 시작 부분에서 타이머를 멈추게 했다(b.StopTimer()). 벤치마크 테스트를 위한 테스트 데이터를 생성하는 시간은 측정되지 않게 하기 위해서다. 테스트 데이터 생성이 끝난 후에는 다시 타이머를 시작하게 했다(b.StartTimer()).


벤치마크 테스트를 수행하려면 go test 명령어를 수행할 때 -bench 옵션과 벤치마크를 수행하려는 함수 이름에 대한 정규표현식을 함께 전달해야 한다.


```shell
go test -test.bench=.
```

