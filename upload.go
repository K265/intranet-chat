package main

import (
	"io"
	"net/http"
	"os"
	"path"
)

var tempDir = path.Join(os.TempDir(), "intranet-chat")

func uploadFile(r *http.Request) (string, error) {
	// Parse our multipart form, 10 << 20 specifies a maximum
	// upload of 10 MB files.
	r.ParseMultipartForm(10 << 20)
	// FormFile returns the first file for the given key `myFile`
	// it also returns the FileHeader so we can get the Filename,
	// the Header and the size of the file
	file, handler, err := r.FormFile("myFile")
	if err != nil {
		return "", err
	}
	defer file.Close()

	filename := handler.Filename
	// Create a temporary file within our temp-images directory that follows
	// a particular naming pattern

	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		err = os.Mkdir(tempDir, os.ModeDir)
		if err != nil {
			return "", err
		}
	}

	tempFile, err := os.Create(path.Join(tempDir, filename))
	if err != nil {
		return "", err
	}
	defer tempFile.Close()

	// Copy the uploaded file to the created file on the filesystem
	if _, err := io.Copy(tempFile, file); err != nil {
		return "", err
	}

	return filename, nil
}
