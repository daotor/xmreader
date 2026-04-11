//go:build windows

package bootstrap

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"github.com/wailsapp/go-webview2/webviewloader"
	"golang.org/x/sys/windows/registry"
)

const (
	webView2MinimumVersion   = "94.0.992.31"
	webView2BootstrapperURL  = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
	webView2DownloadPageURL  = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
	webView2ClientGUID       = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
	messageBoxOK             = 0x00000000
	messageBoxYesNo          = 0x00000004
	messageBoxIconError      = 0x00000010
	messageBoxIconQuestion   = 0x00000020
	messageBoxIconInfo       = 0x00000040
	messageBoxDefaultButton2 = 0x00000100
	messageBoxResultYes      = 6
)

type webView2RuntimeStatus struct {
	DetectedVersion string
	RegistryVersion string
	RegistryScope   string
	MeetsMinimum    bool
}

func EnsureWindowsDependencies(logPath string) error {
	logWindowsBuildInfo()

	if err := validateWindowsBuild(logPath); err != nil {
		return err
	}

	status, err := detectWebView2Runtime()
	if err != nil {
		log.Printf("[XMReader] 检测 WebView2 Runtime 失败: %v\n", err)
	}

	log.Printf(
		"[XMReader] WebView2 runtime detected=%q registry=%q scope=%q meetsMinimum=%t minimum=%s\n",
		status.DetectedVersion,
		status.RegistryVersion,
		status.RegistryScope,
		status.MeetsMinimum,
		webView2MinimumVersion,
	)

	if status.MeetsMinimum {
		return nil
	}

	confirmed, confirmErr := showWindowsConfirmDialog(
		fmt.Sprintf(
			"XMReader 依赖 Microsoft WebView2 Runtime 才能渲染 Markdown。\n\n当前检测结果：%s\n最小要求版本：%s\n\n是否立即自动下载安装？\n\n日志文件：%s",
			renderWebView2Status(status, err),
			webView2MinimumVersion,
			logPath,
		),
		"XMReader 依赖检查",
	)
	if confirmErr != nil {
		log.Printf("[XMReader] 显示 WebView2 安装确认框失败: %v\n", confirmErr)
	}
	if !confirmed {
		_ = showWindowsInfoDialog(
			fmt.Sprintf(
				"已取消自动安装。你可以稍后手动安装 WebView2 Runtime 后再启动 XMReader。\n\n官方下载页面：%s\n日志文件：%s",
				webView2DownloadPageURL,
				logPath,
			),
			"XMReader 依赖缺失",
		)
		return errors.New("webview2 runtime not installed")
	}

	log.Printf("[XMReader] 开始自动安装 WebView2 Runtime\n")
	if err := installWebView2Runtime(); err != nil {
		log.Printf("[XMReader] 自动安装 WebView2 Runtime 失败: %v\n", err)
		_ = openExternalURL(webView2DownloadPageURL)
		_ = showWindowsErrorDialog(
			fmt.Sprintf(
				"自动安装 WebView2 Runtime 失败：%v\n\n已尝试打开官方下载页面，请手动安装后重试。\n日志文件：%s",
				err,
				logPath,
			),
			"XMReader 依赖安装失败",
		)
		return err
	}

	after, err := detectWebView2Runtime()
	if err != nil {
		log.Printf("[XMReader] 安装后再次检测 WebView2 Runtime 失败: %v\n", err)
	}
	log.Printf(
		"[XMReader] WebView2 runtime after install detected=%q registry=%q scope=%q meetsMinimum=%t\n",
		after.DetectedVersion,
		after.RegistryVersion,
		after.RegistryScope,
		after.MeetsMinimum,
	)
	if !after.MeetsMinimum {
		_ = openExternalURL(webView2DownloadPageURL)
		_ = showWindowsErrorDialog(
			fmt.Sprintf(
				"WebView2 Runtime 安装完成后仍未通过校验。\n\n当前检测结果：%s\n请手动检查系统安装状态。\n日志文件：%s",
				renderWebView2Status(after, err),
				logPath,
			),
			"XMReader 依赖校验失败",
		)
		return errors.New("webview2 runtime validation failed after install")
	}

	log.Printf("[XMReader] WebView2 Runtime 自动安装成功，版本=%s\n", after.DetectedVersion)
	return nil
}

func validateWindowsBuild(logPath string) error {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		log.Printf("[XMReader] 无法读取构建信息，跳过构建标签校验\n")
		return nil
	}

	tags := splitBuildTags(buildSetting(info, "-tags"))
	if tags["dev"] {
		return nil
	}

	if tags["desktop"] && tags["production"] {
		return nil
	}

	message := fmt.Sprintf(
		"当前 XMReader 二进制缺少 Wails 桌面正式构建标签，可能出现白屏或运行异常。\n\n建议重新使用 `build.bat` 或 `wails build` 生成正式产物。\n\n检测到的构建标签：%s\n日志文件：%s",
		buildSetting(info, "-tags"),
		logPath,
	)
	log.Printf("[XMReader] 非正式 Wails 构建：%s\n", message)
	_ = showWindowsErrorDialog(message, "XMReader 构建异常")
	return errors.New("invalid wails build tags")
}

func logWindowsBuildInfo() {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		log.Printf("[XMReader] build info unavailable\n")
		return
	}

	log.Printf("[XMReader] build tags=%q GOOS=%q GOARCH=%q CGO_ENABLED=%q\n",
		buildSetting(info, "-tags"),
		buildSetting(info, "GOOS"),
		buildSetting(info, "GOARCH"),
		buildSetting(info, "CGO_ENABLED"),
	)
}

func buildSetting(info *debug.BuildInfo, key string) string {
	for _, setting := range info.Settings {
		if setting.Key == key {
			return setting.Value
		}
	}
	return ""
}

func splitBuildTags(raw string) map[string]bool {
	tags := make(map[string]bool)
	for _, part := range strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ' ' || r == '\t' || r == '\n'
	}) {
		if part != "" {
			tags[part] = true
		}
	}
	return tags
}

func detectWebView2Runtime() (webView2RuntimeStatus, error) {
	status := webView2RuntimeStatus{}
	version, err := webviewloader.GetAvailableCoreWebView2BrowserVersionString("")
	if err != nil {
		return status, err
	}

	status.DetectedVersion = version
	status.RegistryVersion, status.RegistryScope = queryWebView2RuntimeRegistry()

	if version == "" {
		return status, nil
	}

	compareResult, err := webviewloader.CompareBrowserVersions(version, webView2MinimumVersion)
	if err != nil {
		return status, err
	}
	status.MeetsMinimum = compareResult >= 0
	return status, nil
}

func queryWebView2RuntimeRegistry() (string, string) {
	if value, err := readRegistryString(registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\`+webView2ClientGUID, "pv"); err == nil && value != "" {
		return value, "machine"
	}
	if value, err := readRegistryString(registry.CURRENT_USER, `Software\Microsoft\EdgeUpdate\Clients\`+webView2ClientGUID, "pv"); err == nil && value != "" {
		return value, "user"
	}
	return "", ""
}

func readRegistryString(root registry.Key, path string, name string) (string, error) {
	key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
	if err != nil {
		return "", err
	}
	defer key.Close()

	value, _, err := key.GetStringValue(name)
	if err != nil {
		return "", err
	}
	return value, nil
}

func installWebView2Runtime() error {
	installerPath, err := downloadWebView2Bootstrapper()
	if err != nil {
		return err
	}
	defer os.Remove(installerPath)

	command := exec.Command(installerPath, "/silent", "/install")
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf("run installer failed: %w, output=%s", err, strings.TrimSpace(string(output)))
	}

	time.Sleep(2 * time.Second)
	return nil
}

func downloadWebView2Bootstrapper() (string, error) {
	httpClient := &http.Client{Timeout: 2 * time.Minute}
	response, err := httpClient.Get(webView2BootstrapperURL)
	if err != nil {
		return "", fmt.Errorf("download bootstrapper failed: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("download bootstrapper failed: status %s", response.Status)
	}

	tempFile, err := os.CreateTemp("", "xmreader-webview2-*.exe")
	if err != nil {
		return "", fmt.Errorf("create temp bootstrapper failed: %w", err)
	}
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, response.Body); err != nil {
		return "", fmt.Errorf("save bootstrapper failed: %w", err)
	}

	return filepath.Abs(tempFile.Name())
}

func renderWebView2Status(status webView2RuntimeStatus, detectErr error) string {
	switch {
	case detectErr != nil:
		return detectErr.Error()
	case status.DetectedVersion != "":
		return fmt.Sprintf("已检测到版本 %s（注册表: %s/%s）", status.DetectedVersion, fallbackText(status.RegistryScope, "unknown"), fallbackText(status.RegistryVersion, "unknown"))
	case status.RegistryVersion != "":
		return fmt.Sprintf("注册表显示版本 %s（%s），但运行时 API 未返回可用版本", status.RegistryVersion, fallbackText(status.RegistryScope, "unknown"))
	default:
		return "未检测到可用的 WebView2 Runtime"
	}
}

func fallbackText(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func showWindowsConfirmDialog(message string, title string) (bool, error) {
	result, err := windowsMessageBox(message, title, messageBoxYesNo|messageBoxIconQuestion|messageBoxDefaultButton2)
	return result == messageBoxResultYes, err
}

func showWindowsErrorDialog(message string, title string) error {
	_, err := windowsMessageBox(message, title, messageBoxOK|messageBoxIconError)
	return err
}

func showWindowsInfoDialog(message string, title string) error {
	_, err := windowsMessageBox(message, title, messageBoxOK|messageBoxIconInfo)
	return err
}

func windowsMessageBox(message string, title string, flags uint) (int, error) {
	user32 := syscall.NewLazyDLL("user32.dll")
	messageBox := user32.NewProc("MessageBoxW")

	messagePtr, err := syscall.UTF16PtrFromString(message)
	if err != nil {
		return -1, err
	}
	titlePtr, err := syscall.UTF16PtrFromString(title)
	if err != nil {
		return -1, err
	}

	result, _, callErr := messageBox.Call(
		uintptr(0),
		uintptr(unsafe.Pointer(messagePtr)),
		uintptr(unsafe.Pointer(titlePtr)),
		uintptr(flags),
	)
	if result == 0 && callErr != syscall.Errno(0) {
		return 0, callErr
	}
	return int(result), nil
}

func openExternalURL(url string) error {
	command := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}

func LogWindowsRuntimeContext(logPath string, userDataPath string) {
	log.Printf("[XMReader] runtime context: GOOS=%s GOARCH=%s logPath=%s webviewUserDataPath=%s tempDir=%s\n",
		runtime.GOOS,
		runtime.GOARCH,
		logPath,
		userDataPath,
		os.TempDir(),
	)
}
