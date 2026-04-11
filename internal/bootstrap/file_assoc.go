package bootstrap

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func RegisterFileAssoc() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	exePath, err = filepath.Abs(exePath)
	if err != nil {
		return err
	}

	if runtime.GOOS == "windows" {
		return registerWindows(exePath)
	}
	return nil
}

func registerWindows(exePath string) error {
	cmds := [][]string{
		{"add", `HKCU\Software\Classes\.md`, "/ve", "/d", "xmreader.markdown", "/f"},
		{"add", `HKCU\Software\Classes\.mdc`, "/ve", "/d", "xmreader.markdown", "/f"},
		{"add", `HKCU\Software\Classes\xmreader.markdown`, "/ve", "/d", "Markdown Document", "/f"},
		{"add", `HKCU\Software\Classes\xmreader.markdown\DefaultIcon`, "/ve", "/d", exePath + ",0", "/f"},
		{"add", `HKCU\Software\Classes\xmreader.markdown\shell\open\command`, "/ve", "/d", `"` + exePath + `" "%1"`, "/f"},
		{"add", `HKCU\Software\Classes\.md\OpenWithProgids`, "/v", "xmreader.markdown", "/d", "", "/f"},
		{"add", `HKCU\Software\Classes\.mdc\OpenWithProgids`, "/v", "xmreader.markdown", "/d", "", "/f"},
	}

	for _, args := range cmds {
		cmd := exec.Command("reg", args...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return &registerError{Command: strings.Join(args, " "), Output: string(out), Err: err}
		}
	}

	return nil
}

type registerError struct {
	Command string
	Output  string
	Err     error
}

func (e *registerError) Error() string {
	if e == nil {
		return ""
	}
	return "reg " + e.Command + " failed: " + strings.TrimSpace(e.Output) + " err=" + e.Err.Error()
}
