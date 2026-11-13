const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// 패키징 직후 실행 파일(.exe)의 PE 리소스 아이콘 및 버전 메타데이터를 적용하는 후처리 훅 함수
exports.default = async function afterPack(context) {
  try {
    if (context.electronPlatformName !== 'win32') {
      return;
    }

    const exeName = `${context.packager.appInfo.productFilename}.exe`;
    const exePath = path.join(context.appOutDir, exeName);
    const rceditPath = path.resolve(__dirname, 'rcedit-x64.exe');
    const iconPath = path.resolve(__dirname, '../build/icon.ico');

    if (!fs.existsSync(exePath) || !fs.existsSync(rceditPath) || !fs.existsSync(iconPath)) {
      console.warn('아이콘 임베딩에 필요한 파일 경로를 찾을 수 없습니다.');
      return;
    }

    execFileSync(rceditPath, [
      exePath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'ProductName',
      'Migratify',
      '--set-version-string',
      'FileDescription',
      'Migratify',
      '--set-version-string',
      'CompanyName',
      'xitora.cc',
      '--set-version-string',
      'LegalCopyright',
      'Copyright © xitora.cc',
      '--set-version-string',
      'OriginalFilename',
      'Migratify.exe',
      '--set-file-version',
      '1.0.0',
      '--set-product-version',
      '1.0.0',
    ]);

    console.log(`  • PE 아이콘 및 메타데이터 임베딩 완료: ${exePath}`);

    // 한국어(0x0412) 버전 리소스 주입
    const stampScript = path.resolve(__dirname, 'stamp_app_version.py');
    if (fs.existsSync(stampScript)) {
      execFileSync('python', [stampScript, exePath], { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('PE 아이콘 임베딩 중 오류 발생:', error);
  }
};
