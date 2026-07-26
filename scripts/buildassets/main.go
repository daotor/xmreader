package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
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
	if err := prepareBuildAssets(projectRoot); err != nil {
		return err
	}
	_, err := fmt.Fprintln(output, "Prepared Wails app icon: assets/appicon.png -> build/appicon.png")
	return err
}

func prepareBuildAssets(projectRoot string) error {
	sourceIcon := filepath.Join(projectRoot, "assets", "appicon.png")
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
