package httpapi

import "encoding/json"

type apiError struct {
	Error string `json:"error"`
}

func newApiError(msg string) *apiError {
	return &apiError{msg}
}

func (e apiError) toJSON() []byte {
	jsonBytes, _ := json.Marshal(e)
	return jsonBytes
}
