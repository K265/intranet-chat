package main

type Msg struct {
	Id   string `json:"id"`
	Type string `json:"type"`
	From string `json:"from"`
	Data string `json:"data"`
}

type Response struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
