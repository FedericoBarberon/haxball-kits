package repositorycontract

import (
	"errors"
	"reflect"
	"testing"
	"time"

	"haxball-kits/internal/domain"
	"haxball-kits/internal/repository"
)

type RepositoryFactory func() repository.ShirtRepository

func RunShirtRepositoryContract(t *testing.T, newRepository RepositoryFactory) {
	t.Helper()

	t.Run("create and get preserve the shirt", func(t *testing.T) {
		repo := newRepository()
		want := testShirt("shirt-1", "Classic", time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))

		if err := repo.Create(want); err != nil {
			t.Fatalf("Create() unexpected error: %v", err)
		}

		got, err := repo.Get(want.ID)
		if err != nil {
			t.Fatalf("Get() unexpected error: %v", err)
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Get() = %#v, want %#v", got, want)
		}
	})

	t.Run("duplicate create preserves original and total", func(t *testing.T) {
		repo := newRepository()
		original := testShirt("shirt-1", "Original", time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
		duplicate := testShirt("shirt-1", "Duplicate", time.Date(2026, 1, 3, 3, 4, 5, 0, time.UTC))

		if err := repo.Create(original); err != nil {
			t.Fatalf("Create(original) unexpected error: %v", err)
		}
		before, err := repo.Total()
		if err != nil {
			t.Fatalf("Total() before duplicate unexpected error: %v", err)
		}

		err = repo.Create(duplicate)
		if !errors.Is(err, repository.ErrAlreadyExists) {
			t.Fatalf("Create(duplicate) error = %v, want ErrAlreadyExists", err)
		}

		after, err := repo.Total()
		if err != nil {
			t.Fatalf("Total() after duplicate unexpected error: %v", err)
		}
		if after != before {
			t.Errorf("Total() after duplicate = %d, want %d", after, before)
		}

		got, err := repo.Get(original.ID)
		if err != nil {
			t.Fatalf("Get() after duplicate unexpected error: %v", err)
		}
		if !reflect.DeepEqual(got, original) {
			t.Errorf("Get() after duplicate = %#v, want %#v", got, original)
		}
	})

	t.Run("get missing returns not found", func(t *testing.T) {
		repo := newRepository()

		_, err := repo.Get("missing")
		if !errors.Is(err, repository.ErrNotFound) {
			t.Fatalf("Get() error = %v, want ErrNotFound", err)
		}
	})

	t.Run("delete existing removes it and decrements total", func(t *testing.T) {
		repo := newRepository()
		shirt := testShirt("shirt-1", "Classic", time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
		if err := repo.Create(shirt); err != nil {
			t.Fatalf("Create() unexpected error: %v", err)
		}

		before, err := repo.Total()
		if err != nil {
			t.Fatalf("Total() before delete unexpected error: %v", err)
		}
		if err := repo.Delete(shirt.ID); err != nil {
			t.Fatalf("Delete() unexpected error: %v", err)
		}

		_, err = repo.Get(shirt.ID)
		if !errors.Is(err, repository.ErrNotFound) {
			t.Fatalf("Get() after delete error = %v, want ErrNotFound", err)
		}
		after, err := repo.Total()
		if err != nil {
			t.Fatalf("Total() after delete unexpected error: %v", err)
		}
		if after != before-1 {
			t.Errorf("Total() after delete = %d, want %d", after, before-1)
		}
	})

	t.Run("delete missing returns not found", func(t *testing.T) {
		repo := newRepository()

		if err := repo.Delete("missing"); !errors.Is(err, repository.ErrNotFound) {
			t.Fatalf("Delete() error = %v, want ErrNotFound", err)
		}
	})

	t.Run("deleted id can be reused", func(t *testing.T) {
		repo := newRepository()
		first := testShirt("reusable-id", "First", time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
		second := testShirt("reusable-id", "Second", time.Date(2026, 1, 3, 3, 4, 5, 0, time.UTC))

		if err := repo.Create(first); err != nil {
			t.Fatalf("Create(first) unexpected error: %v", err)
		}
		if err := repo.Delete(first.ID); err != nil {
			t.Fatalf("Delete(first) unexpected error: %v", err)
		}
		if err := repo.Create(second); err != nil {
			t.Fatalf("Create(second) after delete unexpected error: %v", err)
		}

		got, err := repo.Get(second.ID)
		if err != nil {
			t.Fatalf("Get(second) unexpected error: %v", err)
		}
		if !reflect.DeepEqual(got, second) {
			t.Errorf("Get(second) = %#v, want %#v", got, second)
		}
	})

	t.Run("total counts creations", func(t *testing.T) {
		repo := newRepository()
		total, err := repo.Total()
		if err != nil {
			t.Fatalf("Total() empty unexpected error: %v", err)
		}
		if total != 0 {
			t.Fatalf("Total() empty = %d, want 0", total)
		}

		for i := 1; i <= 3; i++ {
			shirt := testShirt(testID(i), "Shirt", time.Date(2026, 1, i, 0, 0, 0, 0, time.UTC))
			if err := repo.Create(shirt); err != nil {
				t.Fatalf("Create(%d) unexpected error: %v", i, err)
			}
			total, err := repo.Total()
			if err != nil {
				t.Fatalf("Total() after %d creations unexpected error: %v", i, err)
			}
			if total != i {
				t.Errorf("Total() after %d creations = %d, want %d", i, total, i)
			}
		}
	})

	t.Run("list empty returns non nil empty slice", func(t *testing.T) {
		repo := newRepository()

		items, err := repo.List(1, 10)
		if err != nil {
			t.Fatalf("List() empty unexpected error: %v", err)
		}
		if items == nil {
			t.Fatal("List() empty returned nil slice, want non-nil empty slice")
		}
		if len(items) != 0 {
			t.Errorf("len(List()) empty = %d, want 0", len(items))
		}
	})

	t.Run("list is ordered by createdAt name and id", func(t *testing.T) {
		repo := newRepository()
		shirts := []domain.Shirt{
			testShirt("3", "Beta", time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC)),
			testShirt("2", "Alpha", time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC)),
			testShirt("1", "Alpha", time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC)),
		}
		for _, shirt := range shirts {
			if err := repo.Create(shirt); err != nil {
				t.Fatalf("Create(%q) unexpected error: %v", shirt.ID, err)
			}
		}

		got, err := repo.List(1, 10)
		if err != nil {
			t.Fatalf("List() unexpected error: %v", err)
		}
		wantIDs := []string{"1", "2", "3"}
		assertIDs(t, got, wantIDs)
	})

	t.Run("list pagination is contiguous disjoint and complete", func(t *testing.T) {
		repo := newRepository()
		for i := 1; i <= 5; i++ {
			shirt := testShirt(testID(i), "Shirt", time.Date(2026, 1, 6-i, 0, 0, 0, 0, time.UTC))
			if err := repo.Create(shirt); err != nil {
				t.Fatalf("Create(%d) unexpected error: %v", i, err)
			}
		}

		all, err := repo.List(1, 10)
		if err != nil {
			t.Fatalf("List(all) unexpected error: %v", err)
		}
		pageOne, err := repo.List(1, 2)
		if err != nil {
			t.Fatalf("List(page one) unexpected error: %v", err)
		}
		pageTwo, err := repo.List(2, 2)
		if err != nil {
			t.Fatalf("List(page two) unexpected error: %v", err)
		}
		pageThree, err := repo.List(3, 2)
		if err != nil {
			t.Fatalf("List(page three) unexpected error: %v", err)
		}
		pageFour, err := repo.List(4, 2)
		if err != nil {
			t.Fatalf("List(page four) unexpected error: %v", err)
		}

		combined := append(append(append(append([]domain.Shirt{}, pageOne...), pageTwo...), pageThree...), pageFour...)
		if !reflect.DeepEqual(combined, all) {
			t.Errorf("combined pages = %#v, want %#v", combined, all)
		}
		if len(pageThree) != 1 {
			t.Errorf("last partial page len = %d, want 1", len(pageThree))
		}
		if len(pageFour) != 0 {
			t.Errorf("page after last len = %d, want 0", len(pageFour))
		}

		largePage, err := repo.List(1, 100)
		if err != nil {
			t.Fatalf("List(large page size) unexpected error: %v", err)
		}
		if !reflect.DeepEqual(largePage, all) {
			t.Errorf("large page = %#v, want %#v", largePage, all)
		}
	})

	t.Run("list and get return copies", func(t *testing.T) {
		repo := newRepository()
		shirt := testShirt("shirt-1", "Classic", time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
		if err := repo.Create(shirt); err != nil {
			t.Fatalf("Create() unexpected error: %v", err)
		}

		got, err := repo.Get(shirt.ID)
		if err != nil {
			t.Fatalf("Get() unexpected error: %v", err)
		}
		got.Colors[0] = "#ffffff"

		listed, err := repo.List(1, 10)
		if err != nil {
			t.Fatalf("List() unexpected error: %v", err)
		}
		listed[0].Colors[0] = "#000000"

		stored, err := repo.Get(shirt.ID)
		if err != nil {
			t.Fatalf("Get() after mutation unexpected error: %v", err)
		}
		if !reflect.DeepEqual(stored, shirt) {
			t.Errorf("stored shirt after returned slice mutations = %#v, want %#v", stored, shirt)
		}
	})
}

func testShirt(id, name string, createdAt time.Time) domain.Shirt {
	return domain.Shirt{
		ID:             id,
		Name:           name,
		Angle:          180,
		TextColor:      "#abcdef",
		Colors:         []string{"#123456", "#fedcba"},
		CreatedAt:      createdAt,
		OwnerTokenHash: "owner-token-hash",
	}
}

func testID(number int) string {
	return "shirt-" + string(rune('0'+number))
}

func assertIDs(t *testing.T, shirts []domain.Shirt, want []string) {
	t.Helper()
	if len(shirts) != len(want) {
		t.Fatalf("len(items) = %d, want %d", len(shirts), len(want))
	}
	for i := range want {
		if shirts[i].ID != want[i] {
			t.Errorf("items[%d].ID = %q, want %q", i, shirts[i].ID, want[i])
		}
	}
}
