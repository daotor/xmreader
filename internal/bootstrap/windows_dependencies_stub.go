//go:build !windows

package bootstrap

func EnsureWindowsDependencies(string) error {
	return nil
}

func LogWindowsRuntimeContext(string, string) {}
