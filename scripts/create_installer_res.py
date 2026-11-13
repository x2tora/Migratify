import os
import sys
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def create_installer_res():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rc_path = r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\rc.exe"
    icon_path = os.path.join(root, "build", "icon.ico").replace("\\", "/")
    rc_file = os.path.join(root, "scripts", "installer_win32.rc")
    res_file = os.path.join(root, "scripts", "installer_win32.res")

    rc_content = f"""#pragma code_page(65001)

1 ICON "{icon_path}"

1 VERSIONINFO
FILEVERSION 1,0,0,0
PRODUCTVERSION 1,0,0,0
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
            VALUE "FileVersion", "1.0.0"
            VALUE "InternalName", "Migratify-Setup.exe"
            VALUE "LegalCopyright", "Copyright © xitora.cc"
            VALUE "OriginalFilename", "Migratify-Setup-1.0.0.exe"
            VALUE "ProductName", "Migratify"
            VALUE "ProductVersion", "1.0.0"
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
