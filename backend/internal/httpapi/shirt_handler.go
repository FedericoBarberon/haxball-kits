package httpapi

import (
	"haxball-kits/internal/repository"
	"time"
)

type ShirtHandler struct {
	repo     repository.ShirtRepository
	now      func() time.Time
	newToken func() string
}

func NewShirtHandler(repo repository.ShirtRepository, now func() time.Time, newToken func() string) *ShirtHandler {
	return &ShirtHandler{repo, now, newToken}
}
