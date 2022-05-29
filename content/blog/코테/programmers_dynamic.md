<!-- ---
title: '[프로그래머스 연습문제] Dynamic Programming'
date: 2022-03-01 20:03:17
category: '코테'
draft: false
--- -->

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

처음에는 삼각형 꼭대기에서 내려가는 방식으로 구현하려 했으나... 재귀형식으로 풀이는 가능하나
효율성이 떨어지는지 일부 테스트 케이스를 통과를 못해서 아래쪽에서부터 올라가는 방식으로 재구현했다.


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
            // 삼각형 제일 왼쪽 끝인 경우
            if(j == 0){
                d[i][j] = d[i-1][j] + triangle[i][j];
            // 삼각형 제일 오른쪽 끝인 경우
            }else if(j == i){
                d[i][j] = d[i-1][j-1] + triangle[i][j];
            }
            // 삼각형 내부인 경우
            else{
                d[i][j] = max(d[i-1][j-1], d[i-1][j]) + triangle[i][j];
            }
            
            answer = max(answer, d[i][j]);
        }
    }
    return answer;
}
```
