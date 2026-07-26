package ci

import (
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

func TestReleaseWorkflowUsesSupportedGoToolchain(t *testing.T) {
	workflow := readReleaseWorkflow(t)
	match := regexp.MustCompile(`(?m)^\s*GO_VERSION:\s*['"]?(\d+)\.(\d+)\.(\d+)['"]?\s*$`).FindStringSubmatch(workflow)
	if match == nil {
		t.Fatal("release workflow must pin GO_VERSION")
	}

	major, _ := strconv.Atoi(match[1])
	minor, _ := strconv.Atoi(match[2])
	patch, _ := strconv.Atoi(match[3])
	if major < 1 || major == 1 && (minor < 26 || minor == 26 && patch < 5) {
		t.Fatalf("GO_VERSION %s is unsupported; need Go 1.26.5 or newer", strings.Join(match[1:4], "."))
	}

	const setupReference = "go-version: ${{ env.GO_VERSION }}"
	if count := strings.Count(workflow, setupReference); count != 3 {
		t.Fatalf("release workflow must use GO_VERSION in all 3 setup-go steps; found %d", count)
	}
	if strings.Contains(workflow, "go-version-file: go.mod") {
		t.Fatal("release workflow must not install the unsupported Go version from go.mod")
	}
}

func TestReleaseWorkflowPinsMacOS26Runner(t *testing.T) {
	macOSJob := releaseJobBlock(t, readReleaseWorkflow(t), "build-macos")
	if !regexp.MustCompile(`(?m)^\s{4}runs-on: macos-26\s*$`).MatchString(macOSJob) {
		t.Fatal("release workflow must pin the macOS runner to macos-26")
	}
	if strings.Contains(macOSJob, "runs-on: macos-latest") {
		t.Fatal("release workflow must not use the moving macos-latest label")
	}
}

func TestMacOSWailsInstallRunsCLISmokeCheck(t *testing.T) {
	macOSJob := releaseJobBlock(t, readReleaseWorkflow(t), "build-macos")
	if !regexp.MustCompile(`(?m)^\s*wails_bin="\$\(go env GOPATH\)/bin/wails"\s*$`).MatchString(macOSJob) {
		t.Fatal("macOS Wails install step must resolve the installed CLI path")
	}
	if !regexp.MustCompile(`(?m)^\s*"\$wails_bin" version\s*$`).MatchString(macOSJob) {
		t.Fatal("macOS Wails install step must execute the installed CLI")
	}
}

func TestReleaseJobBlockAcceptsCRLF(t *testing.T) {
	workflow := "jobs:\r\n  build-macos:\r\n    runs-on: macos-26\r\n  build-linux:\r\n    runs-on: ubuntu-24.04\r\n"
	block := releaseJobBlock(t, workflow, "build-macos")
	if !strings.Contains(block, "runs-on: macos-26") {
		t.Fatalf("expected macOS job block, got %q", block)
	}
}

func releaseJobBlock(t *testing.T, workflow string, jobName string) string {
	t.Helper()
	workflow = strings.ReplaceAll(workflow, "\r\n", "\n")

	header := "  " + jobName + ":\n"
	start := strings.Index(workflow, header)
	if start < 0 {
		t.Fatalf("release workflow job %q not found", jobName)
	}

	block := workflow[start:]
	remainder := block[len(header):]
	nextJob := regexp.MustCompile(`(?m)^  [a-zA-Z0-9_-]+:\s*$`).FindStringIndex(remainder)
	if nextJob != nil {
		block = block[:len(header)+nextJob[0]]
	}
	return block
}

func readReleaseWorkflow(t *testing.T) string {
	t.Helper()

	path := filepath.Join("..", "..", ".github", "workflows", "release.yml")
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read release workflow: %v", err)
	}
	return string(contents)
}
