import glob
import json
import os
import shutil
import subprocess
import sys

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


def create_installer_res():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rc_path = find_rc_exe()
    app_ver, ver_comma = get_app_version(root)
    icon_path = os.path.join(root, "build", "icon.ico").replace("\\", "/")
    rc_file = os.path.join(root, "scripts", "installer_win32.rc")
    res_file = os.path.join(root, "scripts", "installer_win32.res")

    rc_content = f"""#pragma code_page(65001)

1 ICON "{icon_path}"

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
            VALUE "FileDescription", "Migratify Setup"
            VALUE "FileVersion", "{app_ver}"
            VALUE "InternalName", "Migratify-Setup.exe"
            VALUE "LegalCopyright", "Copyright © xitora.cc"
            VALUE "OriginalFilename", "Migratify-Setup-{app_ver}.exe"
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

    subprocess.check_call([rc_path, "/nologo", f"/fo{res_file}", rc_file])
    print(f"installer_win32.res compiled successfully ({os.path.getsize(res_file)} bytes)")


if __name__ == '__main__':
    create_installer_res()
