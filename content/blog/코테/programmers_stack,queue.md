---
title: '[프로그래머스 연습문제] 스택, 큐'
date: 2022-07-02 14:22:22
category: '코테'
draft: false
---

## [Level 2] 기능 개발

기능 개발은 순차적으로 배포 가능한 기능들의 완료 시점을 계산하여 특정 일에 몇 개의 기능을 배포할 수 있는지 계산하는 문제였다. 문제 자체는 매우 쉬우나, 테스트 케이스 11번에서 함정이 있다. 배포 가능 기간을 계산하는 공식 중 `(100 - 30) / 30`과 같이 특정 케이스에서 결과가 2.XXXXX와 같은 값으로 나오는 경우가 있다. 이런 경우를 방지하기 위해 나머지가 생기는 경우에는 +1을 해주도록 하였다.

</br>

```c++
#include <string>
#include <queue>
#include <vector>

using namespace std;

vector<int> solution(vector<int> progresses, vector<int> speeds) {
    vector<int> answer;
    queue<int> q;
    int size = progresses.size();
    
    // 큐에 담기
    for (int i = 0; i < size; i++) {
        if ((100-progresses[i]) % speeds[i] != 0) {
            q.push(((100 - progresses[i]) / speeds[i]) + 1);
            continue;
        }
        q.push((100 - progresses[i]) / speeds[i]);
    }
    
    // 하나씩 뽑기
    int now = 0;
    int job = 0;
    while(!q.empty()) {
        int f = q.front();
        q.pop();
        
        if (now == 0) {
            now = f;
            job++;
        } else if (now < f) {
            answer.push_back(job);
            job = 1;
            now = f;
        } else {
            job++;
        }
    }
    
    if (job != 0) {
        answer.push_back(job);        
    }

    return answer;
}
```

## [LEVEL 2] 프린터

프린터는 출력 우선순위에 따라 출력하는 순서를 정해 초기에 특정 location에 있던 출력물이 언제 출력되는지를 결과로 리턴하는 문제이다. 데이터 수가 많지 않아 그냥 O(n^2)으로 코드를 짰다. 주요 고려해야할 사항으로는 location의 변화를 기록해야 하고, max의 변화를 수시로 체크해야 하는 정도였다.

<br>

```c++
#include <string>
#include <vector>

using namespace std;

struct Wait {
    int priority;
    bool loc;
};

int solution(vector<int> priorities, int location) {
    int answer = 0;
    int size = priorities.size();
    int max = -1;
    vector<Wait> v;
    
    for(int i = 0; i < size; i++) {
        v.push_back(Wait{priorities[i], i == location});
        if (max < priorities[i]) {
            max = priorities[i];
        }
    }
    
    while(!v.empty()) {
        Wait f = v.front();
        v.erase(v.begin());
        if (f.priority < max) {
            v.push_back(Wait{f.priority, f.loc});
        } else {
            answer++;
            if (f.loc) {
                break;
            }
            
            max = -1;
            for(auto iter = v.begin(); iter != v.end(); iter++) {
                if (iter->priority > max) {
                    max = iter->priority;
                }
            }
        }
    }
    
    return answer;
}
```

## [LEVEL 2] 다리를 지나는 트럭

다리를 지나는 트럭 문제는 여러 댓수의 트럭이 다리를 지날 때 다리의 길이와 최대 적재 중량을 고려하여 언제 모든 트럭이 다리를 지날 수 있을지 구하는 문제이다. 알고리즘 유형은 시뮬레이션에 가깝다. 그러다보니 구현하기가 좀 어려운 편이였다. 테스트 케이스 중에 4,5,6,9번만 계속 실패했었는데, 나와 비슷하게 실패한 분들의 도움으로 원인을 알 수 있었다. `5, 5, [2,2,2,2,1,1,1,1,1], 19` 로 테스트 케이스를 돌려보면 11 -> 12초로 갈 때 지나가던 무게 2 차량이 빠지고 1차량이 하나 추가되는데, 진입하는 차량을 먼저 넣고 `continue` 되다보니, 빠져나가는 차량이 고려되지 않아 한번 빠져나가고 12초에 한번 더 진입하면서 문제가 발생하였다. 즉, 직전에 한 번 빠져나가고, 두번이 연속으로 들어올 때 고려하지 못한 케이스가 있던 것 이었다.


기존 코드가 맘에 들진 않지만 다 뒤집어 엎고 다시 짜기에는 너무 오래걸릴 것 같아서... 그냥 기존 코드에 내용을 추가하여 해결할 수 있었다. 위와 같은 함정 때문인지 체감 난이도는 LEVEL 3였다고 생각한다.

<br>

```c++
#include <string>
#include <vector>
#include <queue>

using namespace std;

struct Prog {
    int weight;
    int time;
};

int solution(int bridge_length, int weight, vector<int> truck_weights) {
    int time = 0;
    int size = truck_weights.size();
    int on_bridge = 0;
    queue<Prog> q;
    bool prev_out = false;

    while(!truck_weights.empty() || !q.empty()) {
        if (!truck_weights.empty()) {
            int f = truck_weights.front();
            // 다리에 더 들어갈 수 있을 때
            if (on_bridge + f <= weight) {
                if (!prev_out) {
                    time++;
                }
                q.push(Prog{f, time});
                truck_weights.erase(truck_weights.begin());
                on_bridge += f;
                prev_out = false;
                
                if (!q.empty()) {
                    Prog o = q.front();
                    if (bridge_length - (time - o.time) != 1) {
                        continue;
                    }
                }
                else continue;
            }
        }
        Prog o = q.front();
        time += bridge_length - (time - o.time);
        on_bridge -= o.weight;
        q.pop();
        prev_out = true;
    }
    
    return time;
}
```

## [LEVEL 2] 주식 가격

이전의 다리를 지나는 트럭 문제가 엄청 고생시킨 문제였다면, 이 문제는 엄청 간단했다. 각 주식 시간대별 가격이 얼마나 떨어지지 않느냐를 구하는 문제였다. 왜 스택/큐 문제인지는 모르겠으나, O(n^2)으로 해도 시간 안에 해결 가능한 문제라 그냥 간단하게 구현했다.

```c++
#include <string>
#include <vector>

using namespace std;

vector<int> solution(vector<int> prices) {
    vector<int> answer;
    int size = prices.size();
    
    for(int i = 0; i < size; i++) {
        int time = 0;
        for(int j = i + 1; j < size; j++) {
            if (prices[i] <= prices[j]) {
                time++;
                continue;
            }
            time++;
            break;
        }
        answer.push_back(time);
    }
    
    return answer;
}
```