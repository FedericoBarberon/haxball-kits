package domain

import (
	"testing"
	"time"
)

func TestShirt_OwnedByOwnerTokenHash(t *testing.T) {
	const ownerTokenHash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

	shirt, err := NewShirt(
		validShirtInput(),
		time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC),
		ownerTokenHash,
	)
	if err != nil {
		t.Fatalf("NewShirt() unexpected error: %v", err)
	}

	tests := []struct {
		name string
		hash string
		want bool
	}{
		{name: "matching hash", hash: ownerTokenHash, want: true},
		{name: "different hash", hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", want: false},
		{name: "empty hash", hash: "", want: false},
		{name: "short hash", hash: "short", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shirt.OwnedBy(tt.hash); got != tt.want {
				t.Errorf("OwnedBy(%q) = %t, want %t", tt.hash, got, tt.want)
			}
		})
	}
}

func TestShirt_OwnedByOwnerTokenHash_ZeroValueShirtRejectsHash(t *testing.T) {
	const nonEmptyHash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

	var shirt Shirt
	if shirt.OwnedBy(nonEmptyHash) {
		t.Fatal("OwnedBy() = true for a zero-value Shirt and a non-empty hash, want false")
	}
}
