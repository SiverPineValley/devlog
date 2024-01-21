---
title: '[Flutter] 07. ChangeNotifier를 이용한 action 처리'
date: 2024-01-21 18:00:00
category: 'flutter'
draft: false
---

# 1. ChangeNotifier를 이용한 action의 처리

이번에는 ChangeNotifier를 이용한 action의 처리 방법에 대해 알아보겠다. action의 종류에는 앞서 설명했던 `Navigator.push` 뿐만 아니라, `showDialog`(팝업 표시), `showBottomSheet` 등이 있다. action을 처리하는 프로세스 패턴은 다음과 같다.

1) action을 수행하는 void 함수 생성
2) `initState` 메소드 내 ChangeNotifier의 addListener 함수를 사용하여 리스너 등록
3) `dispose` 메소드 내 ChangeNotifier의 removeListener 함수를 사용하여 리스너 제거

</br>

```dart
late final AppProvider appProv;

@override
void initState() {
  super.initState();
  appProv = context.read<AppProvider>();
  appProv.addListener(appListener);
}

void appListener() {
  if (appProv.state == AppState.success) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) {
          return SuccessPage();
        }),
      );
    });
  } else if (appProv.state == AppState.error) {
    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        showDialog(
          context: context,
          builder: (context) {
            return AlertDialog(
              content: Text('Something went wrong'),
            );
          },
        );
      },
    );
  }
}
```

# 2. 출처
https://www.udemy.com/course/flutter-provider-essential-korean/</br>