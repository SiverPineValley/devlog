---
title: '[Go 언어 문법 정리] 01. 기초 문법'
date: 2022-03-01 21:02:17
category: 'Golang'
draft: false
---

<div align="left">
  <img src="./images/golang_book.jpg" width="200px" />
</div>


Go 언어 웹 프로그래밍 철저 입문 책으로 공부하면서 개인적으로 알아두면 좋은 문법 몇 가지를 정리해보려 한다.
매우 기초적인 문법까지는 너무 양이 많을 것 같아 제외하였고, 내 기준 신기한 문법만 정리해보았다.

</br>

## 1. 레이블


레이블이란 c 언어의 레이블과 유사하면서도 조금 다르게도 사용 가능한 문법이다.
아래 두 예시와 같이 대문자 + 콜론(:)의 형태로 레이블을 명시할 수 있다.
레이블의 역할은 특정 소스 구역을 명시적으로 지칭할 수 있고,  `goto` 문을 사용하여 해당 레이블 구역이 즉시 실행 가능하다.
go 언어에서는 추가적으로 아래와 같이 사용이 가능한데, 특정 for문 앞에 레이블을 명시하면, 해당 for문에 대한 레이블로 인식한다.
아래와 같이 `break`, `continue`에 명시적으로 표시가 가능하다.

- 예시1

```go
func useLable1() {
	x := 7
	table := [][]int{{1, 5, 9}, {2, 6, 5, 13}, {5, 3, 7, 5}}

LOOP:
	for row, rowValue := range table {
		for col, colValue := range rowValue {
			if colValue == x {
				fmt.Printf("found %d(row:%d, col:%d)\n", x, row, col)
				break LOOP
			}
		}
	}
}
```

결과
```
found 7(row:2, col:2)
```

</br>

- 예시2

```go
func useLable2() {
	x := 5
	table := [][]int{{1, 5, 9}, {2, 6, 5, 13}, {5, 3, 7, 4}}

LOOPCONTINUE:
	for row, rowValue := range table {
		for col, colValue := range rowValue {
			if colValue == x {
				fmt.Printf("found %d(row:%d, col:%d)\n", x, row, col)
				continue LOOPCONTINUE
			}
		}
	}
}
```

결과
```
found 5(row:0, col:1)
found 5(row:1, col:2)
found 5(row:2, col:0)
```


## 2. 가변 매개변수


가변 매개변수란 매개변수의 개수가 정해져 있지 않고 유동적으로 개수가 변할 때 사용 가능한 문법이다.
아래와 같이 매개변후 타입 앞에 생략 부호(...)를 붙여서 인식 가능하다.


```go
func multiParams(strings ...string) {
	for i := 0; i < len(strings); i++ {
		fmt.Printf(strings[i] + " ")
	}
}

func main() {
    multiParams("Variable", "Params", "example")
}
```

결과
```
Variable Params example
```


## 3. Call by Value, Call by Reference


매우 익숙한 용어들이다. Call by Value란 값에 의한 호출. 즉, 전달받은 인자를 복사하여 함수 내에서 사용하는 방식이다. 따라서 함수에 입력된 원본 변수에 영향이 가지 않는다.
Call by Reference란 참조에 의한 호출. 즉, 전달받은 인자의 주소 값을 직접 참조하여 직접 원본 값에 영향을 준다.
Golang은 기본적으로 Call by Value를 지원한다. C언어의 포인터를 지칭하는 *(아스테리크)를 사용하면 Call by Reference로도 사용 가능하다.

- 예시1

```go
// Call by value
func callbyValue(i int) {
	i = i + 1
}

func main() {
    var i int = 1
	callbyValue(i)
	fmt.Println("Call by Value: ", i)
}
```

결과
```
Call by Value: 1
```

</br>

- 예시2

```go
// Call by reference
func callbyReference(i *int) {
	*i = *i + 1
}

func main() {
    var i int = 1
    callbyReference(&i)
    fmt.Println("Call by Rererence: ", i)
}
```

결과
```
Call by Rererence: 2
```


## 4. defer


`defer` 키워드는 함수가 종료되기 전까지 특정 구문의 실행을 지연시켰다가, 함수가 종료되기 직전에 지연시켰던 구문을 수행한다. Java나 C#의 `final`같은 개념이다.
주로, 리소스를 해제시키거나 클렌징 작업이 필요할 때 사용한다.
아래 예시와 같이, `b()` 함수가 호출되었을 때, `leave(enter("b"))`가 defer로 처리되고 `a()`를 호출하도록 되어 있다.
`a()` 내에서는 마찬가지로 `leave(enter("a"))`가 defer로 처리된다.
`defer`로 처리되는 함수는 leave() 함수에 명시적으로 지정되어 있으므로, `enter()` 함수는 먼저 실행된다.
따라서 `enter()`에 대한 결과가 먼저 출력되며, 차례로 출력 함수, a함수가 호출되어 아래와 같은 결과가 출력되게 된다.

```go
func enter(s string) string {
	fmt.Println("entering: ", s)
	return s
}

func leave(s string) {
	fmt.Println("leaving: ", s)
}

func a() {
	defer leave(enter("a"))
	fmt.Println("in a")
}

func b() {
	defer leave(enter("b"))
	fmt.Println("in b")
	a()
}

func main() {
    b()
}
```

결과
```
entering:  b
in b
entering:  a
in a
leaving:  a
leaving:  b
```


## 5. Closure


클로저란 익명 함수로서 변수의 지정되어 일급 객체로 사용되는 경우의 익명 함수를 의미한다.
특정 변수에 선언될 수도 있으며, 특정 함수의 리턴되는 값 자체가 이러한 클로저일 수도 있다.
클로저는 선언될 때 현재 범위에 있는 변수의 값을 캡처하고, 호출될 때 캡쳐한 값을 사용한다.
클로저가 호출될 때 내부에서 사용하는 변수에 접근할 수 없더라도 선언 시점을 기준으로 해당 변수를 사용한다.


```go
// Closure Example
func makeSuffix(suffix string) func(string) string {
	return func(name string) string {
		if !strings.HasSuffix(name, suffix) {
			return name + suffix
		}
		return name
	}
}

func closureConst(value int) string {
	mappingTable := map[int]string{
		0: "SKT",
		1: "LG U+",
		2: "KT",
		3: "알뜰 SKT",
		4: "알뜰 LG U+",
		5: "알뜰 KT",
		6: "없음",
	}

	if value > 6 {
		value = 6
	}

	return mappingTable[value]
}

func main() {
    addZip := makeSuffix(".zip")
	addTgz := makeSuffix(".tar.gz")
	fmt.Println(addTgz("go1.5.1.src"))
	fmt.Println(addZip("go1.5.1.windows-amd64"))
	fmt.Println(closureConst(0))
	fmt.Println(closureConst(4))
	fmt.Println(closureConst(12))
}
```

결과
```
go1.5.1.src.tar.gz
go1.5.1.windows-amd64.zip
SKT
알뜰 LG U+
없음
```
