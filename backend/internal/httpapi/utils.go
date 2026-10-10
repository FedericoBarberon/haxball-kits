package httpapi

import "net/http"

func setResponse(w http.ResponseWriter, status int, body []byte) {
	w.WriteHeader(status)
	w.Write(body)
}
