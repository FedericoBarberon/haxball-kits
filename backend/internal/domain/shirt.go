package domain

import (
	"crypto/subtle"
	"fmt"
	"slices"
	"strings"
	"time"
	"uuid"
)

type Shirt struct {
	ID             string
	Name           string
	Angle          int
	TextColor      string
	Colors         []string
	CreatedAt      time.Time
	OwnerTokenHash string
}

type NewShirtInput struct {
	ID        string
	Name      string
	Angle     int
	TextColor string
	Colors    []string
}

const maxNameLength = 24

type ValidationError struct {
	Field   string
	Message string
}

func (v ValidationError) Error() string {
	return v.Field + ": " + v.Message
}

func errNameTooLong(max int) *ValidationError {
	return &ValidationError{Field: "name", Message: fmt.Sprintf("max %d bytes", max)}
}

func errInvalidID(id string) *ValidationError {
	return &ValidationError{Field: "id", Message: id + " is not a valid UUID"}
}

func errInvalidToken() *ValidationError {
	return &ValidationError{Field: "ownedToken", Message: "ownerToken cannot be empty"}
}

func errEmptyName() *ValidationError {
	return &ValidationError{Field: "name", Message: "name cannot be empty"}
}

func errInvalidAngle() *ValidationError {
	return &ValidationError{Field: "angle", Message: "angle must be in range [0;360)"}
}

func errInvalidTextColor() *ValidationError {
	return &ValidationError{Field: "textColor", Message: "textColor must be a valid hex number starting with '#'"}
}

func errInvalidColorsValues() *ValidationError {
	return &ValidationError{Field: "colors", Message: "all colors must be a valid hex number starting with '#'"}
}

func errInvalidNumberOfColors() *ValidationError {
	return &ValidationError{Field: "colors", Message: "there must be at least one color and a maximum of three"}
}

func NewShirt(in NewShirtInput, createdAt time.Time, ownerTokenHash string) (Shirt, error) {
	shirt := Shirt{
		ID:             in.ID,
		Name:           in.Name,
		Angle:          in.Angle,
		TextColor:      in.TextColor,
		Colors:         slices.Clone(in.Colors),
		CreatedAt:      createdAt,
		OwnerTokenHash: ownerTokenHash,
	}

	if err := validateShirt(shirt); err != nil {
		return Shirt{}, err
	}

	normalizeShirt(&shirt)

	return shirt, nil
}

func (s Shirt) OwnedBy(token string) bool {
	return subtle.ConstantTimeCompare([]byte(s.OwnerTokenHash), []byte(token)) == 1
}

func normalizeShirt(shirt *Shirt) {
	shirt.TextColor = strings.ToLower(shirt.TextColor)

	for i := range shirt.Colors {
		shirt.Colors[i] = strings.ToLower(shirt.Colors[i])
	}
}

func validateShirt(shirt Shirt) *ValidationError {
	if len(shirt.Name) == 0 {
		return errEmptyName()
	}

	if len(shirt.Name) > maxNameLength {
		return errNameTooLong(maxNameLength)
	}

	if a := shirt.Angle; a < 0 || a >= 360 {
		return errInvalidAngle()
	}

	if !isValidHex(shirt.TextColor) {
		return errInvalidTextColor()
	}

	if l := len(shirt.Colors); l < 1 || l > 3 {
		return errInvalidNumberOfColors()
	}

	for i := range shirt.Colors {
		if !isValidHex(shirt.Colors[i]) {
			return errInvalidColorsValues()
		}
	}

	if _, err := uuid.Parse(shirt.ID); err != nil {
		return errInvalidID(shirt.ID)
	}

	if len(shirt.OwnerTokenHash) == 0 {
		return errInvalidToken()
	}

	return nil
}

func isValidHex(s string) bool {
	if len(s) != 7 || s[0] != '#' {
		return false
	}

	for _, c := range s[1:] {
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F') {
			return false
		}
	}

	return true
}
