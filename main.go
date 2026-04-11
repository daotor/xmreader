package main

import (
	"embed"
	"log"
	"net"
	"os"
	"runtime"

	bootstrap "github.com/daotor/xmreader/internal/bootstrap"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	logPath, closeLogFile := bootstrap.SetupStartupLogging(bootstrap.AppDisplayName)
	defer closeLogFile()

	// Handle --register without using flag.Parse (which eats non-flag args like "file.md")
	for _, arg := range runtimeArgs() {
		if arg == bootstrap.RegisterFlag {
			if err := bootstrap.RegisterFileAssoc(); err != nil {
				log.Fatalf("注册文件关联失败: %v", err)
			}
			log.Println("✓ .md / .mdc 文件关联已注册成功（双击文件将使用 XMReader 打开）")
			return
		}
	}

	if err := bootstrap.EnsureWindowsDependencies(logPath); err != nil {
		log.Fatalf("Windows 依赖检查失败: %v", err)
	}

	launchArgs := runtimeArgs()
	filePaths := collectExistingFilePaths(launchArgs, "")
	allowNewWindow := bootstrap.HasArg(launchArgs, bootstrap.NewWindowFlag)
	log.Printf("接收文件: %v (来自 os.Args: %v)\n", filePaths, os.Args)

	webviewUserDataPath := bootstrap.ResolveWebviewUserDataPath(bootstrap.AppDisplayName)
	bootstrap.LogWindowsRuntimeContext(logPath, webviewUserDataPath)

	app := NewApp(filePaths)
	appMenu := menu.NewMenu()
	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.AppMenu())
		appMenu.Append(menu.EditMenu())
		appMenu.Append(menu.WindowMenu())
	}

	var primaryInstanceListener net.Listener
	if !allowNewWindow {
		reused, err := tryForwardToPrimaryInstance(launchArgs)
		if err == nil && reused {
			log.Printf("[XMReader] 已将参数转发给主窗口: %v\n", launchArgs)
			return
		}

		primaryInstanceListener, err = startPrimaryInstanceServer(app)
		if err != nil {
			log.Printf("[XMReader] 启动主窗口监听失败，将继续以多实例模式运行: %v\n", err)
		} else {
			defer primaryInstanceListener.Close()
		}
	}

	err := wails.Run(&options.App{
		Title:     bootstrap.AppDisplayName,
		Width:     1024,
		Height:    768,
		MinWidth:  400,
		MinHeight: 300,
		Menu:      appMenu,
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: true,
		},
		AssetServer: &assetserver.Options{
			Assets:     assets,
			Middleware: bootstrap.LocalFileAssetMiddleware(),
		},
		DisableResize: false,
		Frameless:     false,
		Windows: &windows.Options{
			DisablePinchZoom:    false,
			WebviewUserDataPath: webviewUserDataPath,
			Messages: &windows.Messages{
				InstallationRequired: "XMReader 依赖 Microsoft WebView2 Runtime。点击“确定”后将尝试自动下载安装，请稍候。",
				UpdateRequired:       "当前 Microsoft WebView2 Runtime 版本过低。点击“确定”后将尝试自动更新，请稍候。",
				MissingRequirements:  "XMReader 依赖检查",
				Webview2NotInstalled: "未检测到 WebView2 Runtime",
				Error:                "XMReader 错误",
				FailedToInstall:      "WebView2 Runtime 安装失败，请稍后重试或手动安装。",
				DownloadPage:         "XMReader 依赖 WebView2 Runtime。点击“确定”打开官方下载页面。最低要求版本：",
				PressOKToInstall:     "点击“确定”开始安装。",
				ContactAdmin:         "XMReader 依赖 WebView2 Runtime。请联系系统管理员完成安装。",
				InvalidFixedWebview2: "当前指定的 WebView2 Runtime 路径无效，请检查路径和版本。",
				WebView2ProcessCrash: "WebView2 进程发生异常，XMReader 需要重新启动。",
			},
		},
		Mac: &mac.Options{
			DisableZoom: false,
			OnFileOpen:  app.handleMacFileOpen,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}

func runtimeArgs() []string {
	if len(os.Args) > 1 {
		return os.Args[1:]
	}
	return []string{}
}
