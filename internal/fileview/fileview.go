package fileview

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

type RenderMode string

const (
	RenderModeMarkdown  RenderMode = "markdown"
	RenderModeCodeFence RenderMode = "code_fence"
)

type Rule struct {
	Extensions []string
	FileNames  []string
	Mode       RenderMode
	Language   string
}

type UnsupportedFileTypeError struct {
	Path      string
	Extension string
}

func (e *UnsupportedFileTypeError) Error() string {
	ext := e.Extension
	if ext == "" {
		ext = "(no extension)"
	}
	return fmt.Sprintf("暂不支持打开此类型文件: %s", ext)
}

type Registry struct {
	rulesByExtension map[string]Rule
	rulesByFileName  map[string]Rule
}

var (
	ErrUnsupportedFileType = errors.New("unsupported file type")
	defaultRegistry        = NewRegistry(defaultRules())
)

func defaultRules() []Rule {
	return []Rule{
		{
			Extensions: []string{".md", ".mdc", ".markdown", ".mdown", ".mkd", ".mkdn"},
			Mode:       RenderModeMarkdown,
		},
		codeFenceRule("go", ".go"),
		codeFenceRule("python", ".py"),
		codeFenceRule("javascript", ".js", ".mjs", ".cjs"),
		codeFenceRule("jsx", ".jsx"),
		codeFenceRule("typescript", ".ts"),
		codeFenceRule("tsx", ".tsx"),
		codeFenceRule("java", ".java"),
		codeFenceRule("rust", ".rs"),
		codeFenceRule("c", ".c", ".h"),
		codeFenceRule("cpp", ".cc", ".cpp", ".cxx", ".hh", ".hpp", ".hxx"),
		codeFenceRule("csharp", ".cs"),
		codeFenceRule("kotlin", ".kt", ".kts"),
		codeFenceRule("swift", ".swift"),
		codeFenceRule("php", ".php"),
		codeFenceRule("ruby", ".rb"),
		codeFenceRule("bash", ".sh", ".bash", ".zsh"),
		codeFenceRule("powershell", ".ps1", ".psm1", ".psd1"),
		codeFenceRule("json", ".json"),
		codeFenceRule("yaml", ".yaml", ".yml"),
		codeFenceRule("toml", ".toml"),
		codeFenceRule("ini", ".ini", ".cfg", ".conf"),
		codeFenceRule("xml", ".xml", ".xsd", ".xsl", ".svg"),
		codeFenceRule("html", ".html", ".htm"),
		codeFenceRule("css", ".css"),
		codeFenceRule("scss", ".scss"),
		codeFenceRule("less", ".less"),
		codeFenceRule("sql", ".sql"),
		codeFenceFileNameRule("dockerfile", "Dockerfile"),
		codeFenceFileNameRule("makefile", "Makefile", "GNUmakefile"),
		codeFenceFileNameRule("gitignore", ".gitignore"),
		codeFenceFileNameRule("dotenv", ".env"),
	}
}

func codeFenceRule(language string, extensions ...string) Rule {
	return Rule{
		Extensions: extensions,
		Mode:       RenderModeCodeFence,
		Language:   language,
	}
}

func codeFenceFileNameRule(language string, fileNames ...string) Rule {
	return Rule{
		FileNames: fileNames,
		Mode:      RenderModeCodeFence,
		Language:  language,
	}
}

func NewRegistry(rules []Rule) *Registry {
	rulesByExtension := make(map[string]Rule, len(rules))
	rulesByFileName := make(map[string]Rule, len(rules))
	for _, rule := range rules {
		for _, ext := range rule.Extensions {
			normalizedExt := normalizeExtension(ext)
			if normalizedExt == "" {
				continue
			}
			rulesByExtension[normalizedExt] = rule
		}
		for _, fileName := range rule.FileNames {
			normalizedName := normalizeFileName(fileName)
			if normalizedName == "" {
				continue
			}
			rulesByFileName[normalizedName] = rule
		}
	}

	return &Registry{
		rulesByExtension: rulesByExtension,
		rulesByFileName:  rulesByFileName,
	}
}

func DefaultRegistry() *Registry {
	return defaultRegistry
}

func (r *Registry) Resolve(path string) (Rule, error) {
	normalizedName := normalizeFileName(filepath.Base(path))
	if rule, ok := r.rulesByFileName[normalizedName]; ok {
		return rule, nil
	}

	normalizedExt := normalizeExtension(filepath.Ext(path))
	rule, ok := r.rulesByExtension[normalizedExt]
	if ok {
		return rule, nil
	}
	return Rule{}, &UnsupportedFileTypeError{
		Path:      path,
		Extension: normalizedExt,
	}
}

func (r *Registry) Supports(path string) bool {
	_, err := r.Resolve(path)
	return err == nil
}

func (r *Registry) Render(path string, raw string) (string, error) {
	rule, err := r.Resolve(path)
	if err != nil {
		return "", err
	}

	switch rule.Mode {
	case RenderModeMarkdown:
		return raw, nil
	case RenderModeCodeFence:
		return wrapCodeFence(rule.Language, raw), nil
	default:
		return "", fmt.Errorf("unknown render mode: %s", rule.Mode)
	}
}

func Render(path string, raw string) (string, error) {
	return defaultRegistry.Render(path, raw)
}

func Supports(path string) bool {
	return defaultRegistry.Supports(path)
}

func normalizeExtension(ext string) string {
	normalized := strings.TrimSpace(strings.ToLower(ext))
	if normalized == "" {
		return ""
	}
	if strings.HasPrefix(normalized, ".") {
		return normalized
	}
	return "." + normalized
}

func normalizeFileName(name string) string {
	return strings.TrimSpace(strings.ToLower(name))
}

func wrapCodeFence(language string, raw string) string {
	fence := codeFenceDelimiter(raw)
	if strings.HasSuffix(raw, "\n") {
		return fmt.Sprintf("%s%s\n%s%s", fence, language, raw, fence)
	}
	return fmt.Sprintf("%s%s\n%s\n%s", fence, language, raw, fence)
}

func codeFenceDelimiter(raw string) string {
	maxBackticks := 0
	currentRun := 0
	for _, char := range raw {
		if char == '`' {
			currentRun++
			if currentRun > maxBackticks {
				maxBackticks = currentRun
			}
			continue
		}
		currentRun = 0
	}

	fenceLength := maxBackticks + 1
	if fenceLength < 3 {
		fenceLength = 3
	}
	return strings.Repeat("`", fenceLength)
}
