package security_test

import (
	"strings"
	"testing"

	"haxball-kits/internal/security"
)

func TestHashOwnerToken_IsDeterministic(t *testing.T) {
	const token = "550e8400-e29b-41d4-a716-446655440000"

	first := security.HashOwnerToken(token)
	second := security.HashOwnerToken(token)

	if first != second {
		t.Fatalf("HashOwnerToken() returned different hashes for the same token: %q != %q", first, second)
	}
}

func TestHashOwnerToken_ReturnsLowercaseSHA256Hex(t *testing.T) {
	const want = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

	got := security.HashOwnerToken("abc")

	if got != want {
		t.Errorf("HashOwnerToken(%q) = %q, want %q", "abc", got, want)
	}
	if len(got) != 64 {
		t.Errorf("len(HashOwnerToken()) = %d, want 64", len(got))
	}
	if got != strings.ToLower(got) {
		t.Errorf("HashOwnerToken() = %q, want lowercase hexadecimal", got)
	}
	for _, char := range got {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f')) {
			t.Errorf("HashOwnerToken() contains non-lowercase-hexadecimal character %q", char)
		}
	}
}

func TestHashOwnerToken_DifferentInputsProduceDifferentHashes(t *testing.T) {
	if first, second := security.HashOwnerToken("first"), security.HashOwnerToken("second"); first == second {
		t.Errorf("HashOwnerToken() returned the same hash for different tokens: %q", first)
	}
}
