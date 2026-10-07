package domain

import (
	"crypto/subtle"
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

const MAX_NAME_LENGTH = 24

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

func (s Shirt) Clone() Shirt {
	clone := s
	clone.Colors = slices.Clone(s.Colors)
	return clone
}

func validateShirt(shirt Shirt) *ValidationError {
	if len(shirt.Name) == 0 {
		return ErrEmptyName()
	}

	if len(shirt.Name) > MAX_NAME_LENGTH {
		return ErrNameTooLong(MAX_NAME_LENGTH)
	}

	if a := shirt.Angle; a < 0 || a >= 360 {
		return ErrInvalidAngle()
	}

	if !isValidHex(shirt.TextColor) {
		return ErrInvalidTextColor()
	}

	if l := len(shirt.Colors); l < 1 || l > 3 {
		return ErrInvalidNumberOfColors()
	}

	for i := range shirt.Colors {
		if !isValidHex(shirt.Colors[i]) {
			return ErrInvalidColorsValues()
		}
	}

	if _, err := uuid.Parse(shirt.ID); err != nil {
		return ErrInvalidID(shirt.ID)
	}

	if len(shirt.OwnerTokenHash) == 0 {
		return ErrInvalidToken()
	}

	return nil
}

func normalizeShirt(shirt *Shirt) {
	shirt.TextColor = strings.ToLower(shirt.TextColor)

	for i := range shirt.Colors {
		shirt.Colors[i] = strings.ToLower(shirt.Colors[i])
	}
}
