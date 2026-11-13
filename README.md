<div align="center">
  <img src="build/icon.png" alt="Migratify" width="84" height="84" />
  <h1>Migratify</h1>
  <p>Spotify 계정 간 라이브러리 이전 및 JSON 백업을 위한 Windows 데스크톱 애플리케이션</p>
  <p>
    <a href="https://github.com/x2tora/Migratify/releases">다운로드 (Releases)</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/x2tora/Migratify/issues">이슈 제보</a>
  </p>
</div>

---

## 주요 기능

- **계정 간 직접 이전** — 플레이리스트, 좋아요 표시한 곡, 저장한 앨범, 팔로우한 아티스트, 팟캐스트를 새 계정으로 복사합니다.
- **JSON 백업 및 복원** — 현재 보관함을 로컬 JSON 파일로 저장하고, 필요 시 다른 계정에 복원합니다.
- **세부 항목 제어** — 이전 전 플레이리스트 수록곡 미리보기, 이름/설명 수정, 항목별 선택 및 정렬을 지원합니다.
- **중단·재개 및 한도 대응** — 대용량 트랙 분할 처리, 중복 항목 건너뛰기, Spotify API 호출 한도(HTTP 429) 안내 및 중단 지점 재개를 지원합니다.
- **보관함 정리** — 선택한 계정의 플레이리스트·보관함 데이터를 항목별로 정리할 수 있습니다.
- **인앱 업데이트** — 상단 버전 배지를 통해 GitHub Releases 최신 버전을 확인하고 즉시 다운로드 및 업데이트할 수 있습니다.

## 설치 및 사용 방법

1. [Releases](https://github.com/x2tora/Migratify/releases) 페이지에서 최신 `Migratify-Setup-x.x.x.exe`를 내려받아 설치합니다.
2. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)에서 앱을 생성합니다.
   - **Redirect URI**: `http://127.0.0.1:8888/callback`
   - **Which API/SDKs are you planning to use?**: **Web API** 항목 체크
3. 앱 실행 후 발급받은 Client ID와 Client Secret을 입력해 계정을 연결합니다.

> **참고**: 오픈소스 배포본은 별도의 유료 EV 코드 서명이 적용되어 있지 않아 최초 실행 시 Windows SmartScreen 경고가 표시될 수 있습니다. *추가 정보 → 실행*을 선택하면 정상적으로 설치됩니다.

## 개인정보 및 보안

- 입력한 Client ID, Client Secret 및 OAuth 토큰은 외부 서버로 전송되지 않으며 사용자 PC의 로컬 앱 데이터 디렉터리에만 저장됩니다.
- 모든 API 요청은 로컬 PC에서 Spotify 공식 엔드포인트(`accounts.spotify.com`, `api.spotify.com`)로 직접 전달됩니다.

## 개발 환경 실행

Node.js 18 이상 환경에서 아래 명령으로 실행 및 패키징할 수 있습니다.

```bash
npm install
npm run dev       # Vite + Electron 개발 모드
npm test          # Jest 단위 테스트
npm run build     # 프로덕션 번들 빌드
npm run dist      # Windows 설치 파일 빌드 (release-dist/)
```

## 안내 및 면책

Migratify는 독립적인 오픈소스 유틸리티이며, Spotify AB와 제휴, 보증 또는 공식적으로 연관되어 있지 않습니다.
