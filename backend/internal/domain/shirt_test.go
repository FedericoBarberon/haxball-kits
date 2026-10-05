package domain

import (
	"errors"
	"strings"
	"testing"
	"time"
)

const (
	validID    = "550e8400-e29b-41d4-a716-446655440000"
	ownerToken = "owner-token"
)

func validShirtInput() NewShirtInput {
	return NewShirtInput{
		ID:        validID,
		Name:      "Classic",
		Angle:     180,
		TextColor: "#ABCDEF",
		Colors:    []string{"#123456", "#FEDCBA"},
	}
}

func newTestShirt(t *testing.T, input NewShirtInput) Shirt {
	t.Helper()

	shirt, err := NewShirt(input, time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC), ownerToken)
	if err != nil {
		t.Fatalf("NewShirt() unexpected error: %v", err)
	}

	return shirt
}

func assertValidationError(t *testing.T, err error, field string) {
	t.Helper()

	if err == nil {
		t.Fatal("NewShirt() expected validation error, got nil")
	}

	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("NewShirt() error = %T, want *ValidationError", err)
	}
	if validationErr.Field != field {
		t.Errorf("ValidationError.Field = %q, want %q", validationErr.Field, field)
	}
}

func TestNewShirt_ValidatesID(t *testing.T) {
	tests := []struct {
		name  string
		id    string
		valid bool
	}{
		{name: "valid UUID", id: validID, valid: true},
		{name: "invalid UUID", id: "not-a-uuid", valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.ID = tt.id

			_, err := NewShirt(input, time.Time{}, ownerToken)
			if tt.valid && err != nil {
				t.Fatalf("NewShirt() unexpected error: %v", err)
			}
			if !tt.valid {
				assertValidationError(t, err, "id")
			}
		})
	}
}

func TestNewShirt_ValidatesNameLengthInBytes(t *testing.T) {
	tests := []struct {
		name  string
		value string
		valid bool
	}{
		{name: "empty", value: "", valid: false},
		{name: "one byte", value: "a", valid: true},
		{name: "24 bytes", value: strings.Repeat("a", 24), valid: true},
		{name: "25 bytes", value: strings.Repeat("a", 25), valid: false},
		{name: "six emojis", value: strings.Repeat("😀", 6), valid: true},
		{name: "seven emojis", value: strings.Repeat("😀", 7), valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.Name = tt.value

			_, err := NewShirt(input, time.Time{}, ownerToken)
			if tt.valid && err != nil {
				t.Fatalf("NewShirt() unexpected error: %v", err)
			}
			if !tt.valid {
				assertValidationError(t, err, "name")
			}
		})
	}
}

func TestNewShirt_ValidatesAngleRange(t *testing.T) {
	tests := []struct {
		name  string
		angle int
		valid bool
	}{
		{name: "below minimum", angle: -1, valid: false},
		{name: "minimum", angle: 0, valid: true},
		{name: "maximum", angle: 359, valid: true},
		{name: "above maximum", angle: 360, valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.Angle = tt.angle

			_, err := NewShirt(input, time.Time{}, ownerToken)
			if tt.valid && err != nil {
				t.Fatalf("NewShirt() unexpected error: %v", err)
			}
			if !tt.valid {
				assertValidationError(t, err, "angle")
			}
		})
	}
}

func TestNewShirt_ValidatesTextColor(t *testing.T) {
	tests := []struct {
		name  string
		value string
		valid bool
	}{
		{name: "empty", value: "", valid: false},
		{name: "short", value: "#12345", valid: false},
		{name: "long", value: "#1234567", valid: false},
		{name: "non hexadecimal", value: "#12GG56", valid: false},
		{name: "valid uppercase", value: "#ABCDEF", valid: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.TextColor = tt.value

			shirt, err := NewShirt(input, time.Time{}, ownerToken)
			if tt.valid {
				if err != nil {
					t.Fatalf("NewShirt() unexpected error: %v", err)
				}
				if shirt.TextColor != strings.ToLower(tt.value) {
					t.Errorf("TextColor = %q, want %q", shirt.TextColor, strings.ToLower(tt.value))
				}
				return
			}

			assertValidationError(t, err, "textColor")
		})
	}
}

func TestNewShirt_ValidatesColorsCount(t *testing.T) {
	tests := []struct {
		name   string
		colors []string
		valid  bool
	}{
		{name: "zero colors", colors: nil, valid: false},
		{name: "one color", colors: []string{"#123456"}, valid: true},
		{name: "two colors", colors: []string{"#123456", "#234567"}, valid: true},
		{name: "three colors", colors: []string{"#123456", "#234567", "#345678"}, valid: true},
		{name: "four colors", colors: []string{"#123456", "#234567", "#345678", "#456789"}, valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.Colors = tt.colors

			_, err := NewShirt(input, time.Time{}, ownerToken)
			if tt.valid && err != nil {
				t.Fatalf("NewShirt() unexpected error: %v", err)
			}
			if !tt.valid {
				assertValidationError(t, err, "colors")
			}
		})
	}
}

func TestNewShirt_ValidatesEachColor(t *testing.T) {
	tests := []struct {
		name   string
		colors []string
	}{
		{name: "invalid first color", colors: []string{"", "#123456", "#234567"}},
		{name: "invalid second color", colors: []string{"#123456", "#12345", "#234567"}},
		{name: "invalid third color", colors: []string{"#123456", "#234567", "#12GG56"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := validShirtInput()
			input.Colors = tt.colors

			_, err := NewShirt(input, time.Time{}, ownerToken)
			assertValidationError(t, err, "colors")
		})
	}
}

func TestNewShirt_NormalizesColorsToLowercase(t *testing.T) {
	input := validShirtInput()
	input.TextColor = "#ABCDEF"
	input.Colors = []string{"#123ABC", "#FEDCBA", "#A1B2C3"}

	shirt := newTestShirt(t, input)

	if shirt.TextColor != "#abcdef" {
		t.Errorf("TextColor = %q, want %q", shirt.TextColor, "#abcdef")
	}

	wantColors := []string{"#123abc", "#fedcba", "#a1b2c3"}
	if len(shirt.Colors) != len(wantColors) {
		t.Fatalf("len(Colors) = %d, want %d", len(shirt.Colors), len(wantColors))
	}
	for i := range wantColors {
		if shirt.Colors[i] != wantColors[i] {
			t.Errorf("Colors[%d] = %q, want %q", i, shirt.Colors[i], wantColors[i])
		}
	}
}

func TestShirt_OwnedBy(t *testing.T) {
	shirt := newTestShirt(t, validShirtInput())

	tests := []struct {
		name  string
		token string
		want  bool
	}{
		{name: "original token", token: ownerToken, want: true},
		{name: "different token", token: "another-token", want: false},
		{name: "empty token", token: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shirt.OwnedBy(tt.token); got != tt.want {
				t.Errorf("OwnedBy(%q) = %t, want %t", tt.token, got, tt.want)
			}
		})
	}
}
