package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPrepareBuildAssetsCopiesCanonicalIcon(t *testing.T) {
	projectRoot := t.TempDir()
	sourceIcon := filepath.Join(projectRoot, "assets", "appicon.png")
	destinationIcon := filepath.Join(projectRoot, "build", "appicon.png")
	want := []byte("custom-app-icon")

	if err := os.MkdirAll(filepath.Dir(sourceIcon), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(sourceIcon, want, 0o644); err != nil {
		t.Fatal(err)
	}

	if err := prepareBuildAssets(projectRoot); err != nil {
		t.Fatalf("prepareBuildAssets() error = %v", err)
	}

	got, err := os.ReadFile(destinationIcon)
	if err != nil {
		t.Fatalf("read destination icon: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("destination icon = %q, want %q", got, want)
	}
}

func TestPrepareBuildAssetsRemovesGeneratedWindowsIcons(t *testing.T) {
	projectRoot := t.TempDir()
	sourceIcon := filepath.Join(projectRoot, "assets", "appicon.png")
	generatedIcons := []string{
		filepath.Join(projectRoot, "build", "windows", "icon.ico"),
		filepath.Join(projectRoot, "build", "windows", "appicon.ico"),
	}

	if err := os.MkdirAll(filepath.Dir(sourceIcon), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(sourceIcon, []byte("custom-app-icon"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(generatedIcons[0]), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, iconPath := range generatedIcons {
		if err := os.WriteFile(iconPath, []byte("stale-wails-icon"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	if err := prepareBuildAssets(projectRoot); err != nil {
		t.Fatalf("prepareBuildAssets() error = %v", err)
	}

	for _, iconPath := range generatedIcons {
		if _, err := os.Stat(iconPath); !os.IsNotExist(err) {
			t.Fatalf("generated icon %q still exists, stat error = %v", iconPath, err)
		}
	}
}

func TestRunReportsPreparedIcon(t *testing.T) {
	projectRoot := t.TempDir()
	sourceIcon := filepath.Join(projectRoot, "assets", "appicon.png")
	if err := os.MkdirAll(filepath.Dir(sourceIcon), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(sourceIcon, []byte("custom-app-icon"), 0o644); err != nil {
		t.Fatal(err)
	}

	var output bytes.Buffer
	if err := run(projectRoot, &output); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	if !strings.Contains(output.String(), "assets/appicon.png -> build/appicon.png") {
		t.Fatalf("run() output = %q", output.String())
	}
}

func TestBuildEntrypointsPrepareAssetsBeforeWails(t *testing.T) {
	projectRoot := filepath.Clean(filepath.Join("..", ".."))
	testCases := []struct {
		name       string
		path       string
		wailsBuild string
	}{
		{name: "Windows executable", path: "build.bat", wailsBuild: `"%WAILS%" build`},
		{name: "Windows installer", path: "build-installer.bat", wailsBuild: `"%WAILS%" build`},
		{name: "macOS", path: "build-macos.sh", wailsBuild: "wails build"},
		{name: "Ubuntu", path: "build-ubuntu.sh", wailsBuild: "wails build"},
		{name: "GitHub Actions Windows", path: filepath.Join(".github", "workflows", "release.yml"), wailsBuild: "wails build -clean -o xmreader.exe"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			content, err := os.ReadFile(filepath.Join(projectRoot, testCase.path))
			if err != nil {
				t.Fatal(err)
			}
			prepareIndex := bytes.Index(content, []byte("go run ./scripts/buildassets"))
			buildIndex := bytes.Index(content, []byte(testCase.wailsBuild))
			if prepareIndex < 0 {
				t.Fatalf("%s does not prepare Wails build assets", testCase.path)
			}
			if buildIndex < 0 {
				t.Fatalf("%s does not contain %q", testCase.path, testCase.wailsBuild)
			}
			if prepareIndex > buildIndex {
				t.Fatalf("%s prepares assets after Wails build", testCase.path)
			}
		})
	}
}
