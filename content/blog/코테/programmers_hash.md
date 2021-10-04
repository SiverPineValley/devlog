---
title: '[프로그래머스 연습문제] 해시'
date: 2021-10-04 20:06:22
category: '코테'
draft: false
---

코테 연습할겸해서 풀었던 해시 문제들에 대한 풀이를 올려보았다.

## [Level 1] 완주하지 못한 선수
  

매우 간단한 문제로, 참가자와 완료한 선수들 명단이 있는데, 이중 완료하지 못한 선수 이름을 리턴하기만 하면 된다.  
해시 맵에 묶여있어서 map을 글대로 사용해서 아래와 같이 작성했다.  
가장 효율적인 풀이를 보니 그냥 두 vector를 정렬해서 차례로 비교하다가 다른 값이 나오면 그대로 리턴, 혹은 가장 마지막 참가자를 리턴하면 정답이다.  
굳이 해시를 사용하지 않아도 최적의 풀이를 찾아낼 수 있는 문제였다.  

</br>

```c++
// 프로그래머스
// hash - 완주하지 못한 선수
#include <string>
#include <vector>
#include <map>

using namespace std;

string solution(vector<string> participant, vector<string> completion) {
    string answer = "";
    int size = completion.size();
    map<string,int> m;
    
    for(string c : completion) {
        if (!m.count(c)) {
            m[c] = 1;
        } else {
            m[c] = m[c] + 1;
        }
    }
    
        for(string p : participant) {
        if (!m.count(p)) {
            answer = p;
            break;
        } else if (m[p] == 0) {
            answer = p;
            break;
        } else {
            m[p] = m[p] - 1;
        }
    }
    
    return answer;
}
```


## [Level 2] 전화번호 목록


전화번호 목록은 전화번호 리스트 중에 Prefix가 되는 전화번호가 있으면 false를 리턴하는 문제이다.  
이번에도 간단한 문제이지만, 효율성 테스트를 통과하기가 조금 더 어려워졌다.  
Hash Map을 사용하여 아래와 같이 풀었지만, 마지막 효율성 테스트가 도저히 통과가 되질 않았다..  
아무래도 처음에 Map을 생성하는 행위와, map을 순회하면서 비교하는 행위의 까지 하여 O(n^2) 의 시간복잡도라 풀리지 않은 것 같다.
Map을 담은 조건은 각 string의 길이를 key로 잡았고, 비교할 때 이보다 큰 길이의 string들만 비교하도록 하였다.  

```c++
#include <string>
#include <vector>
#include <set>
#include <unordered_map>

using namespace std;

bool solution(vector<string> phone_book) {
    set<int> phone_size;
    unordered_map<int,vector<string>> map_book;
    
    // Map 생성
    for(string each_book : phone_book) {
        int length = each_book.length();
        map_book[length].push_back(each_book);
        phone_size.insert(length);
    }
    
    // Map 비교
    for(auto length = phone_size.begin(); length != phone_size.end(); length++) {
        for (string source : map_book[*length]) {
                for(auto cmp = next(length,1); cmp != phone_size.end(); cmp++) {
                    for (string target : map_book[*cmp]) {
                        if(source == target.substr(0, *length)) return false;
                    }
            }
        }
    }
    
    return true;
}
```


이 문제의 핵심은 string의 길이 순으로 정렬하는게 아니라, 사전순으로 정렬하는 것이 정답이다.  
아래와 같이 사전순으로 정렬하게 되면 O(n*m)의 효율성으로 통과가 가능하게 된다.  


```c++
#include <string>
#include <vector>
#include <unordered_map>

using namespace std;

bool solution(vector<string> phone_book) {
    unordered_map<string,int> map_book;
    
    // Map 생성
    for(string each_book : phone_book)
        map_book[each_book] = 1;
    
    // Map 비교
    for(string each_book : phone_book) {
        string book = "";
        for (int i = 0; i < each_book.size(); i++) {
            book += each_book[i];
            if (map_book[book] && book != each_book) {
                return false;
            }
        }
    }
    
    return true;
}
```


## [Level 2] 위장


각 의상의 종류별로 카운팅하여 마지막에 곱셈만 해주면 되는 문제라 쉽게 풀린다.


```c++
#include <string>
#include <vector>
#include <algorithm>
#include <unordered_map>

using namespace std;

int solution(vector<vector<string>> clothes) {
    int answer = 1;
    
    unordered_map<string,int> cloth_map;
    int cloth_type = 0;

    for(vector<string> cloth : clothes) {
        if(cloth_map.count(cloth[1]) > 0) {
            cloth_map[cloth[1]]++;
        } else {
            cloth_map[cloth[1]] = 1;
            cloth_type++;
        }
    }
    
    unordered_map<string,int>::iterator iter;
    for(iter = cloth_map.begin(); iter!= cloth_map.end(); iter++){
        answer = answer + (iter->second * answer);   
    }
    return answer-1;
}
```


## [Level 3] 베스트 앨범


베스트 앨범은 각 장르별, 재생수별로 정렬된 노래들을 각 장르별로 2곡씩 선별하여 정렬된 노래의 고유 번호를 출력하는 문제이다.  
map으로 장르별 총 재생 수, 장르별 각 노래별 재생 수를 담아놓고, 장르별로 최대 2곡씩 뽑아서 answr에 push하면 된다.
각 정렬 시 내림차순, 오름차순 정렬을 해야 해서 별도의 정렬 함수를 생성하였다.

```c++
#include <string>
#include <vector>
#include <map>
#include <queue>
#include <algorithm>
#include <iostream>

using namespace std;

// 내림차순 정렬
bool cmp_total(const pair<string,int>& left, const pair<string,int>& right) {
	return right.second < left.second;
}

// 재생수 같으면, 고유번호의 오름차순
// 재생수는 내림차순
bool cmp_each(const pair<int,int>& left, const pair<int,int>& right) {
    if (left.first == right.first) {
        return left.second < right.second;
    }
    return right.first < left.first;
}

vector<int> solution(vector<string> genres, vector<int> plays) {
    int size = genres.size();
    vector<int> answer;
    map<string,int> genre_total;
    map<string,vector<pair<int,int>>> genre_play;
    
    // map 생성
    for(int i = 0; i < size; i++) {
        if (genre_total.count(genres[i]) == 0) {
            genre_total[genres[i]] = plays[i];
            vector<pair<int,int>> temp;
            temp.push_back(make_pair(plays[i],i));
            genre_play[genres[i]] = temp;
            continue;
        }
        genre_total[genres[i]] = genre_total[genres[i]] + plays[i];
        auto temp = genre_play[genres[i]];
        temp.push_back(make_pair(plays[i],i));
        genre_play[genres[i]] = temp;
    }
    
    // 장르별 정렬
    vector<pair<string, int> > arr;
    for (const auto &item : genre_total) {
        arr.emplace_back(item);
    }
    sort(arr.begin(), arr.end(), cmp_total);
    
    // answer에 담기
    for(auto it = arr.begin(); it != arr.end(); it++) {
        auto each = genre_play[it->first];
        sort(each.begin(), each.end(), cmp_each);
        int idx = 0;
        int each_size = each.size();
        while(idx < 2 && idx < each_size) {
            auto each_value = each[idx].second;
            answer.push_back(each_value);
            idx++;
        }
    }
    
    return answer;
}
```
  
