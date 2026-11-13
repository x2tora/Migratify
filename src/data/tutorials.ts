import { StepTutorialGuide } from '../types/spotify';

// 콜백 리다이렉트 URI 상수
export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8888/callback';

// 자주 묻는 질문 및 실질적 문제 해결 FAQ
export const COMMON_TROUBLESHOOTING_FAQS = [
  {
    question: 'INVALID_CLIENT: Invalid redirect URI 오류가 표시됩니다.',
    answer:
      'Spotify Developer Dashboard의 내 앱 -> Settings -> Redirect URIs에 http://127.0.0.1:8888/callback 이 등록되어 있고 페이지 하단의 [Save] 버튼을 눌렀는지 확인해 주세요.',
  },
  {
    question: '로그인 직후 HTTP 403 (User not registered) 오류가 발생합니다.',
    answer:
      'Spotify 개발 모드 앱은 [Settings -> User Management]에 등록된 이메일 계정만 API 호출을 허용합니다. 대시보드의 User Management에 이전할 양쪽 계정의 이메일을 추가(Add user)해 주세요.',
  },
  {
    question: '출발 계정과 도착 계정이 동일한 계정으로 로그인됩니다.',
    answer:
      '도착 계정 카드에서 [계정 전환 후 로그인]을 클릭하거나, 웹 브라우저에서 기존 Spotify 계정을 로그아웃한 뒤 새 계정으로 로그인해 주세요.',
  },
  {
    question: '이전 도중에 중단하면 이미 전송된 곡들은 어떻게 되나요?',
    answer:
      '이미 새 계정으로 전송된 곡과 플레이리스트는 안전하게 보관됩니다. 다시 시작할 때 [중복 건너뛰기]를 켜두면 중복 없이 이어서 처리됩니다.',
  },
  {
    question: 'Client ID와 Secret은 안전하게 보관되나요?',
    answer:
      '현재 PC의 로컬 저장소(AppData)에만 저장되며 외부 서버로 절대 전송되지 않습니다.',
  },
];

// 유저에게 실질적으로 필요한 단계별 가이드 데이터 (API 키 설정)
// 자화자찬식 서비스 홍보 문구를 전면 배제하고 실제 설정 및 문제 해결에 필요한 내용만 구성
export const STEP_TUTORIAL_GUIDES: StepTutorialGuide[] = [
  {
    stepIndex: 0,
    stepTitle: '1단계: API 앱 생성 및 키 등록',
    stepSubtitle:
      'Spotify Developer Dashboard에서 개인용 앱을 생성하고 Client ID와 Client Secret을 발급받습니다.',
    slides: [
      {
        stepNumber: 1,
        badge: '1 / 3 · 앱 생성',
        title: 'Spotify Developer Dashboard에서 앱 만들기',
        description:
          '대시보드에 로그인한 뒤 우측 상단의 [Create app]을 클릭합니다. 앱 생성 시 Web API 항목을 반드시 체크해야 토큰 발급이 가능합니다.',
        highlights: [
          'App name과 App description에 앱 이름을 입력합니다.',
          'Which API/SDKs are you planning to use? 질문에서 [Web API]에 반드시 체크합니다.',
          'Website 입력란은 비워두어도 무방합니다.',
        ],
        externalLink: {
          label: 'Spotify Developer Dashboard 열기',
          url: 'https://developer.spotify.com/dashboard',
        },
      },
      {
        stepNumber: 2,
        badge: '2 / 3 · 콜백 주소 등록',
        title: 'Redirect URIs에 로컬 콜백 주소 추가 후 저장',
        description:
          '로그인을 마친 뒤 프로그램으로 인증 코드가 안전하게 전달되도록 아래 주소를 Redirect URIs에 등록합니다.',
        highlights: [
          '아래 복사 버튼을 눌러 Redirect URIs 입력란에 붙여넣고 우측 [Add]를 클릭합니다.',
          '[Add]를 누른 뒤 반드시 페이지 맨 아래의 [Save] 버튼까지 눌러야 반영됩니다.',
          'localhost 대신 127.0.0.1 주소를 사용해야 Spotify 보안 정책을 통과합니다.',
        ],
        copyableText: {
          label: 'Redirect URI',
          value: DEFAULT_REDIRECT_URI,
        },
        warningBox: {
          title: '저장 확인',
          content:
            'Redirect URI 입력 후 [Add]만 누르고 하단 [Save]를 누르지 않으면 로그인 시 INVALID_CLIENT 오류가 발생합니다.',
        },
      },
      {
        stepNumber: 3,
        badge: '3 / 3 · 이메일 등록 및 키 복사',
        title: 'User Management에 계정 이메일 등록 및 키 복사',
        description:
          '앱 설정(Settings)에서 Client ID와 Client Secret을 복사하고, [User Management] 탭에 이전할 양쪽 계정의 이메일을 등록합니다.',
        highlights: [
          '[Basic Information] 탭에서 Client ID와 [View client secret] 값을 복사해 프로그램에 붙여넣습니다.',
          '[User Management] 탭으로 이동해 기존 계정과 새 계정의 Spotify 이메일 주소를 각각 추가(Add user)합니다.',
        ],
        warningBox: {
          title: 'HTTP 403 오류 예방',
          content:
            'Spotify 개발 모드 앱은 User Management에 등록된 이메일 계정만 API 호출을 허용합니다.',
        },
      },
    ],
    faqItems: COMMON_TROUBLESHOOTING_FAQS.slice(0, 2),
  },
];
