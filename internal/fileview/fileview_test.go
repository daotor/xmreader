package fileview

import (
	"strings"
	"testing"
)

func TestRenderMarkdownPassthrough(t *testing.T) {
	content, err := Render("README.md", "# title\n")
	if err != nil {
		t.Fatalf("Render returned unexpected error: %v", err)
	}

	if content != "# title\n" {
		t.Fatalf("expected markdown content unchanged, got %q", content)
	}
}

func TestRenderGoAsCodeFence(t *testing.T) {
	content, err := Render("main.go", "package main\n\nfunc main() {}\n")
	if err != nil {
		t.Fatalf("Render returned unexpected error: %v", err)
	}

	expectedPrefix := "```go\n"
	if !strings.HasPrefix(content, expectedPrefix) {
		t.Fatalf("expected prefix %q, got %q", expectedPrefix, content)
	}

	if !strings.HasSuffix(content, "```") {
		t.Fatalf("expected content to end with closing fence, got %q", content)
	}
}

func TestRenderAdditionalLanguageMappings(t *testing.T) {
	tests := []struct {
		path           string
		expectedPrefix string
	}{
		{path: "script.py", expectedPrefix: "```python\n"},
		{path: "index.js", expectedPrefix: "```javascript\n"},
		{path: "component.tsx", expectedPrefix: "```tsx\n"},
		{path: "config.json", expectedPrefix: "```json\n"},
		{path: "docker-compose.yaml", expectedPrefix: "```yaml\n"},
		{path: "build.bat", expectedPrefix: "```bat\n"},
		{path: "run.cmd", expectedPrefix: "```bat\n"},
		{path: "build.ps1", expectedPrefix: "```powershell\n"},
		{path: "module.psm1", expectedPrefix: "```powershell\n"},
		{path: "manifest.psd1", expectedPrefix: "```powershell\n"},
		{path: "main.rs", expectedPrefix: "```rust\n"},
		{path: "Dockerfile", expectedPrefix: "```dockerfile\n"},
		{path: "Makefile", expectedPrefix: "```makefile\n"},
		{path: ".gitignore", expectedPrefix: "```gitignore\n"},
		{path: ".env", expectedPrefix: "```dotenv\n"},
	}

	for _, test := range tests {
		test := test
		t.Run(test.path, func(t *testing.T) {
			content, err := Render(test.path, "sample\n")
			if err != nil {
				t.Fatalf("Render returned unexpected error: %v", err)
			}

			if !strings.HasPrefix(content, test.expectedPrefix) {
				t.Fatalf("expected prefix %q, got %q", test.expectedPrefix, content)
			}
		})
	}
}

func TestRenderVueAsStructuredMarkdown(t *testing.T) {
	raw := `<template>
  <div class="app">Hello</div>
</template>

<script setup lang="ts">
const title = 'hello'
</script>

<style scoped lang="scss">
.app { color: red; }
</style>
`

	content, err := Render("App.vue", raw)
	if err != nil {
		t.Fatalf("Render returned unexpected error: %v", err)
	}

	expectedSnippets := []string{
		"## template",
		"```html\n<template>",
		"## script",
		"```ts\n<script setup lang=\"ts\">",
		"## style",
		"```scss\n<style scoped lang=\"scss\">",
	}

	for _, snippet := range expectedSnippets {
		if !strings.Contains(content, snippet) {
			t.Fatalf("expected structured content to contain %q, got %q", snippet, content)
		}
	}
}

func TestRenderVueFallsBackToSingleCodeFence(t *testing.T) {
	content, err := Render("snippet.vue", "<div>hello</div>")
	if err != nil {
		t.Fatalf("Render returned unexpected error: %v", err)
	}

	if !strings.HasPrefix(content, "```vue\n") {
		t.Fatalf("expected vue fallback fence, got %q", content)
	}
}

func TestRenderUsesLongerFenceWhenNeeded(t *testing.T) {
	raw := "package main\nvar s = \"```\"\n"
	content, err := Render("main.go", raw)
	if err != nil {
		t.Fatalf("Render returned unexpected error: %v", err)
	}

	if !strings.HasPrefix(content, "````go\n") {
		t.Fatalf("expected 4-backtick fence, got %q", content)
	}

	if !strings.HasSuffix(content, "````") {
		t.Fatalf("expected 4-backtick closing fence, got %q", content)
	}
}

func TestRenderUnsupportedFileType(t *testing.T) {
	_, err := Render("notes.txt", "hello")
	if err == nil {
		t.Fatal("expected unsupported file type error")
	}

	if !strings.Contains(err.Error(), "暂不支持打开此类型文件") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

func TestSupports(t *testing.T) {
	if !Supports("main.go") {
		t.Fatal("expected .go to be supported")
	}

	if !Supports("script.py") {
		t.Fatal("expected .py to be supported")
	}

	if !Supports("build.bat") {
		t.Fatal("expected .bat to be supported")
	}

	if !Supports("run.cmd") {
		t.Fatal("expected .cmd to be supported")
	}

	if !Supports("build.ps1") {
		t.Fatal("expected .ps1 to be supported")
	}

	if Supports("archive.zip") {
		t.Fatal("expected .zip to be unsupported")
	}
}
