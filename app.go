package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx       context.Context
	FilePaths []string
	files     []FileInfo // cached file data
}

// NewApp creates a new App application struct
func NewApp(filePaths []string) *App {
	a := &App{
		FilePaths: filePaths,
	}
	// Read files eagerly so we don't need to read them per-request
	for _, path := range filePaths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		base := filepath.Base(path)
		title := strings.TrimSuffix(base, filepath.Ext(base))
		a.files = append(a.files, FileInfo{
			Path:    path,
			Title:   title,
			Content: string(data),
		})
	}
	return a
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetFiles is called by the frontend after it's ready
func (a *App) GetFiles() []FileInfo {
	return a.files
}

// GetFilePaths returns the list of file paths passed via command line
func (a *App) GetFilePaths() []string {
	return a.FilePaths
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
	if a.ctx != nil && len(a.files) > 0 {
		runtime.EventsEmit(a.ctx, "file-data", a.files)
	}
}

// FileInfo represents a loaded markdown file
type FileInfo struct {
	Path    string `json:"path"`
	Title   string `json:"title"`
	Content string `json:"content"`
}
