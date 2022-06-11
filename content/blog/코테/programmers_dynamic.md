---
title: '[프로그래머스 연습문제] Dynamic Programming'
date: 2022-06-11 16:00:22
category: '코테'
draft: false
---

이번에는 다이나믹 프로그래밍 문제들을 풀어보았다.
DP 알고리즘은 개념 자체가 생소하고 문제에 적용하기 어려워 그런지 LV3 이상 문제부터 있었다.

## [Level 3] N으로 표현

레벨 3인데 난이도가 생각보다 어려웠다... DP를 어떻게 적용할 수 있을까를 엄청 고민했다가 처음에 크게 실수 했다.
처음 생각한 방안은 각 메모리에 메모리 인덱스를 만들 수 있는 가장 최소가 되는 개수를 넣는 방법이었다.
하지만 이렇게 구현하려면, 메모리를 몇개 까지 제한을 둬야 하는지, 0은 어떻게 처리할지 등 고민할게 너무 많아서 다른 방법을 찾아보다
각 인덱스를 횟수로 두고, 각 횟수에서 가능한 숫자가 몇인지를 기록하는 방법이었다.
즉, 반대로 저장하는 것이 정답이었다.

기록은 unordered_set을 사용했는데, set 자료구조 자체가 중복되는 값을 저장하지 않고,
unorderd_set은 순서도 고려하지 않아 일반 set보다 더 효율적이라 사용하였다.

코드의 전체적인 구조는 아래와 같다.
각 단계에서 가능한 연산은 +, -, *, /, NN이었는데, 각 단계별로 연산한 값을 저장하고
마지막에 number가 저장되었는지 확인해서 리턴해주면 되는 식으로 구현하였다.

</br>

```c++
#include <vector>
#include <unordered_set>

using namespace std;

int getN(int N, int idx) {
    int accum = N;
    
    for (int i = 0; i < idx; i++) {
        accum = accum * 10 + N;
    }
    
    return accum;
}

int solution(int N, int number) {
    if (N == number) return 1;
    vector<unordered_set<int>> arr(8);
    arr[0].insert(N);
    
    for (int i = 0; i < 8; i++) {
        // N 연속 붙이는 부분 넣기
        arr[i].insert(getN(N, i));
        
        // 나머지 사칙연산 넣기
        for (int j = 0; j < i; j++) {
            for (int k = 0; k < i; k++) {
                if (j + k + 1 != i) continue;
                    for (int a : arr[j]) {
                        for (int b : arr[k]) {
                            arr[i].insert(a + b);

                            if (a - b > 0) {
                                arr[i].insert(a - b);
                            }

                            arr[i].insert(a * b);

                            if (a / b > 0) arr[i].insert(a / b);
                    }
                }
            }
        }
        if (arr[i].find(number) != arr[i].end())
            return i + 1; 
    }
    
    return -1;
}
```

</br>


## [Level 3] 정수 삼각형


정석적인 다이나믹프로그래밍 문제였다.
이번에는 top-down이 아닌, bottom-up 반복문으로 풀이해보았다.

풀이 방법은 각 삼각형 노드 방문 시 끝부분일 경우에는 여러 노드를 방문하지 않도록 예외 케이스를 주었다는 점이다.
또 신기한 것이 기존처럼 매크로 3항 연산 함수를 사용하는 것보다 아래와 같이 그냥 함수를 사용하는 것이 더 효율성이 좋다는 점 이었다.


```c++
#include <string>
#include <vector>

using namespace std;
int answer, height, d[501][501];
int max(int a, int b){
    return a > b ? a : b;
}

int solution(vector<vector<int>> triangle) {
    answer = d[0][0] = triangle[0][0];
    height = triangle.size();
    
    for(int i=1; i<height; i++){
        for(int j=0; j<=i; j++){
            if(j == 0){
                d[i][j] = d[i-1][j] + triangle[i][j];
            }else if(j == i){
                d[i][j] = d[i-1][j-1] + triangle[i][j];
            }
            else{
                d[i][j] = max(d[i-1][j-1], d[i-1][j]) + triangle[i][j];
            }
            
            answer = max(answer, d[i][j]);
        }
    }
    return answer;
}
```


## [Level 4] 도둑질


고득점 Kit 다이나믹 프로그래밍 문제 중 가장 난이도가 높은 문제이다.
문제 자체는 이해하기 쉬운 편이다. 집이 순환형으로 배치되어 있을 때 연속되는 집을 방문하지 않고 방문해서 가장 큰 수익을 얻을 수 있는 방법을 찾는 문제였다.
다만, 문제가 간단하고 제한사항이 많지 않았지만 순환형으로 집이 배치되어 있다는 점 때문에 난이도가 급 상승하게 된다.


처음 점화식 세울 때도 고민을 했는데, 찾아낸 방법은 처음부터 집의 가치를 누적해간다고 했을 때 `현재 단계 누적 가치 = max(이전 단계 누적 가치, 전전 단계 누적 가치 + 현재 집 가치)` 이다. 집이 일자로 배치되어 있고, 지금 문제처럼 이어지 있지 않을 때는 이 방법으로 바로 계산이 가능하나, 순환형 배치라 여기서 더 고민이 추가되어야 한다.


첫 번째 집을 고르면 마지막 집을 고르지 말아야 하고, 마지막 집을 고르면 첫 번째 집을 고르지 말아야 한다. 이 부분을 어떻게 구현해야 할지 엄청나게 고민했지만 혼자서는 결론을 내지 못하고 있다가 [누군가의 해설](https://programmers.co.kr/questions/31576) 덕분에 방법을 찾아낼 수 있었다. 이 분도 나랑 같은 고민을 꽤나 현명하게 해결하셨는데, 그냥 마지막 집이 빠진 배열, 첫 번째 집이 빠진 배열 두개로 나눠 동시에 구하면 된다는 것 이었다. 또한, 각 배열 앞에 0을 추가하여 첫 번째 점화식 적용 지점에서 첫 번째, 두 번째 집을 비교할 수 있도록 하면 굉장히 쉽게 해결이 가능하다.


역시 정답 또한 간단했다.


```c++
 #include <string>
#include <vector>

using namespace std;

int max(int a, int b) {
    if (a > b) return a;
    return b;
}

int solution(vector<int> money) {
    int num = money.size();
    vector<int> first(num, 0);
    vector<int> second(num, 0);
    
    for(int i = 1; i < num; i++) {
        first[i] = money[i-1];
        second[i] = money[i];
    }
    
    for(int i = 2; i < num; i++) {
        first[i] = max(first[i - 1], first[i - 2] + first[i]);
        second[i] = max(second[i - 1], second[i - 2] + second[i]);
    }
    
    return max(first[num - 1], second[num - 1]);
}
```