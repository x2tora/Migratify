import glob
import json
import os
import shutil
import sys
import subprocess
import ctypes
import struct

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def find_rc_exe():
    which_rc = shutil.which("rc")
    if which_rc:
        return which_rc
    candidates = sorted(
        glob.glob(r"C:\Program Files (x86)\Windows Kits\10\bin\*\x64\rc.exe"),
        reverse=True,
    )
    if candidates:
        return candidates[0]
    raise FileNotFoundError("Windows SDK rc.exe를 찾을 수 없습니다.")


def get_app_version(root):
    pkg_path = os.path.join(root, "package.json")
    with open(pkg_path, "r", encoding="utf-8") as f:
        pkg = json.load(f)
    ver = str(pkg.get("version", "1.0.0")).split("-")[0]
    parts = [p for p in ver.split(".") if p.isdigit()]
    while len(parts) < 4:
        parts.append("0")
    return ver, ",".join(parts[:4])


# Migratify 실행 파일에 한국어(ko-KR / 0x0412) 버전 리소스를 주입하는 스크립트
def stamp_app(exe_path):
    if not os.path.isfile(exe_path):
        raise FileNotFoundError(f"실행 파일을 찾을 수 없습니다: {exe_path}")

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rc_path = find_rc_exe()
    app_ver, ver_comma = get_app_version(root)

    rc_file = os.path.join(root, "scripts", "_app_version.rc")
    res_file = os.path.join(root, "scripts", "_app_version.res")

    rc_content = f"""#pragma code_page(65001)

1 VERSIONINFO
FILEVERSION {ver_comma}
PRODUCTVERSION {ver_comma}
FILEFLAGSMASK 0x3fL
FILEFLAGS 0x0L
FILEOS 0x40004L
FILETYPE 0x1L
FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "041204b0"
        BEGIN
            VALUE "CompanyName", "xitora.cc"
            VALUE "FileDescription", "Migratify"
            VALUE "FileVersion", "{app_ver}"
            VALUE "InternalName", "Migratify.exe"
            VALUE "LegalCopyright", "Copyright © xitora.cc"
            VALUE "OriginalFilename", "Migratify.exe"
            VALUE "ProductName", "Migratify"
            VALUE "ProductVersion", "{app_ver}"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x0412, 1200
    END
END
"""

    with open(rc_file, 'w', encoding='utf-8') as f:
        f.write(rc_content)

    try:
        subprocess.check_call([rc_path, "/nologo", f"/fo{res_file}", rc_file])

        with open(res_file, 'rb') as f:
            data = f.read()

        offset = struct.unpack_from('<II', data, 0)[1]
        data_size, header_size = struct.unpack_from('<II', data, offset)
        res_bytes = data[offset + header_size : offset + header_size + data_size]

        kernel32 = ctypes.windll.kernel32
        BeginUpdateResourceW = kernel32.BeginUpdateResourceW
        BeginUpdateResourceW.argtypes = [ctypes.c_wchar_p, ctypes.c_bool]
        BeginUpdateResourceW.restype = ctypes.c_void_p

        UpdateResourceW = kernel32.UpdateResourceW
        UpdateResourceW.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ushort, ctypes.c_char_p, ctypes.c_uint]
        UpdateResourceW.restype = ctypes.c_bool

        EndUpdateResourceW = kernel32.EndUpdateResourceW
        EndUpdateResourceW.argtypes = [ctypes.c_void_p, ctypes.c_bool]
        EndUpdateResourceW.restype = ctypes.c_bool

        hUpdate = BeginUpdateResourceW(exe_path, False)
        if not hUpdate:
            raise RuntimeError(f"BeginUpdateResourceW 실패: {ctypes.GetLastError()}")

        # 한국어(1042) 버전 리소스 추가/덮어쓰기
        ret = UpdateResourceW(hUpdate, 16, 1, 1042, res_bytes, len(res_bytes))
        if not ret:
            raise RuntimeError(f"UpdateResourceW 실패: {ctypes.GetLastError()}")

        if not EndUpdateResourceW(hUpdate, False):
            raise RuntimeError(f"EndUpdateResourceW 실패: {ctypes.GetLastError()}")

        print(f"  • Migratify.exe 한국어(0x0412) 버전 리소스 주입 완료: {exe_path}")
    finally:
        if os.path.exists(rc_file):
            try: os.unlink(rc_file)
            except: pass
        if os.path.exists(res_file):
            try: os.unlink(res_file)
            except: pass

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else r"release-dist\win-unpacked\Migratify.exe"
    stamp_app(target)
