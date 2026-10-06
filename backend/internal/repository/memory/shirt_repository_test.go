package memory_test

import (
	"testing"

	"haxball-kits/internal/repository/memory"
	"haxball-kits/internal/repositorycontract"
)

func TestShirtRepository_Contract(t *testing.T) {
	repositorycontract.RunShirtRepositoryContract(t, memory.NewShirtRepository)
}
