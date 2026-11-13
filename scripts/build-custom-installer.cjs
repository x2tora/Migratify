const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// 커스텀 프레임리스 WPF 인스톨러 빌드 및 단일 실행 파일(.exe) 패키징 스크립트
function buildCustomInstaller() {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'release-dist');
  const unpackedDir = path.join(distDir, 'win-unpacked');
  const csSource = path.join(__dirname, 'CustomInstaller.cs');
  const iconPath = path.join(rootDir, 'build', 'icon.ico');
  const starLogoPath = path.join(rootDir, 'build', 'star_logo.png');
  const stubExePath = path.join(distDir, 'InstallerStub.exe');
  const payloadZipPath = path.join(distDir, 'payload.zip');
  const outputSetup10 = path.join(distDir, 'Migratify-Setup-1.0.0.exe');
  const outputSetupAlias = path.join(distDir, 'Migratify-Setup.exe');

  // win-unpacked가 없거나 최신 dist 빌드보다 오래된 경우 자동으로 electron-builder 패키징 수행
  const asarPath = path.join(unpackedDir, 'resources', 'app.asar');
  let needPack = !fs.existsSync(unpackedDir) || !fs.existsSync(asarPath);
  if (!needPack) {
    const asarMtime = fs.statSync(asarPath).mtimeMs;
    const distHtml = path.join(rootDir, 'dist', 'index.html');
    if (fs.existsSync(distHtml) && fs.statSync(distHtml).mtimeMs > asarMtime) {
      needPack = true;
    }
  }

  if (needPack) {
    console.log('  • [0/3] 최신 웹/Electron 빌드를 반영하여 app.asar 및 win-unpacked 패키징 동기화 중...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFileSync(npxCmd, ['electron-builder', '--dir'], { cwd: rootDir, stdio: 'inherit', shell: true });
  }

  if (!fs.existsSync(unpackedDir)) {
    throw new Error(`패키징된 앱 폴더를 찾을 수 없습니다: ${unpackedDir}`);
  }

  const fwDir = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319';
  const wpfDir = path.join(fwDir, 'WPF');
  const cscPath = path.join(fwDir, 'csc.exe');
  const win32ResScript = path.join(__dirname, 'create_installer_res.py');
  const win32ResPath = path.join(__dirname, 'installer_win32.res');

  console.log('  • [1/3] 인스톨러 Win32 리소스(아이콘 및 한국어 메타데이터) 빌드 및 컴파일 중...');
  execFileSync('python', [win32ResScript], { stdio: 'inherit' });

  execFileSync(
    cscPath,
    [
      '/nologo',
      '/target:winexe',
      '/optimize+',
      `/out:${stubExePath}`,
      `/win32res:${win32ResPath}`,
      `/resource:${starLogoPath},star_logo.png`,
      `/r:${path.join(wpfDir, 'PresentationFramework.dll')}`,
      `/r:${path.join(wpfDir, 'PresentationCore.dll')}`,
      `/r:${path.join(wpfDir, 'WindowsBase.dll')}`,
      `/r:${path.join(fwDir, 'System.Xaml.dll')}`,
      `/r:${path.join(fwDir, 'System.IO.Compression.dll')}`,
      `/r:${path.join(fwDir, 'System.IO.Compression.FileSystem.dll')}`,
      `/r:${path.join(fwDir, 'System.Windows.Forms.dll')}`,
      `/r:${path.join(fwDir, 'System.Drawing.dll')}`,
      csSource,
    ],
    { stdio: 'inherit' }
  );

  console.log('  • [2/3] 애플리케이션 페이로드 아카이브 압축 중...');
  if (fs.existsSync(payloadZipPath)) {
    fs.unlinkSync(payloadZipPath);
  }

  // Python zipfile을 이용해 win-unpacked 전체를 표준 Deflate ZIP으로 압축
  execFileSync(
    'python',
    [
      '-c',
      `
import os, zipfile
src = r'${unpackedDir}'
dst = r'${payloadZipPath}'
with zipfile.ZipFile(dst, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for root, dirs, files in os.walk(src):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, src)
            zf.write(full_path, rel_path)
print('  - Payload archived:', round(os.path.getsize(dst) / (1024*1024), 2), 'MB')
`,
    ],
    { stdio: 'inherit' }
  );

  console.log('  • [3/3] 단일 설치 실행 파일(.exe) 병합 및 시그니처 기록 중...');
  const stubBuf = fs.readFileSync(stubExePath);
  const zipOffset = BigInt(stubBuf.length);

  // 16바이트 트레일러: [8바이트 Little-Endian Int64 zipOffset][8바이트 ASCII "SAMIG320"]
  const trailer = Buffer.alloc(16);
  trailer.writeBigInt64LE(zipOffset, 0);
  trailer.write('SAMIG320', 8, 8, 'ascii');

  const zipData = fs.readFileSync(payloadZipPath);
  for (const targetOut of [outputSetup10, outputSetupAlias]) {
    if (fs.existsSync(targetOut)) {
      fs.unlinkSync(targetOut);
    }
    fs.writeFileSync(targetOut, stubBuf);
    fs.appendFileSync(targetOut, zipData);
    fs.appendFileSync(targetOut, trailer);
  }

  // 독립 실행형 언인스톨러(Uninstall Migratify.exe) 파일 생성
  const standaloneUninstaller = path.join(distDir, 'Uninstall Migratify.exe');
  try {
    if (fs.existsSync(standaloneUninstaller)) {
      fs.unlinkSync(standaloneUninstaller);
    }
  } catch {
    // 백신 스캔 등으로 일시 잠김 시 덮어쓰기 진행
  }
  fs.writeFileSync(standaloneUninstaller, stubBuf);
  console.log(`  • 독립 실행형 언인스톨러 생성 완료: ${standaloneUninstaller}`);

  // 현재 사용자 로컬 설치 경로가 존재할 경우 언인스톨러 즉시 동기화
  const localInstalledUninstaller = path.join(
    process.env.LOCALAPPDATA || '',
    'Programs',
    'Migratify',
    'Uninstall Migratify.exe'
  );
  if (fs.existsSync(path.dirname(localInstalledUninstaller))) {
    try {
      fs.copyFileSync(standaloneUninstaller, localInstalledUninstaller);
      console.log(`  • 로컬 설치 경로 언인스톨러 동기화 완료: ${localInstalledUninstaller}`);
    } catch (e) {
      console.warn(`  • 로컬 언인스톨러 동기화 건너뜀: ${e.message}`);
    }
  }

  // 임시 파일 정리
  if (fs.existsSync(stubExePath)) fs.unlinkSync(stubExePath);
  if (fs.existsSync(payloadZipPath)) fs.unlinkSync(payloadZipPath);

  console.log('  • [검증] 내장 ZIP 아카이브 중앙 디렉터리 및 스트림 추출 무결성 테스트 중...');
  execFileSync(outputSetup10, ['--verify-archive'], { stdio: 'inherit' });
  console.log(`  • 무결성 검증 통과 & 커스텀 인스톨러 빌드 완료: ${outputSetup10}`);
}

buildCustomInstaller();
