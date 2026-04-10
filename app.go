package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const fileOpenedEvent = "kmread:file-opened"

// App struct
type App struct {
	ctx       context.Context
	mu        sync.RWMutex
	FilePaths []string
	files     []FileInfo // cached file data
}

// NewApp creates a new App application struct
func NewApp(filePaths []string) *App {
	a := &App{}

	for _, path := range filePaths {
		if _, _, err := a.registerOpenedFile(path); err != nil {
			log.Printf("[KMRead] 初始化文件失败: %s: %v\n", path, err)
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

	base := filepath.Base(path)
	title := strings.TrimSuffix(base, filepath.Ext(base))
	return FileInfo{
		Path:    path,
		Title:   title,
		Content: string(data),
	}, nil
}

func normalizeExistingFilePath(path string) (string, error) {
	absPath, err := filepath.Abs(path)
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

func (a *App) registerOpenedFile(path string) (FileInfo, bool, error) {
	normalizedPath, err := normalizeExistingFilePath(path)
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

func (a *App) handleMacFileOpen(path string) {
	fileInfo, _, err := a.registerOpenedFile(path)
	if err != nil {
		log.Printf("[KMRead] macOS 打开文件失败: %s: %v\n", path, err)
		return
	}

	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, fileOpenedEvent, fileInfo.Path)
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

// ReadFile reads a markdown file and returns its content
func (a *App) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("无法读取文件: %w", err)
	}
	return string(data), nil
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
