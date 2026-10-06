package domain

import "fmt"

type ValidationError struct {
	Field   string
	Message string
}

func (v ValidationError) Error() string {
	return v.Field + ": " + v.Message
}

func ErrNameTooLong(max int) *ValidationError {
	return &ValidationError{Field: "name", Message: fmt.Sprintf("max %d bytes", max)}
}

func ErrInvalidID(id string) *ValidationError {
	return &ValidationError{Field: "id", Message: id + " is not a valid UUID"}
}

func ErrInvalidToken() *ValidationError {
	return &ValidationError{Field: "ownedToken", Message: "ownerToken cannot be empty"}
}

func ErrEmptyName() *ValidationError {
	return &ValidationError{Field: "name", Message: "name cannot be empty"}
}

func ErrInvalidAngle() *ValidationError {
	return &ValidationError{Field: "angle", Message: "angle must be in range [0;360)"}
}

func ErrInvalidTextColor() *ValidationError {
	return &ValidationError{Field: "textColor", Message: "textColor must be a valid hex number starting with '#'"}
}

func ErrInvalidColorsValues() *ValidationError {
	return &ValidationError{Field: "colors", Message: "all colors must be a valid hex number starting with '#'"}
}

func ErrInvalidNumberOfColors() *ValidationError {
	return &ValidationError{Field: "colors", Message: "there must be at least one color and a maximum of three"}
}
