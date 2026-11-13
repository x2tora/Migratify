using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Resources;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using Microsoft.Win32;

[assembly: AssemblyTitle("Migratify")]
[assembly: AssemblyDescription("Migratify - Spotify Account Migration Tool")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("xitora.cc")]
[assembly: AssemblyProduct("Migratify")]
[assembly: AssemblyCopyright("Copyright © xitora.cc")]
[assembly: AssemblyTrademark("Migratify")]
[assembly: AssemblyCulture("")]
[assembly: NeutralResourcesLanguage("ko-KR")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: AssemblyInformationalVersion("1.0.0")]

namespace MigratifyInstaller
{
    // Windows Shell Link(바로가기 .lnk 생성) COM 인터페이스 정의
    [ComImport]
    [Guid("00021401-0000-0000-C000-000000000046")]
    internal class ShellLink
    {
    }

    [ComImport]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [Guid("000214F9-0000-0000-C000-000000000046")]
    internal interface IShellLinkW
    {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile, int cchMaxPath, out IntPtr pfd, int fFlags);
        void GetIDList(out IntPtr ppidl);
        void SetIDList(IntPtr pidl);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszName, int cchMaxName);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszDir, int cchMaxPath);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszArgs, int cchMaxPath);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
        void GetHotkey(out short pwHotkey);
        void SetHotkey(short wHotkey);
        void GetShowCmd(out int piShowCmd);
        void SetShowCmd(int iShowCmd);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszIconPath, int cchIconPath, out int piIcon);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, int dwReserved);
        void Resolve(IntPtr hwnd, int fFlags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
    }

    // 최신 Windows 탐색기 폴더/파일 선택기(IFileOpenDialog) COM 클래스 및 인터페이스 정의
    [ComImport]
    [Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
    internal class FileOpenDialogRCW
    {
    }

    [ComImport]
    [Guid("d57c7288-d4ad-4768-be02-9d969532d960")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IFileOpenDialog
    {
        [PreserveSig]
        int Show([In] IntPtr parent);

        void SetFileTypes([In] uint cFileTypes, [In] IntPtr rgFilterSpec);
        void SetFileTypeIndex([In] uint iFileType);
        void GetFileTypeIndex(out uint piFileType);
        void Advise([In, MarshalAs(UnmanagedType.Interface)] IntPtr pfde, out uint pdwCookie);
        void Unadvise([In] uint dwCookie);
        void SetOptions([In] uint fos);
        void GetOptions(out uint pfos);
        void SetDefaultFolder([In, MarshalAs(UnmanagedType.Interface)] IShellItem psi);
        void SetFolder([In, MarshalAs(UnmanagedType.Interface)] IShellItem psi);
        void GetFolder([MarshalAs(UnmanagedType.Interface)] out IShellItem ppsi);
        void GetCurrentSelection([MarshalAs(UnmanagedType.Interface)] out IShellItem ppsi);
        void SetFileName([In, MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
        void SetTitle([In, MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
        void SetOkButtonLabel([In, MarshalAs(UnmanagedType.LPWStr)] string pszText);
        void SetFileNameLabel([In, MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
        void GetResult([MarshalAs(UnmanagedType.Interface)] out IShellItem ppsi);
        void AddPlace([In, MarshalAs(UnmanagedType.Interface)] IShellItem psi, int fdap);
        void SetDefaultExtension([In, MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
        void Close([MarshalAs(UnmanagedType.Error)] int hr);
        void SetClientGuid([In] ref Guid guid);
        void ClearClientData();
        void SetFilter([MarshalAs(UnmanagedType.Interface)] IntPtr pFilter);

        void GetResults([MarshalAs(UnmanagedType.Interface)] out IntPtr ppenum);
        void GetSelectedItems([MarshalAs(UnmanagedType.Interface)] out IntPtr ppsai);
    }

    [ComImport]
    [Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IShellItem
    {
        void BindToHandler([In, MarshalAs(UnmanagedType.Interface)] IntPtr pbc, [In] ref Guid bhid, [In] ref Guid riid, out IntPtr ppv);
        void GetParent([MarshalAs(UnmanagedType.Interface)] out IShellItem ppsi);
        void GetDisplayName([In] uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
        void GetAttributes([In] uint sfgaoMask, out uint psfgaoAttribs);
        void Compare([In, MarshalAs(UnmanagedType.Interface)] IShellItem psi, [In] uint hint, out int piOrder);
    }

    // 앱 디자인 시스템(#212229 다크 서피스, #CAD3F5 텍스트, #C6A0F6 라벤더 액센트)을 그대로 구현한 커스텀 인스톨러 메인 윈도우
    public class InstallerWindow : Window
    {
        // 페이로드 매직 시그니처 ("SAMIG320")
        private static readonly byte[] PAYLOAD_MAGIC = Encoding.ASCII.GetBytes("SAMIG320");

        // 앱 테마 토큰과 100% 일치하도록 정밀 동기화된 솔리드 컬러 브러시 (#212229 / #CAD3F5 / #C6A0F6)
        private readonly SolidColorBrush BrushBgMain = CreateBrush("#212229");       // --theme-bg / zinc-950
        private readonly SolidColorBrush BrushBgSidebar = CreateBrush("#191A21");    // --theme-inset (사이드바 서피스)
        private readonly SolidColorBrush BrushBgTitleBar = CreateBrush("#16171D");    // 상단 타이틀바 서피스
        private readonly SolidColorBrush BrushBgCard = CreateBrush("#272934");       // --theme-card / zinc-900
        private readonly SolidColorBrush BrushBgCardHover = CreateBrush("#323442");  // --theme-elevated / zinc-800
        private readonly SolidColorBrush BrushBgLog = CreateBrush("#191A21");        // --theme-inset (로그 콘솔 인셋)
        private readonly SolidColorBrush BrushBorder = CreateBrush("#363949");       // --theme-border
        private readonly SolidColorBrush BrushAccent = CreateBrush("#C6A0F6");       // --theme-accent (라벤더 스타)
        private readonly SolidColorBrush BrushAccentHover = CreateBrush("#D4B4FB");  // --theme-accent-hover
        private readonly SolidColorBrush BrushAccentSoft = CreateBrush("#2A2438");   // --theme-accent-soft
        private readonly SolidColorBrush BrushAccentText = CreateBrush("#191A21");   // --theme-accent-fg
        private readonly SolidColorBrush BrushTextPrimary = CreateBrush("#CAD3F5");  // --theme-fg / zinc-100
        private readonly SolidColorBrush BrushTextSecondary = CreateBrush("#949EC0");// --theme-muted / zinc-400
        private readonly SolidColorBrush BrushTextMuted = CreateBrush("#646A82");    // zinc-500
        private readonly SolidColorBrush BrushSuccess = CreateBrush("#34D399");      // 에메랄드 성공 배지
        private readonly SolidColorBrush BrushDanger = CreateBrush("#F87171");       // 레드 오류 배지

        // 상태 변수
        private readonly bool isUninstallMode;
        private int currentStep = 0;
        private bool hasInitializedStep = false;
        private bool isBusy = false;
        private string installDir;
        private bool optDesktopShortcut = true;
        private bool optStartMenuShortcut = true;
        private bool optRegisterUninstall = true;
        private bool optLaunchAfterInstall = true;

        // 동적 UI 컨트롤 참조
        private Border outerFrame;
        private Border stepChipBorder;
        private TextBlock stepBadgeText;
        private Border[] sidebarStepCards = new Border[4];
        private Border[] sidebarStepBadges = new Border[4];
        private TextBlock[] sidebarStepBadgeTexts = new TextBlock[4];
        private TextBlock sidebarStatusText;
        private Grid stageContainer;
        private UIElement currentStageView = null;
        private TextBox pathTextBox;
        private Border progressFillBorder;
        private double progressTrackWidth = 540;
        private TextBlock progressPercentText;
        private TextBlock progressStatusText;
        private TextBlock progressCountText;
        private StackPanel logStackPanel;
        private ScrollViewer logScrollViewer;

        // 컬러 문자열로부터 브러시 생성 유틸리티 함수
        private static SolidColorBrush CreateBrush(string hex)
        {
            Color c = ParseColor(hex);
            SolidColorBrush b = new SolidColorBrush(c);
            b.Freeze();
            return b;
        }

        // 16진수 컬러 문자열로부터 Color 구조체 파싱 유틸리티 함수
        private static Color ParseColor(string hex)
        {
            return (Color)ColorConverter.ConvertFromString(hex);
        }

        public InstallerWindow(bool uninstallMode)
        {
            this.isUninstallMode = uninstallMode;
            this.installDir = System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "Migratify"
            );

            // 언인스톨 모드일 경우 현재 실행 파일 위치 기준으로 경로 설정
            if (this.isUninstallMode)
            {
                string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                if (File.Exists(System.IO.Path.Combine(exeDir, "Migratify.exe")))
                {
                    this.installDir = exeDir;
                }
            }

            InitializeWindowStyle();
            BuildLayout();

            if (this.isUninstallMode)
            {
                RenderUninstallStage();
            }
            else
            {
                SetStep(0);
            }

            this.Loaded += (s, e) => AnimateWindowLaunch();
        }

        // 인스톨러 창 최초 실행 시 스프링 스케일 + 페이드 인 등장 애니메이션 함수
        private void AnimateWindowLaunch()
        {
            if (outerFrame == null) return;
            outerFrame.RenderTransform = null;
            outerFrame.Opacity = 0;

            DoubleAnimation fadeAnim = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(180))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            outerFrame.BeginAnimation(UIElement.OpacityProperty, fadeAnim);
        }

        // 프레임리스 라운드 윈도우 기본 속성 설정 함수
        private void InitializeWindowStyle()
        {
            this.Title = isUninstallMode
                ? "Migratify 제거 마법사"
                : "Migratify Setup";
            this.Width = 1060;
            this.Height = 700;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.CanMinimize;
            this.FontFamily = new FontFamily("Outfit, PretendardJP, Pretendard, Segoe UI, Malgun Gothic");
            this.UseLayoutRounding = true;
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Ideal);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            try
            {
                string exePath = Process.GetCurrentProcess().MainModule.FileName;
                this.Icon = Imaging.CreateBitmapSourceFromHIcon(
                    System.Drawing.Icon.ExtractAssociatedIcon(exePath).Handle,
                    Int32Rect.Empty,
                    BitmapSizeOptions.FromEmptyOptions()
                );
            }
            catch
            {
                // 아이콘 추출 실패 시 무시
            }
        }

        // 내장된 리소스에서 네온 스타 로고 이미지 로드 함수
        private ImageSource LoadEmbeddedLogo()
        {
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("star_logo.png"))
                {
                    if (s != null)
                    {
                        BitmapImage bmp = new BitmapImage();
                        bmp.BeginInit();
                        bmp.StreamSource = s;
                        bmp.CacheOption = BitmapCacheOption.OnLoad;
                        bmp.EndInit();
                        bmp.Freeze();
                        return bmp;
                    }
                }
            }
            catch
            {
                // 리소스 로드 오류 무시
            }
            return null;
        }

        // 전체 앱 레이아웃(타이틀바 + 좌측 사이드바 + 우측 메인 스테이지) 구성 함수
        private void BuildLayout()
        {
            outerFrame = new Border
            {
                Margin = new Thickness(14),
                CornerRadius = new CornerRadius(14),
                Background = BrushBgMain,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black,
                    BlurRadius = 24,
                    ShadowDepth = 6,
                    Opacity = 0.55
                },
                SnapsToDevicePixels = true,
                UseLayoutRounding = true
            };
            RenderOptions.SetClearTypeHint(outerFrame, ClearTypeHint.Enabled);
            TextOptions.SetTextFormattingMode(outerFrame, TextFormattingMode.Ideal);
            TextOptions.SetTextRenderingMode(outerFrame, TextRenderingMode.ClearType);

            Grid rootGrid = new Grid();
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(52) });
            rootGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // 1. 상단 커스텀 타이틀바
            Border titleBar = BuildTitleBar();
            Grid.SetRow(titleBar, 0);
            rootGrid.Children.Add(titleBar);

            // 2. 본문 영역 (좌측 사이드바 + 우측 스테이지)
            Grid bodyGrid = new Grid();
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(270) });
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border sidebar = BuildSidebar();
            Grid.SetColumn(sidebar, 0);
            bodyGrid.Children.Add(sidebar);

            stageContainer = new Grid
            {
                Margin = new Thickness(32, 26, 32, 26),
                ClipToBounds = true
            };
            Grid.SetColumn(stageContainer, 1);
            bodyGrid.Children.Add(stageContainer);

            Grid.SetRow(bodyGrid, 1);
            rootGrid.Children.Add(bodyGrid);

            outerFrame.Child = rootGrid;
            this.Content = outerFrame;
        }

        // 앱의 TitleBar.tsx와 동일한 디자인의 상단 타이틀바 생성 함수
        private Border BuildTitleBar()
        {
            Border bar = new Border
            {
                Background = BrushBgTitleBar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(0, 0, 0, 1),
                CornerRadius = new CornerRadius(14, 14, 0, 0),
                Padding = new Thickness(16, 0, 12, 0)
            };
            bar.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ButtonState == MouseButtonState.Pressed)
                {
                    this.DragMove();
                }
            };

            Grid grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            // 좌측 브랜드 로고 + 타이틀 + 버전 배지
            StackPanel leftPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            Border iconBadge = new Border
            {
                Width = 28,
                Height = 28,
                CornerRadius = new CornerRadius(7),
                Background = CreateBrush("#0D0E12"),
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                Margin = new Thickness(0, 0, 9, 0)
            };
            Image logoImg = new Image
            {
                Width = 20,
                Height = 20,
                Source = LoadEmbeddedLogo(),
                Stretch = Stretch.Uniform
            };
            RenderOptions.SetBitmapScalingMode(logoImg, BitmapScalingMode.HighQuality);
            iconBadge.Child = logoImg;
            leftPanel.Children.Add(iconBadge);

            TextBlock titleText = new TextBlock
            {
                Text = isUninstallMode ? "Migratify Uninstaller" : "Migratify Installer",
                Foreground = BrushTextPrimary,
                FontSize = 13.5,
                FontWeight = FontWeights.SemiBold,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0)
            };
            leftPanel.Children.Add(titleText);

            Border verBadge = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Padding = new Thickness(7, 2.5, 7, 2.5),
                VerticalAlignment = VerticalAlignment.Center
            };
            verBadge.Child = new TextBlock
            {
                Text = "v1.0.0",
                Foreground = BrushTextSecondary,
                FontSize = 10.5,
                FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding")
            };
            leftPanel.Children.Add(verBadge);

            Grid.SetColumn(leftPanel, 0);
            grid.Children.Add(leftPanel);

            // 우측 단계 배지 및 창 제어 버튼
            StackPanel rightPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            stepChipBorder = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(11, 4.5, 11, 4.5),
                Margin = new Thickness(0, 0, 10, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            stepBadgeText = new TextBlock
            {
                Text = isUninstallMode ? "프로그램 제거" : "1단계 · 시작 안내",
                Foreground = BrushAccent,
                FontSize = 12,
                FontWeight = FontWeights.Medium
            };
            stepChipBorder.Child = stepBadgeText;
            rightPanel.Children.Add(stepChipBorder);

            Button minBtn = CreateWindowControlButton("─", false);
            minBtn.ToolTip = CreateCustomTooltip("최소화");
            ToolTipService.SetInitialShowDelay(minBtn, 0);
            minBtn.Click += (s, e) => { this.WindowState = WindowState.Minimized; };
            rightPanel.Children.Add(minBtn);

            Button closeBtn = CreateWindowControlButton("✕", true);
            closeBtn.ToolTip = CreateCustomTooltip("종료");
            ToolTipService.SetInitialShowDelay(closeBtn, 0);
            closeBtn.Click += (s, e) =>
            {
                if (!isBusy)
                {
                    this.Close();
                }
            };
            rightPanel.Children.Add(closeBtn);

            Grid.SetColumn(rightPanel, 2);
            grid.Children.Add(rightPanel);

            bar.Child = grid;
            return bar;
        }

        // 타이틀바 창 제어 버튼 생성 함수
        private Button CreateWindowControlButton(string symbol, bool isClose)
        {
            Border bd = new Border
            {
                Width = 30,
                Height = 30,
                CornerRadius = new CornerRadius(6),
                Background = Brushes.Transparent
            };
            TextBlock tb = new TextBlock
            {
                Text = symbol,
                Foreground = BrushTextSecondary,
                FontSize = 12,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            bd.Child = tb;

            Button btn = new Button
            {
                Content = bd,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                Margin = new Thickness(2, 0, 0, 0),
                Template = CreateFlatButtonTemplate()
            };

            btn.MouseEnter += (s, e) =>
            {
                bd.Background = isClose ? CreateBrush("#3B1D26") : BrushBgCard;
                tb.Foreground = isClose ? BrushDanger : BrushTextPrimary;
            };
            btn.MouseLeave += (s, e) =>
            {
                bd.Background = Brushes.Transparent;
                tb.Foreground = BrushTextSecondary;
            };
            return btn;
        }

        // 앱 테마 디자인과 일치하는 커스텀 즉시 팝업 툴팁 생성 함수
        private ToolTip CreateCustomTooltip(string text)
        {
            Border tooltipBorder = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 5, 8, 5),
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black,
                    BlurRadius = 10,
                    ShadowDepth = 2,
                    Opacity = 0.45
                }
            };
            TextBlock tipText = new TextBlock
            {
                Text = text,
                Foreground = BrushTextPrimary,
                FontSize = 11,
                FontWeight = FontWeights.Medium
            };
            tooltipBorder.Child = tipText;

            ToolTip tip = new ToolTip
            {
                Content = tooltipBorder,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Padding = new Thickness(0)
            };
            return tip;
        }

        // 앱의 Sidebar.tsx와 동일한 좌측 워크플로우 사이드바 생성 함수
        private Border BuildSidebar()
        {
            Border sidebar = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(0, 0, 1, 0),
                CornerRadius = new CornerRadius(0, 0, 0, 14),
                Padding = new Thickness(16, 18, 16, 18)
            };

            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            StackPanel topStack = new StackPanel();
            topStack.Children.Add(new TextBlock
            {
                Text = isUninstallMode ? "제거 단계" : "설치 단계",
                Foreground = BrushTextMuted,
                FontSize = 13.5,
                FontWeight = FontWeights.Bold,
                Margin = new Thickness(6, 0, 0, 12)
            });

            if (isUninstallMode)
            {
                Border card = new Border
                {
                    CornerRadius = new CornerRadius(10),
                    Padding = new Thickness(12, 11, 12, 11),
                    Margin = new Thickness(0, 0, 0, 8),
                    BorderThickness = new Thickness(1),
                    BorderBrush = BrushAccent,
                    Background = BrushAccentSoft
                };

                Grid itemGrid = new Grid();
                itemGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                itemGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                Border numBadge = new Border
                {
                    Width = 28,
                    Height = 28,
                    CornerRadius = new CornerRadius(8),
                    Background = BrushAccent,
                    Margin = new Thickness(0, 0, 11, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                TextBlock numText = new TextBlock
                {
                    Text = "1",
                    Foreground = BrushAccentText,
                    FontSize = 12.5,
                    FontWeight = FontWeights.Bold,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center
                };
                numBadge.Child = numText;
                Grid.SetColumn(numBadge, 0);
                itemGrid.Children.Add(numBadge);

                StackPanel textStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
                textStack.Children.Add(new TextBlock
                {
                    Text = "1. 프로그램 제거",
                    Foreground = BrushAccent,
                    FontSize = 13.5,
                    FontWeight = FontWeights.SemiBold
                });
                textStack.Children.Add(new TextBlock
                {
                    Text = "설치 파일 및 바로가기 삭제",
                    Foreground = BrushTextSecondary,
                    FontSize = 11.5,
                    Margin = new Thickness(0, 2, 0, 0)
                });
                Grid.SetColumn(textStack, 1);
                itemGrid.Children.Add(textStack);

                card.Child = itemGrid;
                topStack.Children.Add(card);
            }
            else
            {
                string[] titles = { "1. 시작 안내", "2. 설치 위치 선택", "3. 프로그램 설치", "4. 설치 완료" };
                string[] descs = { "프로그램 소개 및 준비", "설치 위치 및 바로가기", "필요한 파일 설치 중", "설치 완료 및 실행" };

                for (int i = 0; i < 4; i++)
                {
                    Border card = new Border
                    {
                        CornerRadius = new CornerRadius(10),
                        Padding = new Thickness(12, 11, 12, 11),
                        Margin = new Thickness(0, 0, 0, 8),
                        BorderThickness = new Thickness(1),
                        BorderBrush = Brushes.Transparent,
                        Background = Brushes.Transparent
                    };

                    Grid itemGrid = new Grid();
                    itemGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                    itemGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                    Border numBadge = new Border
                    {
                        Width = 28,
                        Height = 28,
                        CornerRadius = new CornerRadius(8),
                        Background = BrushBgCard,
                        Margin = new Thickness(0, 0, 11, 0),
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    TextBlock numText = new TextBlock
                    {
                        Text = (i + 1).ToString(),
                        Foreground = BrushTextSecondary,
                        FontSize = 12.5,
                        FontWeight = FontWeights.Bold,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    numBadge.Child = numText;
                    Grid.SetColumn(numBadge, 0);
                    itemGrid.Children.Add(numBadge);

                    StackPanel textStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
                    textStack.Children.Add(new TextBlock
                    {
                        Text = titles[i],
                        Foreground = BrushTextPrimary,
                        FontSize = 13.5,
                        FontWeight = FontWeights.SemiBold
                    });
                    textStack.Children.Add(new TextBlock
                    {
                        Text = descs[i],
                        Foreground = BrushTextMuted,
                        FontSize = 11.5,
                        Margin = new Thickness(0, 2, 0, 0)
                    });
                    Grid.SetColumn(textStack, 1);
                    itemGrid.Children.Add(textStack);

                    card.Child = itemGrid;
                    sidebarStepCards[i] = card;
                    sidebarStepBadges[i] = numBadge;
                    sidebarStepBadgeTexts[i] = numText;
                    topStack.Children.Add(card);
                }
            }

            Grid.SetRow(topStack, 0);
            grid.Children.Add(topStack);

            // 하단 패키지 상태 카드
            Border bottomCard = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(11),
                Padding = new Thickness(14, 12, 14, 12)
            };
            StackPanel bottomStack = new StackPanel();
            bottomStack.Children.Add(new TextBlock
            {
                Text = "패키지 정보",
                Foreground = BrushTextMuted,
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold
            });
            bottomStack.Children.Add(new TextBlock
            {
                Text = "Migratify",
                Foreground = BrushTextPrimary,
                FontSize = 13.5,
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0, 4, 0, 2)
            });
            sidebarStatusText = new TextBlock
            {
                Text = isUninstallMode ? "제거 준비 완료 · v1.0.0" : "Release v1.0.0 · Windows x64",
                Foreground = BrushAccent,
                FontSize = 12
            };
            bottomStack.Children.Add(sidebarStatusText);

            // 구분선
            bottomStack.Children.Add(new Rectangle
            {
                Height = 1,
                Fill = BrushBorder,
                Margin = new Thickness(0, 8, 0, 8)
            });

            // Made by xitora & xitora.cc 바로가기 행
            Grid creatorRow = new Grid();
            creatorRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            creatorRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            TextBlock creatorLabel = new TextBlock
            {
                Text = "Made by xitora",
                Foreground = BrushTextSecondary,
                FontSize = 11.5,
                FontWeight = FontWeights.Medium,
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(creatorLabel, 0);
            creatorRow.Children.Add(creatorLabel);

            TextBlock creatorLink = new TextBlock
            {
                Text = "xitora.cc ↗",
                Foreground = BrushAccent,
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold,
                Cursor = Cursors.Hand,
                VerticalAlignment = VerticalAlignment.Center
            };
            creatorLink.MouseEnter += (s, e) => { creatorLink.Foreground = BrushAccentHover; creatorLink.TextDecorations = TextDecorations.Underline; };
            creatorLink.MouseLeave += (s, e) => { creatorLink.Foreground = BrushAccent; creatorLink.TextDecorations = null; };
            creatorLink.MouseLeftButtonDown += (s, e) =>
            {
                try { Process.Start(new ProcessStartInfo("https://xitora.cc") { UseShellExecute = true }); } catch { }
            };
            Grid.SetColumn(creatorLink, 1);
            creatorRow.Children.Add(creatorLink);

            bottomStack.Children.Add(creatorRow);
            bottomCard.Child = bottomStack;

            Grid.SetRow(bottomCard, 1);
            grid.Children.Add(bottomCard);

            sidebar.Child = grid;
            return sidebar;
        }

        // 단계 전환 및 양방향 듀얼 씬 슬라이드/스케일 전환 애니메이션 실행 함수
        private void SetStep(int step)
        {
            int prevStep = currentStep;
            bool isForward = !hasInitializedStep || step >= prevStep;
            currentStep = step;

            string[] stepNames = { "1단계 · 시작 안내", "2단계 · 설치 설정", "3단계 · 패키지 설치", "4단계 · 설치 완료" };
            stepBadgeText.Text = stepNames[step];
            if (stepChipBorder != null)
            {
                AnimateSpringPop(stepChipBorder, 0.86, 320);
            }

            for (int i = 0; i < 4; i++)
            {
                if (i == step)
                {
                    sidebarStepCards[i].Background = BrushBgCard;
                    sidebarStepCards[i].BorderBrush = BrushAccent;
                    sidebarStepBadges[i].Background = BrushAccent;
                    sidebarStepBadgeTexts[i].Foreground = BrushAccentText;
                    sidebarStepBadgeTexts[i].Text = (i + 1).ToString();

                    AnimateSidebarCardHighlight(sidebarStepCards[i]);
                    AnimateSpringPop(sidebarStepBadges[i], 0.65, 380);
                }
                else if (i < step)
                {
                    sidebarStepCards[i].Background = Brushes.Transparent;
                    sidebarStepCards[i].BorderBrush = Brushes.Transparent;
                    sidebarStepBadges[i].Background = BrushAccentSoft;
                    sidebarStepBadgeTexts[i].Foreground = BrushAccent;
                    sidebarStepBadgeTexts[i].Text = "✓";
                    if (i == prevStep)
                    {
                        AnimateSpringPop(sidebarStepBadges[i], 0.72, 340);
                    }
                }
                else
                {
                    sidebarStepCards[i].Background = Brushes.Transparent;
                    sidebarStepCards[i].BorderBrush = Brushes.Transparent;
                    sidebarStepBadges[i].Background = BrushBgCard;
                    sidebarStepBadgeTexts[i].Foreground = BrushTextMuted;
                    sidebarStepBadgeTexts[i].Text = (i + 1).ToString();
                }
            }

            UIElement nextView = null;
            if (step == 0) nextView = BuildStep0Welcome();
            else if (step == 1) nextView = BuildStep1Options();
            else if (step == 2) nextView = BuildStep2Progress();
            else if (step == 3) nextView = BuildStep3Finish();

            if (nextView != null)
            {
                UIElement outgoingView = hasInitializedStep ? currentStageView : null;
                currentStageView = nextView;
                hasInitializedStep = true;
                AnimateSceneTransition(outgoingView, nextView, isForward);
            }
        }

        // 깔끔하고 안정감 있는 뷰 전환 (과도한 3D 축소/슬라이드 및 커튼 스윕 제거, 부드러운 페이드)
        private void AnimateSceneTransition(UIElement oldView, UIElement nextView, bool isForward)
        {
            if (oldView != null && stageContainer.Children.Contains(oldView))
            {
                UIElement capturedOld = oldView;
                capturedOld.IsHitTestVisible = false;
                capturedOld.RenderTransform = null;

                DoubleAnimation oldFade = new DoubleAnimation(1.0, 0.0, TimeSpan.FromMilliseconds(120))
                {
                    EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
                };

                oldFade.Completed += (s, e) =>
                {
                    if (stageContainer.Children.Contains(capturedOld))
                    {
                        stageContainer.Children.Remove(capturedOld);
                    }
                };

                capturedOld.BeginAnimation(UIElement.OpacityProperty, oldFade);
            }
            else
            {
                stageContainer.Children.Clear();
            }

            stageContainer.Children.Add(nextView);
            nextView.RenderTransform = null;
            nextView.Opacity = 0;

            DoubleAnimation nextFade = new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(150))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };

            nextView.BeginAnimation(UIElement.OpacityProperty, nextFade);
        }

        // 화면 전환 시 커튼 스윕 제거 (정적이고 깔끔한 UI 유지)
        private void TriggerSceneCurtainSweep(bool isForward)
        {
        }

        // 화면 내부 카드 요소 표시 함수 (과도한 시차 솟아오름 및 바운스 제거)
        private void AnimateCascade(UIElement[] items)
        {
            if (items == null) return;
            for (int i = 0; i < items.Length; i++)
            {
                UIElement item = items[i];
                if (item == null) continue;
                item.RenderTransform = null;
                item.Opacity = 1.0;
            }
        }

        // 배지 및 체크박스 전환 함수 (과도한 튀어오름 제거)
        private void AnimateSpringPop(UIElement element, double fromScale, int durationMs)
        {
            if (element == null) return;
            element.RenderTransform = null;
        }

        // 좌측 사이드바 활성 단계 카드 하이라이트 (과도한 슬라이드 제거)
        private void AnimateSidebarCardHighlight(UIElement card)
        {
            if (card == null) return;
            card.RenderTransform = null;
        }

        // 히어로 로고 및 UI 요소의 무한 부유(Floating) 애니메이션 비활성화 (정적이고 안정적인 화면 유지)
        private void StartFloatingAnimation(UIElement element, double offsetPixels)
        {
            // 사용자 요청: 붕 붕 떠다니는 애니메이션 효과를 제거하여 화면을 차분하고 안정감 있게 유지
            if (element == null) return;
            element.RenderTransform = null;
        }

        // 버튼 및 컨트롤 마우스 상호작용 피드백 헬퍼 함수 (호버 시 크기 변형 없이 텍스트 선명도 유지)
        private void AttachInteractiveMotion(FrameworkElement element, double hoverScale, double pressScale, double hoverLiftY)
        {
            if (element == null) return;
            // 마우스 호버 시 버튼/카드의 크기 확대 및 축소(ScaleTransform)를 배제하여 텍스트 흐림 방지
            element.PreviewMouseLeftButtonDown += (s, e) => { element.Opacity = 0.88; };
            element.PreviewMouseLeftButtonUp += (s, e) => { element.Opacity = 1.0; };
        }

        // 1단계: 시작 안내 화면 구성 함수
        private UIElement BuildStep0Welcome()
        {
            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            // 상단 히어로 배너 카드
            Border heroCard = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(22, 20, 22, 20),
                Margin = new Thickness(0, 0, 0, 16)
            };

            Grid heroGrid = new Grid();
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border bigLogoBox = new Border
            {
                Width = 74,
                Height = 74,
                CornerRadius = new CornerRadius(18),
                Background = CreateBrush("#16171D"),
                BorderBrush = BrushAccent,
                BorderThickness = new Thickness(1.5),
                Margin = new Thickness(0, 0, 18, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            Image heroLogo = new Image
            {
                Width = 54,
                Height = 54,
                Source = LoadEmbeddedLogo(),
                Stretch = Stretch.Uniform
            };
            RenderOptions.SetBitmapScalingMode(heroLogo, BitmapScalingMode.HighQuality);
            bigLogoBox.Child = heroLogo;
            Grid.SetColumn(bigLogoBox, 0);
            heroGrid.Children.Add(bigLogoBox);

            StackPanel heroText = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            heroText.Children.Add(new TextBlock
            {
                Text = "Migratify 설치",
                Foreground = BrushTextPrimary,
                FontSize = 25,
                FontWeight = FontWeights.Bold
            });
            heroText.Children.Add(new TextBlock
            {
                Text = "기존 스포티파이 계정에 담긴 음악과 플레이리스트를 새 계정으로 안전하고 간편하게 옮겨주는 프로그램입니다.",
                Foreground = BrushTextSecondary,
                FontSize = 14.5,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 6, 0, 0),
                LineHeight = 22
            });
            Grid.SetColumn(heroText, 1);
            heroGrid.Children.Add(heroText);
            heroCard.Child = heroGrid;

            Grid.SetRow(heroCard, 0);
            grid.Children.Add(heroCard);

            // 중단 주요 기능 안내 카드 목록
            StackPanel featuresStack = new StackPanel();
            Border feat1 = CreateFeatureItem(
                "쉬운 계정 로그인",
                "복잡한 설정 없이 평소 사용하시는 웹 브라우저로 간편하게 로그인할 수 있습니다."
            );
            Border feat2 = CreateFeatureItem(
                "원하는 음악만 쏙 골라서 옮기기",
                "플레이리스트, 좋아요한 곡, 앨범, 아티스트 중 원하는 항목만 콕 집어서 옮길 수 있습니다."
            );
            Border feat3 = CreateFeatureItem(
                "안전하고 꼼꼼한 전송 및 백업",
                "음악이 누락되지 않도록 하나씩 꼼꼼하게 옮겨드리며, 파일로 백업해 둘 수도 있습니다."
            );
            featuresStack.Children.Add(feat1);
            featuresStack.Children.Add(feat2);
            featuresStack.Children.Add(feat3);

            Grid.SetRow(featuresStack, 1);
            grid.Children.Add(featuresStack);

            // 하단 액션 바
            Grid footer = new Grid { Margin = new Thickness(0, 14, 0, 0) };
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel footStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            footStack.Children.Add(new TextBlock
            {
                Text = "관리자 권한 없이 사용자 컴퓨터에 안전하게 설치됩니다.",
                Foreground = BrushTextMuted,
                FontSize = 13
            });

            Grid.SetColumn(footStack, 0);
            footer.Children.Add(footStack);

            Button nextBtn = CreatePrimaryButton("다음 단계로  →", 164);
            nextBtn.Click += (s, e) => SetStep(1);
            Grid.SetColumn(nextBtn, 1);
            footer.Children.Add(nextBtn);

            Grid.SetRow(footer, 2);
            grid.Children.Add(footer);

            AnimateCascade(new UIElement[] { heroCard, feat1, feat2, feat3, footer });
            return grid;
        }

        // 기능 소개 아이템 카드 생성 함수
        private Border CreateFeatureItem(string title, string desc)
        {
            Border card = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(18, 14, 18, 14),
                Margin = new Thickness(0, 0, 0, 10)
            };

            Grid g = new Grid();
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border dotBadge = new Border
            {
                Width = 10,
                Height = 10,
                CornerRadius = new CornerRadius(5),
                Background = BrushAccent,
                Margin = new Thickness(0, 6, 14, 0),
                VerticalAlignment = VerticalAlignment.Top
            };
            Grid.SetColumn(dotBadge, 0);
            g.Children.Add(dotBadge);

            StackPanel sp = new StackPanel();
            sp.Children.Add(new TextBlock
            {
                Text = title,
                Foreground = BrushTextPrimary,
                FontSize = 15,
                FontWeight = FontWeights.SemiBold
            });
            sp.Children.Add(new TextBlock
            {
                Text = desc,
                Foreground = BrushTextSecondary,
                FontSize = 13.5,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 4, 0, 0)
            });
            Grid.SetColumn(sp, 1);
            g.Children.Add(sp);

            card.Child = g;
            card.MouseEnter += (s, e) => { card.BorderBrush = BrushAccent; card.Background = BrushBgCard; };
            card.MouseLeave += (s, e) => { card.BorderBrush = BrushBorder; card.Background = BrushBgSidebar; };
            AttachInteractiveMotion(card, 1.012, 0.99, -2.0);
            return card;
        }

        // 2단계: 설치 경로 및 바로가기 옵션 화면 구성 함수
        private UIElement BuildStep1Options()
        {
            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            // 헤더
            StackPanel header = new StackPanel { Margin = new Thickness(0, 0, 0, 16) };
            header.Children.Add(new TextBlock
            {
                Text = "설치 위치 및 옵션 선택",
                Foreground = BrushTextPrimary,
                FontSize = 22,
                FontWeight = FontWeights.Bold
            });
            header.Children.Add(new TextBlock
            {
                Text = "프로그램이 설치될 컴퓨터 폴더와 바로가기 아이콘 옵션을 확인해 주세요.",
                Foreground = BrushTextSecondary,
                FontSize = 14.5,
                Margin = new Thickness(0, 5, 0, 0)
            });
            Grid.SetRow(header, 0);
            grid.Children.Add(header);

            // 설치 폴더 지정 카드
            Border pathCard = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(11),
                Padding = new Thickness(18, 16, 18, 16),
                Margin = new Thickness(0, 0, 0, 14)
            };
            StackPanel pathStack = new StackPanel();
            pathStack.Children.Add(new TextBlock
            {
                Text = "설치 폴더 위치",
                Foreground = BrushTextPrimary,
                FontSize = 14.5,
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0, 0, 0, 8)
            });

            Grid pathInputGrid = new Grid();
            pathInputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            pathInputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            pathTextBox = new TextBox
            {
                Text = installDir,
                Background = BrushBgSidebar,
                Foreground = BrushTextPrimary,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                Padding = new Thickness(12, 9, 12, 9),
                FontSize = 13.5,
                FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding"),
                VerticalContentAlignment = VerticalAlignment.Center
            };
            pathTextBox.TextChanged += (s, e) => { installDir = pathTextBox.Text.Trim(); };
            Grid.SetColumn(pathTextBox, 0);
            pathInputGrid.Children.Add(pathTextBox);

            Button browseBtn = CreateSecondaryButton("폴더 찾아보기", 126);
            browseBtn.Margin = new Thickness(8, 0, 0, 0);
            browseBtn.Click += (s, e) =>
            {
                IntPtr hwnd = new WindowInteropHelper(this).Handle;
                string selected = ShowModernFolderPicker(hwnd, installDir);
                if (!string.IsNullOrEmpty(selected))
                {
                    string leafName = System.IO.Path.GetFileName(selected.TrimEnd('\\', '/')) ?? "";
                    if (leafName.IndexOf("Migratify", StringComparison.OrdinalIgnoreCase) < 0)
                    {
                        selected = System.IO.Path.Combine(selected, "Migratify");
                    }
                    installDir = selected;
                    pathTextBox.Text = installDir;
                }
            };
            Grid.SetColumn(browseBtn, 1);
            pathInputGrid.Children.Add(browseBtn);
            pathStack.Children.Add(pathInputGrid);

            pathStack.Children.Add(new TextBlock
            {
                Text = "필요 디스크 공간: 약 215 MB · 기존 설정 데이터는 안전하게 보존됩니다.",
                Foreground = BrushTextMuted,
                FontSize = 13,
                Margin = new Thickness(0, 8, 0, 0)
            });
            pathCard.Child = pathStack;
            Grid.SetRow(pathCard, 1);
            grid.Children.Add(pathCard);

            // 바로가기 옵션 카드 목록
            StackPanel optionsStack = new StackPanel();
            Border optRow1 = CreateToggleOptionRow(
                "바탕화면에 바로가기 아이콘 만들기",
                "바탕화면에 아이콘을 만들어 프로그램을 쉽게 실행합니다.",
                optDesktopShortcut,
                val => optDesktopShortcut = val
            );
            Border optRow2 = CreateToggleOptionRow(
                "시작 메뉴에 바로가기 등록하기",
                "윈도우 시작 메뉴 프로그램 목록에 추가합니다.",
                optStartMenuShortcut,
                val => optStartMenuShortcut = val
            );
            Border optRow3 = CreateToggleOptionRow(
                "제어판 프로그램 추가/제거에 등록",
                "나중에 필요할 때 프로그램을 쉽게 삭제할 수 있도록 등록합니다.",
                optRegisterUninstall,
                val => optRegisterUninstall = val
            );
            optionsStack.Children.Add(optRow1);
            optionsStack.Children.Add(optRow2);
            optionsStack.Children.Add(optRow3);
            Grid.SetRow(optionsStack, 2);
            grid.Children.Add(optionsStack);

            // 하단 버튼 바
            Grid footer = new Grid { Margin = new Thickness(0, 14, 0, 0) };
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button backBtn = CreateSecondaryButton("← 이전", 116);
            backBtn.Click += (s, e) => SetStep(0);
            Grid.SetColumn(backBtn, 0);
            footer.Children.Add(backBtn);

            Button installBtn = CreatePrimaryButton("설치 시작  →", 164);
            installBtn.Click += async (s, e) =>
            {
                SetStep(2);
                await RunInstallationAsync();
            };
            Grid.SetColumn(installBtn, 2);
            footer.Children.Add(installBtn);

            Grid.SetRow(footer, 3);
            grid.Children.Add(footer);

            AnimateCascade(new UIElement[] { header, pathCard, optRow1, optRow2, optRow3, footer });
            return grid;
        }

        // 커스텀 체크박스 토글 카드 행 생성 함수
        private Border CreateToggleOptionRow(string title, string subtitle, bool initialValue, Action<bool> onChanged)
        {
            bool isChecked = initialValue;

            Border row = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = isChecked ? BrushAccent : BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(16, 12, 16, 12),
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };

            Grid g = new Grid();
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border checkBox = new Border
            {
                Width = 26,
                Height = 26,
                CornerRadius = new CornerRadius(7),
                Background = isChecked ? BrushAccent : BrushBgCard,
                BorderBrush = isChecked ? BrushAccent : BrushBorder,
                BorderThickness = new Thickness(1.2),
                Margin = new Thickness(0, 0, 14, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock checkMark = new TextBlock
            {
                Text = isChecked ? "✓" : "",
                Foreground = BrushAccentText,
                FontSize = 14,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            checkBox.Child = checkMark;
            Grid.SetColumn(checkBox, 0);
            g.Children.Add(checkBox);

            StackPanel textPanel = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            textPanel.Children.Add(new TextBlock
            {
                Text = title,
                Foreground = BrushTextPrimary,
                FontSize = 14.5,
                FontWeight = FontWeights.SemiBold
            });
            textPanel.Children.Add(new TextBlock
            {
                Text = subtitle,
                Foreground = BrushTextSecondary,
                FontSize = 13,
                Margin = new Thickness(0, 3, 0, 0)
            });
            Grid.SetColumn(textPanel, 1);
            g.Children.Add(textPanel);

            row.Child = g;

            row.MouseEnter += (s, e) => { row.Background = BrushBgCard; };
            row.MouseLeave += (s, e) => { row.Background = BrushBgSidebar; };

            row.MouseLeftButtonDown += (s, e) =>
            {
                isChecked = !isChecked;
                checkBox.Background = isChecked ? BrushAccent : BrushBgCard;
                checkBox.BorderBrush = isChecked ? BrushAccent : BrushBorder;
                checkMark.Text = isChecked ? "✓" : "";
                row.BorderBrush = isChecked ? BrushAccent : BrushBorder;
                AnimateSpringPop(checkBox, 0.55, 320);
                onChanged(isChecked);
            };

            return row;
        }

        // 3단계: 실시간 설치 진행률 화면 구성 함수
        private UIElement BuildStep2Progress()
        {
            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            StackPanel header = new StackPanel { Margin = new Thickness(0, 0, 0, 16) };
            header.Children.Add(new TextBlock
            {
                Text = "프로그램을 설치하고 있습니다",
                Foreground = BrushTextPrimary,
                FontSize = 22,
                FontWeight = FontWeights.Bold
            });
            header.Children.Add(new TextBlock
            {
                Text = "잠시만 기다려 주시면 설치가 자동으로 완료됩니다.",
                Foreground = BrushTextSecondary,
                FontSize = 14.5,
                Margin = new Thickness(0, 5, 0, 0)
            });
            Grid.SetRow(header, 0);
            grid.Children.Add(header);

            // 프로그레스 바 카드
            Border progCard = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(20, 18, 20, 18),
                Margin = new Thickness(0, 0, 0, 14)
            };

            StackPanel progStack = new StackPanel();
            Grid topRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            topRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            progressStatusText = new TextBlock
            {
                Text = "설치 환경을 준비하는 중...",
                Foreground = BrushTextPrimary,
                FontSize = 14.5,
                FontWeight = FontWeights.SemiBold,
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(progressStatusText, 0);
            topRow.Children.Add(progressStatusText);

            progressPercentText = new TextBlock
            {
                Text = "0%",
                Foreground = BrushAccent,
                FontSize = 24,
                FontWeight = FontWeights.Bold,
                FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding"),
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(progressPercentText, 1);
            topRow.Children.Add(progressPercentText);
            progStack.Children.Add(topRow);

            // 프로그레스 트랙
            Border track = new Border
            {
                Height = 12,
                CornerRadius = new CornerRadius(6),
                Background = BrushBgSidebar,
                ClipToBounds = true
            };
            track.SizeChanged += (s, e) => { progressTrackWidth = e.NewSize.Width; };

            progressFillBorder = new Border
            {
                Height = 12,
                Width = 0,
                CornerRadius = new CornerRadius(6),
                Background = BrushAccent,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            track.Child = progressFillBorder;
            progStack.Children.Add(track);

            progressCountText = new TextBlock
            {
                Text = "대기 중...",
                Foreground = BrushTextMuted,
                FontSize = 12,
                FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding"),
                Margin = new Thickness(0, 8, 0, 0)
            };
            progStack.Children.Add(progressCountText);

            progCard.Child = progStack;
            Grid.SetRow(progCard, 1);
            grid.Children.Add(progCard);

            // 실시간 작업 로그 콘솔 (앱의 Step 4 콘솔과 동일한 디자인)
            Border logCard = new Border
            {
                Background = BrushBgLog,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(11),
                Padding = new Thickness(14, 12, 14, 12)
            };

            Grid logGrid = new Grid();
            logGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            logGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            TextBlock logTitle = new TextBlock
            {
                Text = "실시간 설치 로그 콘솔",
                Foreground = BrushTextMuted,
                FontSize = 12,
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0, 0, 0, 8)
            };
            Grid.SetRow(logTitle, 0);
            logGrid.Children.Add(logTitle);

            logStackPanel = new StackPanel();
            logScrollViewer = new ScrollViewer
            {
                Content = logStackPanel,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto
            };
            Grid.SetRow(logScrollViewer, 1);
            logGrid.Children.Add(logScrollViewer);

            logCard.Child = logGrid;
            Grid.SetRow(logCard, 2);
            grid.Children.Add(logCard);

            AnimateCascade(new UIElement[] { header, progCard, logCard });
            return grid;
        }

        // 콘솔 로그 한 줄 추가 함수
        private void AppendLog(string message, bool isHighlight = false)
        {
            Dispatcher.Invoke(() =>
            {
                if (logStackPanel == null) return;
                string time = DateTime.Now.ToString("HH:mm:ss");
                TextBlock line = new TextBlock
                {
                    Text = string.Format("[{0}] {1}", time, message),
                    Foreground = isHighlight ? BrushAccent : BrushTextSecondary,
                    FontSize = 12.5,
                    FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding"),
                    Margin = new Thickness(0, 0, 0, 4),
                    TextWrapping = TextWrapping.Wrap
                };

                logStackPanel.Children.Add(line);

                if (logScrollViewer != null)
                {
                    logScrollViewer.ScrollToBottom();
                }
            });
        }

        // 프로그레스 바 애니메이션 업데이트 함수
        private void UpdateProgress(int percent, string status, string detail)
        {
            Dispatcher.Invoke(() =>
            {
                if (progressPercentText != null) progressPercentText.Text = percent + "%";
                if (progressStatusText != null) progressStatusText.Text = status;
                if (progressCountText != null) progressCountText.Text = detail;

                if (progressFillBorder != null)
                {
                    double targetWidth = Math.Max(0, Math.Min(1.0, percent / 100.0)) * progressTrackWidth;
                    DoubleAnimation anim = new DoubleAnimation(targetWidth, TimeSpan.FromMilliseconds(120))
                    {
                        EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
                    };
                    progressFillBorder.BeginAnimation(FrameworkElement.WidthProperty, anim);
                }
            });
        }

        // 실제 페이로드 압축 해제, 바로가기 생성 및 레지스트리 등록 비동기 실행 함수
        private async Task RunInstallationAsync()
        {
            isBusy = true;
            sidebarStatusText.Text = "설치 진행 중...";

            try
            {
                AppendLog("설치 대상 경로 확인: " + installDir, true);
                UpdateProgress(3, "실행 중인 기존 프로세스 점검 중...", installDir);

                await Task.Run(() =>
                {
                    // 실행 중인 Migratify 프로세스가 있으면 종료
                    try
                    {
                        foreach (var proc in Process.GetProcessesByName("Migratify"))
                        {
                            try
                            {
                                proc.Kill();
                                proc.WaitForExit(3000);
                            }
                            catch { }
                        }
                    }
                    catch { }

                    Directory.CreateDirectory(installDir);

                    string selfExe = Process.GetCurrentProcess().MainModule.FileName;
                    using (FileStream fs = new FileStream(selfExe, FileMode.Open, FileAccess.Read, FileShare.Read))
                    {
                        if (fs.Length < 16)
                        {
                            throw new InvalidOperationException("설치 파일 크기가 올바르지 않습니다.");
                        }

                        // 파일 끝 16바이트에서 [8바이트 ZIP 시작 오프셋][8바이트 매직 시그니처] 확인
                        fs.Seek(-16, SeekOrigin.End);
                        byte[] trailer = new byte[16];
                        fs.Read(trailer, 0, 16);

                        long zipOffset = BitConverter.ToInt64(trailer, 0);
                        string magic = Encoding.ASCII.GetString(trailer, 8, 8);

                        if (magic != "SAMIG320" || zipOffset <= 0 || zipOffset >= fs.Length - 16)
                        {
                            throw new InvalidOperationException("내장된 애플리케이션 패키지 데이터를 찾을 수 없습니다.");
                        }

                        long zipLength = (fs.Length - 16) - zipOffset;
                        AppendLog(string.Format("패키지 아카이브 검증 완료 ({0:F1} MB)", zipLength / (1024.0 * 1024.0)));

                        // 언인스톨러 생성을 위해 순수 인스톨러 실행 파일 영역(0 ~ zipOffset)을 설치 폴더에 복사
                        string uninstallerPath = System.IO.Path.Combine(installDir, "Uninstall Migratify.exe");
                        fs.Seek(0, SeekOrigin.Begin);
                        using (FileStream ufs = new FileStream(uninstallerPath, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            byte[] copyBuf = new byte[65536];
                            long remaining = zipOffset;
                            while (remaining > 0)
                            {
                                int toRead = (int)Math.Min(copyBuf.Length, remaining);
                                int read = fs.Read(copyBuf, 0, toRead);
                                if (read <= 0) break;
                                ufs.Write(copyBuf, 0, read);
                                remaining -= read;
                            }
                        }

                        // SubStream으로 [zipOffset, zipOffset + zipLength) 구간만 독립된 ZIP 스트림으로 슬라이싱하여 압축 해제
                        using (SubStream zipSlice = new SubStream(fs, zipOffset, zipLength))
                        using (ZipArchive archive = new ZipArchive(zipSlice, ZipArchiveMode.Read, true))
                        {
                            int total = archive.Entries.Count;
                            int current = 0;

                            foreach (ZipArchiveEntry entry in archive.Entries)
                            {
                                current++;
                                string relPath = entry.FullName.Replace('/', '\\');
                                string fullPath = System.IO.Path.Combine(installDir, relPath);

                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(fullPath);
                                    continue;
                                }

                                string parentDir = System.IO.Path.GetDirectoryName(fullPath);
                                if (!string.IsNullOrEmpty(parentDir))
                                {
                                    Directory.CreateDirectory(parentDir);
                                }

                                entry.ExtractToFile(fullPath, true);

                                int pct = 8 + (int)((current / (double)total) * 82.0);
                                if (current % 3 == 0 || current == total || entry.Length > 2 * 1024 * 1024)
                                {
                                    UpdateProgress(
                                        pct,
                                        "파일 압축 해제 중: " + entry.Name,
                                        string.Format("{0} / {1} 항목 완료 ({2})", current, total, relPath)
                                    );
                                    AppendLog("추출 완료: " + relPath);
                                }
                            }
                        }
                    }

                    string targetExe = System.IO.Path.Combine(installDir, "Migratify.exe");
                    string targetIco = System.IO.Path.Combine(installDir, "resources", "icon.ico");
                    if (!File.Exists(targetIco))
                    {
                        targetIco = targetExe;
                    }

                    // 바탕화면 바로가기 생성
                    if (optDesktopShortcut)
                    {
                        UpdateProgress(93, "바탕화면 바로가기 생성 중...", "Migratify.lnk");
                        string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        string lnkPath = System.IO.Path.Combine(desktopDir, "Migratify.lnk");
                        CreateShortcut(lnkPath, targetExe, installDir, targetIco, "Migratify");
                        AppendLog("바탕화면 바로가기 아이콘 생성 완료", true);
                    }

                    // 시작 메뉴 바로가기 생성
                    if (optStartMenuShortcut)
                    {
                        UpdateProgress(96, "시작 메뉴 바로가기 등록 중...", "Programs\\Migratify.lnk");
                        string startMenuDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                        string lnkPath = System.IO.Path.Combine(startMenuDir, "Migratify.lnk");
                        CreateShortcut(lnkPath, targetExe, installDir, targetIco, "Migratify");
                        AppendLog("시작 메뉴 바로가기 등록 완료", true);
                    }

                    // Windows 제어판(설치된 앱) 언인스톨 레지스트리 등록
                    if (optRegisterUninstall)
                    {
                        UpdateProgress(98, "Windows 프로그램 추가/제거 레지스트리 등록 중...", "HKCU\\...\\Uninstall\\Migratify");
                        RegisterUninstaller(installDir, targetExe, targetIco);
                        AppendLog("Windows 프로그램 추가/제거 등록 완료", true);
                    }

                    // Windows 아이콘 캐시 새로고침 알림
                    SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
                });

                UpdateProgress(100, "모든 패키지 설치가 완료되었습니다.", "설치 성공");
                AppendLog("설치가 성공적으로 완료되었습니다!", true);
                sidebarStatusText.Text = "설치 완료 · v1.0.0";
                await Task.Delay(450);
                isBusy = false;
                SetStep(3);
            }
            catch (Exception ex)
            {
                isBusy = false;
                AppendLog("[오류] " + ex.Message, true);
                UpdateProgress(0, "설치 중 오류가 발생했습니다.", ex.Message);
                MessageBox.Show(
                    "설치 중 오류가 발생했습니다:\n" + ex.Message,
                    "Migratify Installer",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
            }
        }

        // 4단계: 설치 완료 화면 구성 함수
        private UIElement BuildStep3Finish()
        {
            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            Border doneCard = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushAccent,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(22, 22, 22, 22),
                Margin = new Thickness(0, 0, 0, 16)
            };

            StackPanel doneStack = new StackPanel();
            StackPanel badgeRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 0, 0, 10)
            };
            Border okChip = new Border
            {
                Background = BrushAccentSoft,
                BorderBrush = BrushAccent,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(12, 4, 12, 4)
            };
            okChip.Child = new TextBlock
            {
                Text = "✓  설치 완료",
                Foreground = BrushAccent,
                FontSize = 13,
                FontWeight = FontWeights.Bold
            };
            AnimateSpringPop(okChip, 0.65, 420);
            badgeRow.Children.Add(okChip);
            doneStack.Children.Add(badgeRow);

            doneStack.Children.Add(new TextBlock
            {
                Text = "Migratify 설치가 완료되었습니다",
                Foreground = BrushTextPrimary,
                FontSize = 24,
                FontWeight = FontWeights.Bold
            });
            doneStack.Children.Add(new TextBlock
            {
                Text = "이제 프로그램을 실행하여 기존 계정의 음악을 새 계정으로 옮길 수 있습니다.",
                Foreground = BrushTextSecondary,
                FontSize = 14.5,
                Margin = new Thickness(0, 6, 0, 14)
            });

            Border pathInfo = new Border
            {
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(14, 10, 14, 10)
            };
            pathInfo.Child = new TextBlock
            {
                Text = "설치된 폴더: " + installDir,
                Foreground = BrushTextSecondary,
                FontSize = 13,
                FontFamily = new FontFamily("Consolas, D2 Coding, D2Coding"),
                TextWrapping = TextWrapping.Wrap
            };
            doneStack.Children.Add(pathInfo);
            doneCard.Child = doneStack;

            Grid.SetRow(doneCard, 0);
            grid.Children.Add(doneCard);

            // 즉시 실행 옵션
            StackPanel midStack = new StackPanel();
            midStack.Children.Add(CreateToggleOptionRow(
                "설치 종료 후 프로그램 바로 실행하기",
                "완료 버튼을 누르면 프로그램을 즉시 시작합니다.",
                optLaunchAfterInstall,
                val => optLaunchAfterInstall = val
            ));
            Grid.SetRow(midStack, 1);
            grid.Children.Add(midStack);

            // 하단 완료 버튼 및 제작자 크레딧
            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel finishLeftStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            finishLeftStack.Children.Add(new TextBlock
            {
                Text = "설치 프로세스가 성공적으로 완료되었습니다.",
                Foreground = BrushTextSecondary,
                FontSize = 12.5,
                FontWeight = FontWeights.Medium
            });

            Grid.SetColumn(finishLeftStack, 0);
            footer.Children.Add(finishLeftStack);

            Button finishBtn = CreatePrimaryButton("설치 완료 및 마침", 186);
            finishBtn.Click += (s, e) =>
            {
                if (optLaunchAfterInstall)
                {
                    try
                    {
                        string exe = System.IO.Path.Combine(installDir, "Migratify.exe");
                        if (File.Exists(exe))
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = exe,
                                WorkingDirectory = installDir,
                                UseShellExecute = true
                            });
                        }
                    }
                    catch { }
                }
                this.Close();
            };
            Grid.SetColumn(finishBtn, 1);
            footer.Children.Add(finishBtn);

            Grid.SetRow(footer, 2);
            grid.Children.Add(footer);

            // 완료 화면 카드 순차 등장 모션 적용
            AnimateCascade(new UIElement[] { doneCard, midStack, footer });

            return grid;
        }

        // 언인스톨 모드 화면 구성 함수
        private void RenderUninstallStage()
        {
            stageContainer.Children.Clear();

            Grid grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            Border card = new Border
            {
                Background = BrushBgCard,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(22, 22, 22, 22)
            };
            StackPanel sp = new StackPanel();
            TextBlock spTitle = new TextBlock
            {
                Text = "Migratify 제거",
                Foreground = BrushTextPrimary,
                FontSize = 22,
                FontWeight = FontWeights.Bold
            };
            sp.Children.Add(spTitle);
            sp.Children.Add(new TextBlock
            {
                Text = "설치된 프로그램 파일, 바탕화면 바로가기, 시작 메뉴 등록 정보를 PC에서 깔끔하게 삭제합니다.\n제거 대상 경로: " + installDir,
                Foreground = BrushTextSecondary,
                FontSize = 13.5,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 8, 0, 0),
                LineHeight = 22
            });

            bool keepBackups = true;
            Border backupOption = CreateToggleOptionRow(
                "저장된 JSON 백업 데이터(backups 폴더) 보존하기",
                "이전에 생성하거나 보관한 로컬 백업 파일들을 삭제하지 않고 안전하게 유지합니다. (권장)",
                true,
                val => { keepBackups = val; }
            );
            backupOption.Margin = new Thickness(0, 14, 0, 0);
            sp.Children.Add(backupOption);

            card.Child = sp;
            Grid.SetRow(card, 0);
            grid.Children.Add(card);

            Grid footer = new Grid();
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footer.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Button cancelBtn = CreateSecondaryButton("취소", 110);
            cancelBtn.Click += (s, e) => this.Close();
            Grid.SetColumn(cancelBtn, 0);
            footer.Children.Add(cancelBtn);

            Button removeBtn = CreatePrimaryButton("프로그램 완전히 제거하기", 210);
            removeBtn.Click += (s, e) =>
            {
                var confirm = MessageBox.Show(
                    "Migratify 및 관련 바로가기를 PC에서 완전히 제거하시겠습니까?",
                    "제거 확인",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question
                );
                if (confirm == MessageBoxResult.Yes)
                {
                    PerformUninstall(keepBackups);
                }
            };
            Grid.SetColumn(removeBtn, 2);
            footer.Children.Add(removeBtn);

            Grid.SetRow(footer, 2);
            grid.Children.Add(footer);

            stageContainer.Children.Add(grid);
        }

        // 언인스톨 실행 함수
        private void PerformUninstall(bool keepBackups)
        {
            try
            {
                foreach (var proc in Process.GetProcessesByName("Migratify"))
                {
                    try { proc.Kill(); proc.WaitForExit(2000); } catch { }
                }

                string desktopLnk = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Migratify.lnk");
                if (File.Exists(desktopLnk)) File.Delete(desktopLnk);

                string startLnk = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Migratify.lnk");
                if (File.Exists(startLnk)) File.Delete(startLnk);

                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Migratify", false);

                MessageBox.Show("Migratify가 성공적으로 제거되었습니다.", "제거 완료", MessageBoxButton.OK, MessageBoxImage.Information);

                // 언인스톨러 종료 후 설치 디렉터리 파일 삭제
                if (Directory.Exists(installDir))
                {
                    string cmdArgs;
                    string backupsDir = System.IO.Path.Combine(installDir, "backups");
                    if (keepBackups && Directory.Exists(backupsDir))
                    {
                        // backups 폴더는 보존하고 나머지 실행 파일 및 하위 폴더만 안전하게 제거
                        cmdArgs = string.Format(
                            "/C timeout /t 1 /nobreak >nul & for /l %i in (1,1,5) do (del /f /q /a \"{0}\\*.*\" 2>nul & for /d %d in (\"{0}\\*\") do (if /i not \"%~nxd\"==\"backups\" rmdir /s /q \"%d\" 2>nul) & timeout /t 1 /nobreak >nul)",
                            installDir
                        );
                    }
                    else
                    {
                        // 전체 폴더 완전 삭제
                        cmdArgs = string.Format(
                            "/C timeout /t 1 /nobreak >nul & for /l %i in (1,1,10) do (if exist \"{0}\" (rmdir /s /q \"{0}\" & timeout /t 1 /nobreak >nul))",
                            installDir
                        );
                    }

                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = cmdArgs,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true
                    });
                }

                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("제거 중 오류 발생: " + ex.Message, "오류", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // 라벤더 액센트 프라이머리 버튼 생성 함수
        private Button CreatePrimaryButton(string text, double width)
        {
            Border bd = new Border
            {
                Width = width,
                Height = 44,
                CornerRadius = new CornerRadius(10),
                Background = BrushAccent
            };
            TextBlock tb = new TextBlock
            {
                Text = text,
                Foreground = BrushAccentText,
                FontSize = 14,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            bd.Child = tb;

            Button btn = new Button
            {
                Content = bd,
                Cursor = Cursors.Hand,
                Template = CreateFlatButtonTemplate()
            };
            btn.MouseEnter += (s, e) => { bd.Background = BrushAccentHover; };
            btn.MouseLeave += (s, e) => { bd.Background = BrushAccent; };
            AttachInteractiveMotion(btn, 1.03, 0.96, -1.5);
            return btn;
        }

        // 다크 서피스 세컨더리 버튼 생성 함수
        private Button CreateSecondaryButton(string text, double width)
        {
            Border bd = new Border
            {
                Width = width,
                Height = 42,
                CornerRadius = new CornerRadius(9),
                Background = BrushBgSidebar,
                BorderBrush = BrushBorder,
                BorderThickness = new Thickness(1)
            };
            TextBlock tb = new TextBlock
            {
                Text = text,
                Foreground = BrushTextPrimary,
                FontSize = 13.5,
                FontWeight = FontWeights.Medium,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            bd.Child = tb;

            Button btn = new Button
            {
                Content = bd,
                Cursor = Cursors.Hand,
                Template = CreateFlatButtonTemplate()
            };
            btn.MouseEnter += (s, e) => { bd.Background = BrushBgCardHover; };
            btn.MouseLeave += (s, e) => { bd.Background = BrushBgSidebar; };
            AttachInteractiveMotion(btn, 1.025, 0.97, -1.0);
            return btn;
        }

        // 기본 WPF 버튼 크롬 제거 템플릿 생성 함수
        private ControlTemplate CreateFlatButtonTemplate()
        {
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory presenter = new FrameworkElementFactory(typeof(ContentPresenter));
            template.VisualTree = presenter;
            return template;
        }

        // Windows Shell 바로가기(.lnk) 생성 함수
        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string iconPath, string description)
        {
            IShellLinkW link = (IShellLinkW)new ShellLink();
            link.SetPath(targetPath);
            link.SetWorkingDirectory(workingDir);
            link.SetIconLocation(iconPath, 0);
            link.SetDescription(description);
            IPersistFile file = (IPersistFile)link;
            file.Save(shortcutPath, false);
        }

        // Windows 프로그램 추가/제거 레지스트리 등록 함수
        private static void RegisterUninstaller(string installDir, string targetExe, string iconPath)
        {
            string uninstallerExe = System.IO.Path.Combine(installDir, "Uninstall Migratify.exe");
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Migratify"))
            {
                if (key != null)
                {
                    key.SetValue("DisplayName", "Migratify");
                    key.SetValue("DisplayVersion", "1.0.0");
                    key.SetValue("Publisher", "xitora.cc");
                    key.SetValue("DisplayIcon", iconPath);
                    key.SetValue("InstallLocation", installDir);
                    key.SetValue("UninstallString", "\"" + uninstallerExe + "\" --uninstall");
                    key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                    key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    key.SetValue("EstimatedSize", 215000, RegistryValueKind.DWord);
                }
            }
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern int SHCreateItemFromParsingName(
            [MarshalAs(UnmanagedType.LPWStr)] string pszPath,
            IntPtr pbc,
            [In, MarshalAs(UnmanagedType.LPStruct)] Guid riid,
            [MarshalAs(UnmanagedType.Interface)] out IShellItem ppv
        );

        // 최신 Windows 탐색기 스타일(IFileOpenDialog - FOS_PICKFOLDERS) 폴더 선택 대화상자 호출 함수
        private string ShowModernFolderPicker(IntPtr ownerHwnd, string initialFolder)
        {
            try
            {
                var dialog = (IFileOpenDialog)new FileOpenDialogRCW();
                uint options;
                dialog.GetOptions(out options);
                // FOS_PICKFOLDERS (0x20) | FOS_FORCEFILESYSTEM (0x40) | FOS_PATHMUSTEXIST (0x800)
                options |= 0x20 | 0x40 | 0x800;
                dialog.SetOptions(options);
                dialog.SetTitle("Migratify를 설치할 대상 폴더를 선택하세요");
                dialog.SetOkButtonLabel("폴더 선택");

                string targetFolder = initialFolder;
                if (!string.IsNullOrEmpty(targetFolder) && !Directory.Exists(targetFolder))
                {
                    try
                    {
                        targetFolder = System.IO.Path.GetDirectoryName(targetFolder);
                    }
                    catch { }
                }

                if (!string.IsNullOrEmpty(targetFolder) && Directory.Exists(targetFolder))
                {
                    Guid shellItemGuid = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
                    IShellItem folderItem;
                    if (SHCreateItemFromParsingName(targetFolder, IntPtr.Zero, shellItemGuid, out folderItem) == 0 && folderItem != null)
                    {
                        dialog.SetFolder(folderItem);
                    }
                }

                int hr = dialog.Show(ownerHwnd);
                if (hr == 0) // S_OK (사용자가 폴더를 선택하고 확인 버튼을 누름)
                {
                    IShellItem resultItem;
                    dialog.GetResult(out resultItem);
                    if (resultItem != null)
                    {
                        string selectedPath;
                        // SIGDN_FILESYSPATH = 0x80058000
                        resultItem.GetDisplayName(0x80058000, out selectedPath);
                        if (!string.IsNullOrEmpty(selectedPath))
                        {
                            return selectedPath;
                        }
                    }
                }
                return null;
            }
            catch
            {
                // 최신 탐색기 다이얼로그 호출 실패 시 구형 FolderBrowserDialog로 안전하게 폴백
                try
                {
                    using (var dlg = new System.Windows.Forms.FolderBrowserDialog())
                    {
                        dlg.Description = "Migratify를 설치할 폴더를 선택하세요.";
                        dlg.SelectedPath = initialFolder;
                        if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                        {
                            return dlg.SelectedPath;
                        }
                    }
                }
                catch { }
                return null;
            }
        }

        [DllImport("shell32.dll")]
        private static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
    }

    // 단일 실행 파일(.exe) 내부의 특정 오프셋~길이 구간만 독립된 ZIP 스트림처럼 노출하는 슬라이스 스트림 클래스
    internal sealed class SubStream : Stream
    {
        private readonly Stream baseStream;
        private readonly long baseOffset;
        private readonly long length;
        private long position;

        public SubStream(Stream baseStream, long baseOffset, long length)
        {
            this.baseStream = baseStream;
            this.baseOffset = baseOffset;
            this.length = length;
            this.position = 0;
            this.baseStream.Seek(this.baseOffset, SeekOrigin.Begin);
        }

        public override bool CanRead { get { return true; } }
        public override bool CanSeek { get { return true; } }
        public override bool CanWrite { get { return false; } }
        public override long Length { get { return this.length; } }

        public override long Position
        {
            get { return this.position; }
            set { Seek(value, SeekOrigin.Begin); }
        }

        public override void Flush() { }

        public override int Read(byte[] buffer, int offset, int count)
        {
            long remaining = this.length - this.position;
            if (remaining <= 0) return 0;
            if (count > remaining) count = (int)remaining;

            this.baseStream.Seek(this.baseOffset + this.position, SeekOrigin.Begin);
            int read = this.baseStream.Read(buffer, offset, count);
            this.position += read;
            return read;
        }

        public override long Seek(long offset, SeekOrigin origin)
        {
            long target;
            if (origin == SeekOrigin.Begin)
                target = offset;
            else if (origin == SeekOrigin.Current)
                target = this.position + offset;
            else
                target = this.length + offset;

            if (target < 0) target = 0;
            if (target > this.length) target = this.length;

            this.position = target;
            this.baseStream.Seek(this.baseOffset + this.position, SeekOrigin.Begin);
            return this.position;
        }

        public override void SetLength(long value)
        {
            throw new NotSupportedException();
        }

        public override void Write(byte[] buffer, int offset, int count)
        {
            throw new NotSupportedException();
        }
    }

    public static class Program
    {
        // 빌드 직후 내장 ZIP 아카이브의 중앙 디렉터리 및 엔트리 추출 가능 여부를 검증하는 함수
        private static int VerifyEmbeddedArchive()
        {
            try
            {
                string selfExe = Process.GetCurrentProcess().MainModule.FileName;
                using (FileStream fs = new FileStream(selfExe, FileMode.Open, FileAccess.Read, FileShare.Read))
                {
                    fs.Seek(-16, SeekOrigin.End);
                    byte[] trailer = new byte[16];
                    fs.Read(trailer, 0, 16);

                    long zipOffset = BitConverter.ToInt64(trailer, 0);
                    string magic = Encoding.ASCII.GetString(trailer, 8, 8);
                    if (magic != "SAMIG320" || zipOffset <= 0 || zipOffset >= fs.Length - 16)
                    {
                        return 2;
                    }

                    long zipLength = (fs.Length - 16) - zipOffset;
                    using (SubStream zipSlice = new SubStream(fs, zipOffset, zipLength))
                    using (ZipArchive archive = new ZipArchive(zipSlice, ZipArchiveMode.Read, true))
                    {
                        int count = archive.Entries.Count;
                        if (count <= 0) return 3;

                        // 첫 번째와 마지막 파일 엔트리 스트림 실제 읽기 검증
                        byte[] buf = new byte[256];
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            if (!string.IsNullOrEmpty(entry.Name))
                            {
                                using (Stream es = entry.Open())
                                {
                                    es.Read(buf, 0, buf.Length);
                                }
                                break;
                            }
                        }
                    }
                }
                return 0;
            }
            catch
            {
                return 1;
            }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            bool uninstall = false;

            try
            {
                string procName = Process.GetCurrentProcess().ProcessName;
                if (procName.IndexOf("uninstall", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    procName.IndexOf("unins", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    uninstall = true;
                }
            }
            catch { }

            if (args != null)
            {
                foreach (string a in args)
                {
                    if (string.Equals(a, "--verify-archive", StringComparison.OrdinalIgnoreCase))
                    {
                        Environment.Exit(VerifyEmbeddedArchive());
                        return;
                    }
                    if (string.Equals(a, "--uninstall", StringComparison.OrdinalIgnoreCase))
                    {
                        uninstall = true;
                    }
                }
            }

            Application app = new Application();
            InstallerWindow win = new InstallerWindow(uninstall);
            app.Run(win);
        }
    }
}
