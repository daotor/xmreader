package main

import (
	"embed"
	"log"
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
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

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
		{"add", `HKCU\Software\Classes\kmread.markdown`, "/ve", "/d", "Markdown Document", "/f"},
		{"add", `HKCU\Software\Classes\kmread.markdown\DefaultIcon`, "/ve", "/d", exePath + ",0", "/f"},
		{"add", `HKCU\Software\Classes\kmread.markdown\shell\open\command`, "/ve", "/d", `"` + exePath + `" "%1"`, "/f"},
		{"add", `HKCU\Software\Classes\.md\OpenWithProgids`, "/v", "kmread.markdown", "/d", "", "/f"},
	}

	for _, args := range cmds {
		cmd := exec.Command("reg", args...)
		out, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("reg %s failed: %s\nError: %v\n", strings.Join(args, " "), string(out), err)
			return err
		}
	}

	log.Println("✓ .md 文件关联已注册成功（双击 .md 文件将使用 KMRead 打开）")
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
		if arg == "--register" {
			if err := registerFileAssoc(); err != nil {
				log.Fatalf("注册文件关联失败: %v", err)
			}
			return
		}
	}

	// Collect file paths from all arguments
	var filePaths []string
	for _, arg := range os.Args[1:] {
		if strings.HasPrefix(arg, "-") {
			continue
		}
		// Check if file exists and is not a directory
		info, err := os.Stat(arg)
		if err == nil && !info.IsDir() {
			abs, err := filepath.Abs(arg)
			if err == nil {
				filePaths = append(filePaths, abs)
			}
		}
	}
	log.Printf("接收文件: %v (来自 os.Args: %v)\n", filePaths, os.Args)

	app := NewApp(filePaths)
	appMenu := menu.NewMenu()

	err := wails.Run(&options.App{
		Title:         "KMRead",
		Width:         1024,
		Height:        768,
		MinWidth:      400,
		MinHeight:     300,
		Menu:          appMenu,
		OnStartup:     app.startup,
		Bind: []interface{}{
			app,
		},
		AssetServer:   &assetserver.Options{Assets: assets},
		DisableResize: false,
		Frameless:     false,
		Windows: &windows.Options{
			DisablePinchZoom:    false,
			WebviewUserDataPath: filepath.Join(os.TempDir(), "kmread"),
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
