package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/google/uuid"
	"github.com/spf13/pflag"
)

//go:embed client/build
var web embed.FS

var Version = "development"

func usage() {
	msg := `
chat: :version
example: chat --addr :8080
`
	fmt.Print(strings.ReplaceAll(msg, ":version", Version))
	pflag.PrintDefaults()
}

func main() {
	pflag.CommandLine.SortFlags = false
	pflag.Usage = usage
	var addr string
	pflag.StringVar(&addr, "addr", ":8080", "IP address and port to listen on")
	pflag.Parse()

	// web
	webFs := http.FileServer(getFileSystem())
	http.Handle("/", webFs)

	// ws
	hub := newHub()
	go hub.run()
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// upload
	http.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		var rsp Response
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.WriteHeader(http.StatusOK)
		if r.Method == "OPTIONS" {
			return
		}

		filename, err := uploadFile(r)
		if err != nil {
			log.Printf("error uploading: %v", err)
			rsp = Response{Success: false, Error: fmt.Sprintf("%v", err)}
		} else {
			rsp = Response{Success: true, Error: ""}
		}
		_ = json.NewEncoder(w).Encode(rsp)

		id := r.URL.Query().Get("id")
		msg := Msg{Id: uuid.New().String(), Type: "link", From: id, Data: fmt.Sprintf("/files/%s", filename)}
		b, err := json.Marshal(msg)
		if err == nil {
			hub.broadcast <- b
		}
	})

	// files
	filesFs := http.FileServer(http.Dir(tempDir))
	http.Handle("/files/", http.StripPrefix("/files/", filesFs))

	// cleanup
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		err := os.RemoveAll(tempDir)
		if err != nil {
			log.Print(err)
		}
		os.Exit(0)
	}()

	fmt.Printf("Server started on %s ...\n", addr)
	err := http.ListenAndServe(addr, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func getFileSystem() http.FileSystem {
	c, err := fs.Sub(web, "client/build")
	if err != nil {
		log.Fatal(err)
	}
	return http.FS(c)
}

func Ternary(condition bool, trueReturn string, falseReturn string) string {
	if condition {
		return trueReturn
	} else {
		return falseReturn
	}
}
