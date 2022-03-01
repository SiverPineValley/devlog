---
title: '[프로그래머스 연습문제] BFS, DFS'
date: 2022-03-01 20:03:17
category: '코테'
draft: false
---

오랜만에 DFS, BFS 문제들을 풀어보았다.
주로 DFS 기법을 자주 사용하여 풀었다.


## [Level 2] 타겟 넘버


DFS, BFS 문제 중 간단한 편에 속하는 문제이다. Queue를 사용하였고, 노드별 가지가 2개밖에 되지 않아 간단하게 구현 가능하다.
다만, 기존에 C++로 문제를 제출한 이력이 있어서 Go언어로 다시 풀어보았다. Go언어에는 Queue와 같은 자료구조 라이브러리가 부실해서 직접 Queue 자료구조를 구현하였다.
Queue 구현 시 `https://yoongrammer.tistory.com/54` 올려진 자료를 참고하였다.

</br>

먼저, Queue 자료구조를 구현한 부분은 아래와 같다.
Queue 타입을 선언하고 Queue 타입의 포인터 리터럴을 받는 함수 세개를 구현하였다.

</br>

```go
type Queue []interface{}

func (q *Queue) IsEmpty() bool {
    return len(*q) == 0
}

func (q *Queue) Push(v interface{}) {
    *q = append(*q, v)
}

func (q *Queue) Pop() (v interface{}) {
    if q.IsEmpty() {
        return nil
    }
    
    v = (*q)[0]
    *q = (*q)[1:]
    return   
}
```

</br>

실제 코드는 아래와 같다.
위의 Queue 자료구조 사용 시 주의할 점은 Pop()에서 interface{}를 리턴하므로 Queue에 넣었던 타입으로 형변환해서 사용해야 한다는 점이다.

</br>

```go
type Queue []interface{}

func (q *Queue) IsEmpty() bool {
    return len(*q) == 0
}

func (q *Queue) Push(v interface{}) {
    *q = append(*q, v)
}

func (q *Queue) Pop() (v interface{}) {
    if q.IsEmpty() {
        return nil
    }
    
    v = (*q)[0]
    *q = (*q)[1:]
    return   
}

type Node struct {
    Now int
    Value int
}

func solution(numbers []int, target int) (result int) {
    op := []int{-1, 1}
    length := len(numbers) - 1
    q := Queue{}
    
    q.Push(Node{0,numbers[0]})
    q.Push(Node{0,numbers[0] * -1})
    
    for !q.IsEmpty() {
        v := q.Pop().(Node)
        
        if v.Now == length - 1 {
            r1 := v.Value + op[0] * numbers[v.Now + 1]
            r2 := v.Value + op[1] * numbers[v.Now + 1]
            
            if r1 == target {
                result++
            }
            if r2 == target {
                result++
            }
            continue
        }
        
        q.Push(Node{v.Now + 1, v.Value + op[0] * numbers[v.Now + 1]})
        q.Push(Node{v.Now + 1, v.Value + op[1] * numbers[v.Now + 1]})
    }
    
    return
}
```


## [Level 3] 네트워크


네트워크는 노드별 연결되어 있는 개수를 찾는 문제이다.
BFS를 사용하였으며, 방문 가능한 모든 노드를 한번에 방문한다.
각 방문한 노드는 visit에 기록하여, 이미 방문한 노드는 다시 방문하지 않도록 한다.
하나의 네트워크를 찾았으면, 다음 방문하지 않은 노드부터 네트워크를 찾기 시작한다.

</br>

```c++
#include <string>
#include <vector>
#include <queue>

using namespace std;

int solution(int n, vector<vector<int>> computers) {
    int answer = 0;
    vector<bool> visit(n, false);
    queue<int> q;
    
    for(int i = 0; i < n; i++) {
        if (visit[i]) {
            continue;
        }
        
        q.push(i);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            if (visit[v]) continue;
            visit[v] = true;
            
            for(int j = 0; j < n; j++) {
                if(computers[v][j] && !visit[j]) {
                    q.push(j);
                }
            }
        }
        answer++;
    }
    
    return answer;
}
```


## [Level 3] 단어 변환


단어 변환은 begin 단어에서부터 words 내에 있는 단어 중 하나의 문자만 변경해서 target까지 최소 몇 번의 변환을 거쳐야 가능한지 구하는 문제이다.
역시 BFS 알고리즘을 사용하였으며, 각 노드에는 현재 단어와 방문한 단어를 기록해놓는다.
네트워크보다 복잡한 점은 이미 방문했던 노드를 한번씩만 기록하는게 아니라, 각 노드를 방문한 시점에 방문했던 노드가 각각 다르다는 것이다.
따라서 queue에 위와 같이 현재 단어와 방문했던 단어를 모두 기록했다.
네트워크보단 복잡하지만 엄청 어렵거나 하진 않았다.

</br>

```c++
#include <string>
#include <vector>
#include <queue>
#include <map>

using namespace std;

struct alpa {
    string now;
    map<string,bool> visit;
};

bool compare(string now, string target) {
    int length = now.size();
    int diff = 0;
    for(int i = 0; i < length; i++) {
        if (now[i] != target[i]) {
            if (diff) {
                return false;
            }
            diff++;
        }
    }
    
    return diff == 1;
}

int solution(string begin, string target, vector<string> words) {
    int answer = 51;
    int length = words.size();
    queue<alpa> q;    
    q.push({begin,map<string,bool>()});
    
    while(!q.empty()) {
        alpa f = q.front();
        q.pop();
        
        if (f.now == target) {
            int tempAnswer = f.visit.size();
            if (tempAnswer < answer && tempAnswer != 0) {
                answer = tempAnswer;
            }
            continue;
        }
        
        f.visit[f.now] = true;
        for(int i = 0; i < length; i++) {
            if (f.now == words[i] || f.visit.count(words[i]) > 0) {
                continue;
            }
            
            if (compare(f.now, words[i])) {
                q.push({words[i], f.visit});
            }
        }
    }
    
    if (answer == 51) {
        answer = 0;
    }
    
    return answer;
}
```


## [Level 3] 여행경로


여행경로는 모든 티켓을 사용해서 모든 노드를 방문할 수 있는 경우의 수 중에서 알파벳순으로 가장 앞에 오는 경로를 리턴하면 된다.
탐색은 동일하게 했고, 추가로 각 경로 탐색 시 시간을 줄이기 위해 map으로 경로를 찾을 수 있도록 하였다.
처음에는 좀 더 쉬운 방법으로 풀이해보려 했는데, 모든 케이스를 고려 안하면 정답이 안되서... 결국 완전탐색하게 하였다.

</br>

```c++
#include <string>
#include <vector>
#include <queue>
#include <map>

using namespace std;

struct Route {
    string target;
    int index;
};

struct Status {
    string now;
    int cnt;
    vector<bool> visited;
    vector<string> route;
};

vector<string> compare(vector<string> a, vector<string> b) {
    int size = a.size();
    if (size == 0) return b;
    
    for(int i = 0; i < size; i ++) {
        if (a[i] < b[i]) {
            return a;
        } else if (a[i] == b[i]) {
            continue;
        }
        return b;
    }
    
    return a;
}

vector<string> solution(vector<vector<string>> tickets) {
    vector<string> answer;
    int length = tickets.size();
    map<string,vector<Route>> route;
    
    // Route 생성
    for (int i = 0; i < length; i++) {
        vector<string> ticket = tickets[i];
        if (route.count(ticket[0]) == 0) {
            vector<Route> vc;
            vc.push_back({ticket[1], i});
            route.insert({ticket[0], vc});
        } else {
            route[ticket[0]].push_back({ticket[1], i});
        }
    }
    
    // 탐색
    queue<Status> q;
    q.push({"ICN", 1, vector<bool>(length,false), vector<string>(1, "ICN")});
    
    while (!q.empty()) {
        Status f = q.front();
        q.pop();
        
        if (f.cnt == length + 1) {
            answer = compare(answer, f.route);
            continue;
        }
        
        int targetSize = route[f.now].size();
        for (int i = 0; i < targetSize; i++) {
            Route tgt = route[f.now][i];
            Status temp = f;
            
            if (temp.visited[tgt.index]) {
                continue;
            }
            
            temp.visited[tgt.index] = true;
            temp.route.push_back(tgt.target);
            q.push({tgt.target, temp.cnt + 1, temp.visited, temp.route});
        }
    }
    
    return answer;
}
```

