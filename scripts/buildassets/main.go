package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	iconAppearanceEnv     = "XMREADER_ICON_APPEARANCE"
	defaultIconAppearance = "dark"
)

func main() {
	projectRoot, err := os.Getwd()
	if err != nil {
		log.Fatalf("resolve project root: %v", err)
	}
	if err := run(projectRoot, os.Stdout); err != nil {
		log.Fatal(err)
	}
}

func run(projectRoot string, output io.Writer) error {
	appearance, err := resolveIconAppearance(os.Getenv(iconAppearanceEnv))
	if err != nil {
		return err
	}
	if err := prepareBuildAssetsForPlatform(projectRoot, runtime.GOOS, appearance); err != nil {
		return err
	}
	_, err = fmt.Fprintf(output, "Prepared Wails %s app icon for %s -> build/appicon.png\n", appearance, runtime.GOOS)
	return err
}

func prepareBuildAssets(projectRoot string) error {
	appearance, err := resolveIconAppearance(os.Getenv(iconAppearanceEnv))
	if err != nil {
		return err
	}
	return prepareBuildAssetsForPlatform(projectRoot, runtime.GOOS, appearance)
}

func resolveIconAppearance(value string) (string, error) {
	appearance := strings.ToLower(strings.TrimSpace(value))
	if appearance == "" {
		return defaultIconAppearance, nil
	}
	if appearance != "light" && appearance != "dark" {
		return "", fmt.Errorf("invalid %s %q: want light or dark", iconAppearanceEnv, value)
	}
	return appearance, nil
}

func sourceIconPath(projectRoot, platform, appearance string) string {
	fileName := "appicon.png"
	if appearance == "dark" {
		fileName = "appicon-dark.png"
	}

	switch platform {
	case "windows":
		return filepath.Join(projectRoot, "assets", "icons", "windows", fileName)
	case "darwin":
		return filepath.Join(projectRoot, "assets", "icons", "macos", fileName)
	default:
		return filepath.Join(projectRoot, "assets", "appicon.png")
	}
}

func prepareBuildAssetsForPlatform(projectRoot, platform, appearance string) error {
	sourceIcon := sourceIconPath(projectRoot, platform, appearance)
	destinationIcon := filepath.Join(projectRoot, "build", "appicon.png")

	content, err := os.ReadFile(sourceIcon)
	if err != nil {
		return fmt.Errorf("read app icon: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(destinationIcon), 0o755); err != nil {
		return fmt.Errorf("create build directory: %w", err)
	}
	if err := os.WriteFile(destinationIcon, content, 0o644); err != nil {
		return fmt.Errorf("write Wails app icon: %w", err)
	}

	generatedIcons := []string{
		filepath.Join(projectRoot, "build", "windows", "icon.ico"),
		filepath.Join(projectRoot, "build", "windows", "appicon.ico"),
	}
	for _, iconPath := range generatedIcons {
		if err := os.Remove(iconPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove generated icon %q: %w", iconPath, err)
		}
	}

	return nil
}
