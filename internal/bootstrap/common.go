package bootstrap

import (
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const AppDisplayName = "XMReader"
const NewWindowFlag = "--new-window"
const RegisterFlag = "--register"

func HasArg(args []string, expected string) bool {
	for _, arg := range args {
		if arg == expected {
			return true
		}
	}
	return false
}

func resolveAppDataRoot(appName string) string {
	if cacheDir, err := os.UserCacheDir(); err == nil && cacheDir != "" {
		return filepath.Join(cacheDir, appName)
	}

	return filepath.Join(os.TempDir(), strings.ToLower(appName))
}

func ensureDirectory(path string) string {
	if err := os.MkdirAll(path, 0o755); err == nil {
		return path
	}
	return ""
}

func resolveLogFilePath(appName string) string {
	baseDir := resolveAppDataRoot(appName)
	logDir := filepath.Join(baseDir, "logs")
	if ensured := ensureDirectory(logDir); ensured != "" {
		return filepath.Join(ensured, "xmreader.log")
	}

	fallbackDir := filepath.Join(os.TempDir(), strings.ToLower(appName), "logs")
	if ensured := ensureDirectory(fallbackDir); ensured != "" {
		return filepath.Join(ensured, "xmreader.log")
	}

	return filepath.Join(os.TempDir(), "xmreader.log")
}

func ResolveWebviewUserDataPath(appName string) string {
	baseDir := resolveAppDataRoot(appName)
	userDataDir := filepath.Join(baseDir, "webview2")
	if ensured := ensureDirectory(userDataDir); ensured != "" {
		return ensured
	}

	fallbackDir := filepath.Join(os.TempDir(), strings.ToLower(appName), "webview2")
	if ensured := ensureDirectory(fallbackDir); ensured != "" {
		return ensured
	}

	return fallbackDir
}

func SetupStartupLogging(appName string) (string, func()) {
	logFilePath := resolveLogFilePath(appName)
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)
		log.Printf("[XMReader] 无法打开日志文件 %s: %v\n", logFilePath, err)
		return logFilePath, func() {}
	}

	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)
	log.SetOutput(io.MultiWriter(os.Stderr, logFile))
	log.Printf("[XMReader] ===== startup %s =====\n", time.Now().Format(time.RFC3339))
	log.Printf("[XMReader] startup log file: %s\n", logFilePath)

	return logFilePath, func() {
		log.Printf("[XMReader] ===== shutdown %s =====\n", time.Now().Format(time.RFC3339))
		_ = logFile.Close()
	}
}
