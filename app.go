package main

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"log"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/daotor/xmreader/internal/fileview"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const fileOpenedEvent = "xmreader:file-opened"
const primaryInstanceChannelID = "xmreader-main-window"

// App struct
type App struct {
	ctx       context.Context
	mu        sync.RWMutex
	FilePaths []string
	files     []FileInfo // cached file data
}

func primaryInstanceAddress() string {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(primaryInstanceChannelID))
	port := 41000 + int(hasher.Sum32()%10000)
	return fmt.Sprintf("127.0.0.1:%d", port)
}

func tryForwardToPrimaryInstance(args []string) (bool, error) {
	connection, err := net.DialTimeout("tcp", primaryInstanceAddress(), 300*time.Millisecond)
	if err != nil {
		return false, err
	}
	defer connection.Close()

	workingDirectory, err := os.Getwd()
	if err != nil {
		return false, err
	}

	payload := options.SecondInstanceData{
		Args:             args,
		WorkingDirectory: workingDirectory,
	}

	if err := json.NewEncoder(connection).Encode(payload); err != nil {
		return false, err
	}

	return true, nil
}

func startPrimaryInstanceServer(app *App) (net.Listener, error) {
	listener, err := net.Listen("tcp", primaryInstanceAddress())
	if err != nil {
		return nil, err
	}

	go func() {
		for {
			connection, err := listener.Accept()
			if err != nil {
				if errorsIsClosed(err) {
					return
				}
				log.Printf("[XMReader] 主窗口监听失败: %v\n", err)
				continue
			}

			go func(conn net.Conn) {
				defer conn.Close()

				var payload options.SecondInstanceData
				if err := json.NewDecoder(conn).Decode(&payload); err != nil {
					log.Printf("[XMReader] 解析第二实例消息失败: %v\n", err)
					return
				}

				app.handleSecondInstanceLaunch(payload)
			}(connection)
		}
	}()

	return listener, nil
}

func errorsIsClosed(err error) bool {
	return err != nil && strings.Contains(err.Error(), "closed network connection")
}

// NewApp creates a new App application struct
func NewApp(filePaths []string) *App {
	a := &App{}

	for _, path := range filePaths {
		if _, _, err := a.registerOpenedFile(path, ""); err != nil {
			log.Printf("[XMReader] 初始化文件失败: %s: %v\n", path, err)
		}
	}

	return a
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func createFileInfo(path string) (FileInfo, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return FileInfo{}, fmt.Errorf("无法读取文件: %w", err)
	}

	content, err := fileview.Render(path, string(data))
	if err != nil {
		return FileInfo{}, err
	}

	base := filepath.Base(path)
	title := strings.TrimSuffix(base, filepath.Ext(base))
	return FileInfo{
		Path:    path,
		Title:   title,
		Content: content,
	}, nil
}

func normalizeExistingFilePath(path string, workingDirectory string) (string, error) {
	candidatePath := path
	if !filepath.IsAbs(candidatePath) && workingDirectory != "" {
		candidatePath = filepath.Join(workingDirectory, candidatePath)
	}

	absPath, err := filepath.Abs(candidatePath)
	if err != nil {
		return "", err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("不是文件: %s", absPath)
	}

	return absPath, nil
}

func (a *App) registerOpenedFile(path string, workingDirectory string) (FileInfo, bool, error) {
	normalizedPath, err := normalizeExistingFilePath(path, workingDirectory)
	if err != nil {
		return FileInfo{}, false, err
	}

	fileInfo, err := createFileInfo(normalizedPath)
	if err != nil {
		return FileInfo{}, false, err
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	for index, existing := range a.files {
		if existing.Path == normalizedPath {
			a.files[index] = fileInfo
			return fileInfo, false, nil
		}
	}

	a.files = append(a.files, fileInfo)
	a.FilePaths = append(a.FilePaths, normalizedPath)
	return fileInfo, true, nil
}

func collectExistingFilePaths(args []string, workingDirectory string) []string {
	uniquePaths := make(map[string]struct{})
	result := make([]string, 0, len(args))

	for _, arg := range args {
		if strings.HasPrefix(arg, "-") {
			continue
		}

		normalizedPath, err := normalizeExistingFilePath(arg, workingDirectory)
		if err != nil {
			continue
		}

		if _, exists := uniquePaths[normalizedPath]; exists {
			continue
		}

		uniquePaths[normalizedPath] = struct{}{}
		result = append(result, normalizedPath)
	}

	return result
}

func (a *App) focusWindow() {
	if a.ctx != nil {
		runtime.WindowShow(a.ctx)
		runtime.WindowUnminimise(a.ctx)
	}
}

func (a *App) emitOpenedFiles(paths []string) {
	if a.ctx != nil && len(paths) > 0 {
		runtime.EventsEmit(a.ctx, fileOpenedEvent, paths)
	}
}

func (a *App) appendFiles(paths []string, workingDirectory string, source string) {
	openedPaths := make([]string, 0, len(paths))

	for _, path := range paths {
		fileInfo, _, err := a.registerOpenedFile(path, workingDirectory)
		if err != nil {
			log.Printf("[XMReader] %s 打开文件失败: %s: %v\n", source, path, err)
			continue
		}
		openedPaths = append(openedPaths, fileInfo.Path)
	}

	a.focusWindow()
	a.emitOpenedFiles(openedPaths)
}

func (a *App) handleMacFileOpen(path string) {
	a.appendFiles([]string{path}, "", "macOS")
}

func (a *App) handleSecondInstanceLaunch(secondInstanceData options.SecondInstanceData) {
	paths := collectExistingFilePaths(secondInstanceData.Args, secondInstanceData.WorkingDirectory)
	a.appendFiles(paths, secondInstanceData.WorkingDirectory, "第二实例")
}

func (a *App) HasFiles() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return len(a.files) > 0
}

func (a *App) ResetFiles(paths []string, workingDirectory string) {
	a.mu.Lock()
	a.files = nil
	a.FilePaths = nil
	a.mu.Unlock()

	for _, path := range paths {
		if _, _, err := a.registerOpenedFile(path, workingDirectory); err != nil {
			log.Printf("[XMReader] 重置文件失败: %s: %v\n", path, err)
		}
	}
}

// GetFiles is called by the frontend after it's ready
func (a *App) GetFiles() []FileInfo {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make([]FileInfo, len(a.files))
	copy(result, a.files)
	return result
}

// GetFilePaths returns the list of file paths passed via command line
func (a *App) GetFilePaths() []string {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make([]string, len(a.FilePaths))
	copy(result, a.FilePaths)
	return result
}

// ReadFile reads a supported document file and returns renderable markdown content
func (a *App) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("无法读取文件: %w", err)
	}
	return fileview.Render(path, string(data))
}

// GetFileTitle returns a clean title from a file path
func (a *App) GetFileTitle(path string) string {
	base := filepath.Base(path)
	return strings.TrimSuffix(base, filepath.Ext(base))
}

// EmitFiles sends file data to frontend via event
func (a *App) EmitFiles() {
	a.mu.RLock()
	files := make([]FileInfo, len(a.files))
	copy(files, a.files)
	a.mu.RUnlock()

	if a.ctx != nil && len(files) > 0 {
		runtime.EventsEmit(a.ctx, "file-data", files)
	}
}

// FileInfo represents a loaded markdown file
type FileInfo struct {
	Path    string `json:"path"`
	Title   string `json:"title"`
	Content string `json:"content"`
}
