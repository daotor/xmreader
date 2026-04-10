package main

import (
	"encoding/base64"
	"net/http"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

const localFileAssetRoutePrefix = "/__kmread_local_file__/"

func localFileAssetMiddleware() assetserver.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, localFileAssetRoutePrefix) {
				serveLocalFileAsset(w, r)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func serveLocalFileAsset(w http.ResponseWriter, r *http.Request) {
	encodedPath := strings.TrimPrefix(r.URL.Path, localFileAssetRoutePrefix)
	if encodedPath == "" {
		http.NotFound(w, r)
		return
	}

	filePathBytes, err := base64.RawURLEncoding.DecodeString(encodedPath)
	if err != nil {
		http.Error(w, "invalid local file path", http.StatusBadRequest)
		return
	}

	filePath := string(filePathBytes)
	info, err := os.Stat(filePath)
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, filePath)
}
