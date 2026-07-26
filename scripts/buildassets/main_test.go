package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeTestAsset(t *testing.T, projectRoot, relativePath string, content []byte) {
	t.Helper()

	assetPath := filepath.Join(projectRoot, filepath.FromSlash(relativePath))
	if err := os.MkdirAll(filepath.Dir(assetPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(assetPath, content, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestPrepareBuildAssetsSelectsPlatformIcon(t *testing.T) {
	testCases := []struct {
		platform   string
		appearance string
		want       []byte
	}{
		{platform: "windows", appearance: "dark", want: []byte("windows-dark-icon")},
		{platform: "windows", appearance: "light", want: []byte("windows-light-icon")},
		{platform: "darwin", appearance: "dark", want: []byte("macos-dark-icon")},
		{platform: "darwin", appearance: "light", want: []byte("macos-light-icon")},
		{platform: "linux", appearance: "dark", want: []byte("fallback-icon")},
	}

	for _, testCase := range testCases {
		t.Run(testCase.platform+"-"+testCase.appearance, func(t *testing.T) {
			projectRoot := t.TempDir()
			writeTestAsset(t, projectRoot, "assets/appicon.png", []byte("fallback-icon"))
			writeTestAsset(t, projectRoot, "assets/icons/windows/appicon.png", []byte("windows-light-icon"))
			writeTestAsset(t, projectRoot, "assets/icons/windows/appicon-dark.png", []byte("windows-dark-icon"))
			writeTestAsset(t, projectRoot, "assets/icons/macos/appicon.png", []byte("macos-light-icon"))
			writeTestAsset(t, projectRoot, "assets/icons/macos/appicon-dark.png", []byte("macos-dark-icon"))

			if err := prepareBuildAssetsForPlatform(projectRoot, testCase.platform, testCase.appearance); err != nil {
				t.Fatalf("prepareBuildAssetsForPlatform() error = %v", err)
			}

			got, err := os.ReadFile(filepath.Join(projectRoot, "build", "appicon.png"))
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(got, testCase.want) {
				t.Fatalf("build icon = %q, want %q", got, testCase.want)
			}
		})
	}
}

func TestResolveIconAppearance(t *testing.T) {
	testCases := []struct {
		name    string
		value   string
		want    string
		wantErr bool
	}{
		{name: "default", value: "", want: "dark"},
		{name: "dark", value: "dark", want: "dark"},
		{name: "light", value: "light", want: "light"},
		{name: "normalized", value: " LIGHT ", want: "light"},
		{name: "invalid", value: "system", wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := resolveIconAppearance(testCase.value)
			if testCase.wantErr {
				if err == nil {
					t.Fatalf("resolveIconAppearance(%q) error = nil", testCase.value)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveIconAppearance(%q) error = %v", testCase.value, err)
			}
			if got != testCase.want {
				t.Fatalf("resolveIconAppearance(%q) = %q, want %q", testCase.value, got, testCase.want)
			}
		})
	}
}

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

	if err := prepareBuildAssetsForPlatform(projectRoot, "linux", "dark"); err != nil {
		t.Fatalf("prepareBuildAssetsForPlatform() error = %v", err)
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

	if err := prepareBuildAssetsForPlatform(projectRoot, "linux", "dark"); err != nil {
		t.Fatalf("prepareBuildAssetsForPlatform() error = %v", err)
	}

	for _, iconPath := range generatedIcons {
		if _, err := os.Stat(iconPath); !os.IsNotExist(err) {
			t.Fatalf("generated icon %q still exists, stat error = %v", iconPath, err)
		}
	}
}

func TestRunReportsPreparedIcon(t *testing.T) {
	projectRoot := t.TempDir()
	t.Setenv("XMREADER_ICON_APPEARANCE", "")
	writeTestAsset(t, projectRoot, "assets/appicon.png", []byte("fallback-icon"))
	writeTestAsset(t, projectRoot, "assets/icons/windows/appicon-dark.png", []byte("windows-dark-icon"))
	writeTestAsset(t, projectRoot, "assets/icons/macos/appicon-dark.png", []byte("macos-dark-icon"))

	var output bytes.Buffer
	if err := run(projectRoot, &output); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	if !strings.Contains(output.String(), "build/appicon.png") {
		t.Fatalf("run() output = %q", output.String())
	}
	if !strings.Contains(output.String(), "dark") {
		t.Fatalf("run() output does not report dark appearance: %q", output.String())
	}
}

func TestGitHubActionsDefaultsToDarkIcon(t *testing.T) {
	workflowPath := filepath.Clean(filepath.Join("..", "..", ".github", "workflows", "release.yml"))
	content, err := os.ReadFile(workflowPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(content, []byte("XMREADER_ICON_APPEARANCE: dark")) {
		t.Fatalf("%s does not default release builds to the dark icon", workflowPath)
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
