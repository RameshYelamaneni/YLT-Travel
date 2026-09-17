// Package upload handles multipart file uploads to local disk (VPS now, S3
// later). Replaces the PHP base64 file upload/download endpoints with a
// proper Go multipart handler that streams to disk.
package upload

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Manager owns the storage root path and max upload size.
type Manager struct {
	RootPath  string
	MaxBytes int64
}

// NewManager builds a Manager and ensures the storage root exists.
func NewManager(rootPath string, maxBytes int64) (*Manager, error) {
	if rootPath == "" {
		return nil, errors.New("upload: root path is required")
	}
	if err := os.MkdirAll(rootPath, 0o755); err != nil {
		return nil, fmt.Errorf("upload: mkdir: %w", err)
	}
	return &Manager{RootPath: rootPath, MaxBytes: maxBytes}, nil
}

// SaveFile reads a multipart file header, validates size, and writes it to
// disk under a unique filename. Returns the stored filename + absolute path.
func (m *Manager) SaveFile(fh *multipart.FileHeader) (filename, absPath string, err error) {
	if fh.Size > m.MaxBytes {
		return "", "", fmt.Errorf("upload: file too large (%d > %d)", fh.Size, m.MaxBytes)
	}
	src, err := fh.Open()
	if err != nil {
		return "", "", fmt.Errorf("upload: open multipart: %w", err)
	}
	defer src.Close()

	// Unique filename: <uuid>_<original-name-sanitized>
	ext := filepath.Ext(fh.Filename)
	base := sanitize(filepath.Base(fh.Filename))
	storedName := fmt.Sprintf("%s_%s%s", uuid.NewString(), base, ext)
	abs := filepath.Join(m.RootPath, storedName)

	dst, err := os.Create(abs)
	if err != nil {
		return "", "", fmt.Errorf("upload: create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", "", fmt.Errorf("upload: write: %w", err)
	}
	return storedName, abs, nil
}

// FilePath returns the absolute path for a stored filename.
func (m *Manager) FilePath(filename string) string {
	return filepath.Join(m.RootPath, filename)
}

// Exists checks whether a stored file exists on disk.
func (m *Manager) Exists(filename string) bool {
	_, err := os.Stat(m.FilePath(filename))
	return err == nil
}

// Delete removes a stored file from disk.
func (m *Manager) Delete(filename string) error {
	return os.Remove(m.FilePath(filename))
}

// sanitize strips path separators and dangerous characters from a filename.
func sanitize(name string) string {
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.TrimSpace(name)
	if len(name) > 100 {
		name = name[:100]
	}
	return name
}

// TimestampedName prefixes a filename with a timestamp for uniqueness.
func TimestampedName(original string) string {
	ext := filepath.Ext(original)
	base := strings.TrimSuffix(original, ext)
	return fmt.Sprintf("%s_%d%s", base, time.Now().Unix(), ext)
}
