package main

import (
	"embed"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"unicode/utf16"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

const newWindowFlag = "--new-window"
const registerFlag = "--register"

func hasArg(args []string, expected string) bool {
	for _, arg := range args {
		if arg == expected {
			return true
		}
	}
	return false
}

func registerFileAssoc() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	exePath, err = filepath.Abs(exePath)
	if err != nil {
		return err
	}

	if runtime.GOOS == "windows" {
		return registerWindows(exePath)
	}
	return nil
}

func registerWindows(exePath string) error {
	log.Printf("注册文件关联，程序路径: %s\n", exePath)

	// Use reg add directly (avoids encoding issues with .reg files)
	cmds := [][]string{
		{"add", `HKCU\Software\Classes\.md`, "/ve", "/d", "kmread.markdown", "/f"},
		{"add", `HKCU\Software\Classes\.mdc`, "/ve", "/d", "kmread.markdown", "/f"},
		{"add", `HKCU\Software\Classes\kmread.markdown`, "/ve", "/d", "Markdown Document", "/f"},
		{"add", `HKCU\Software\Classes\kmread.markdown\DefaultIcon`, "/ve", "/d", exePath + ",0", "/f"},
		{"add", `HKCU\Software\Classes\kmread.markdown\shell\open\command`, "/ve", "/d", `"` + exePath + `" "%1"`, "/f"},
		{"add", `HKCU\Software\Classes\.md\OpenWithProgids`, "/v", "kmread.markdown", "/d", "", "/f"},
		{"add", `HKCU\Software\Classes\.mdc\OpenWithProgids`, "/v", "kmread.markdown", "/d", "", "/f"},
	}

	for _, args := range cmds {
		cmd := exec.Command("reg", args...)
		out, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("reg %s failed: %s\nError: %v\n", strings.Join(args, " "), string(out), err)
			return err
		}
	}

	log.Println("✓ .md / .mdc 文件关联已注册成功（双击文件将使用 KMRead 打开）")
	return nil
}

// stringToUTF16LE converts a string to UTF-16 LE bytes with BOM (for .reg files).
// kept for potential future use with .reg files
func stringToUTF16LE(s string) []byte {
	encoded := utf16.Encode([]rune(s))
	b := make([]byte, 2+len(encoded)*2)
	b[0] = 0xFF // BOM
	b[1] = 0xFE
	for i, v := range encoded {
		b[2+i*2] = byte(v)
		b[2+i*2+1] = byte(v >> 8)
	}
	return b
}

func main() {
	// Handle --register without using flag.Parse (which eats non-flag args like "file.md")
	for _, arg := range os.Args[1:] {
		if arg == registerFlag {
			if err := registerFileAssoc(); err != nil {
				log.Fatalf("注册文件关联失败: %v", err)
			}
			return
		}
	}

	launchArgs := os.Args[1:]
	filePaths := collectExistingFilePaths(launchArgs, "")
	allowNewWindow := hasArg(launchArgs, newWindowFlag)
	log.Printf("接收文件: %v (来自 os.Args: %v)\n", filePaths, os.Args)

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
			log.Printf("[KMRead] 已将参数转发给主窗口: %v\n", launchArgs)
			return
		}

		primaryInstanceListener, err = startPrimaryInstanceServer(app)
		if err != nil {
			log.Printf("[KMRead] 启动主窗口监听失败，将继续以多实例模式运行: %v\n", err)
		} else {
			defer primaryInstanceListener.Close()
		}
	}

	err := wails.Run(&options.App{
		Title:     "KMRead",
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
			Middleware: localFileAssetMiddleware(),
		},
		DisableResize: false,
		Frameless:     false,
		Windows: &windows.Options{
			DisablePinchZoom:    false,
			WebviewUserDataPath: filepath.Join(os.TempDir(), "kmread"),
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
