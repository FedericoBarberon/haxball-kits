package repository

import (
	"errors"
	"fmt"
	"haxball-kits/internal/domain"
)

type ShirtRepository interface {
	List(page, pageSize int) ([]domain.Shirt, error)
	Create(s domain.Shirt) error
	Total() (int, error)
	Get(id string) (domain.Shirt, error)
	Delete(id string) error
}

var (
	ErrNotFound      = errors.New("Shirt not found")
	ErrAlreadyExists = errors.New("Shirt already exists")
)

type UnknownError struct {
	Err error
}

func (u UnknownError) Error() string {
	return fmt.Sprintf("An unknown error happened: %s", u.Err)
}

func (u UnknownError) Unwrap() error {
	return u.Err
}
