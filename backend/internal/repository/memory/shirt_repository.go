package memory

import (
	"haxball-kits/internal/domain"
	"haxball-kits/internal/repository"
	"slices"
	"sort"
	"strings"
)

type ShirtRepository struct {
	shirts []domain.Shirt
}

func NewShirtRepository() repository.ShirtRepository {
	return &ShirtRepository{}
}

func (r *ShirtRepository) List(page, pageSize int) ([]domain.Shirt, error) {
	start := (page - 1) * pageSize
	end := min(start+pageSize, len(r.shirts))

	if start >= len(r.shirts) {
		return []domain.Shirt{}, nil
	}

	return slices.Clone(r.shirts[start:end]), nil
}

func (r *ShirtRepository) Create(s domain.Shirt) error {
	i := slices.IndexFunc(r.shirts, func(s1 domain.Shirt) bool { return s1.ID == s.ID })

	if i != -1 {
		return repository.ErrAlreadyExists
	}

	i = sort.Search(len(r.shirts), func(i int) bool {
		return shirtsInOrder(s, r.shirts[i])
	})

	r.shirts = slices.Insert(r.shirts, i, s)
	return nil
}

func (r *ShirtRepository) Total() (int, error) {
	return len(r.shirts), nil
}

func (r *ShirtRepository) Get(id string) (domain.Shirt, error) {
	i := slices.IndexFunc(r.shirts, func(s domain.Shirt) bool { return s.ID == id })

	if i == -1 {
		return domain.Shirt{}, repository.ErrNotFound
	}

	return r.shirts[i].Clone(), nil
}
func (r *ShirtRepository) Delete(id string) error {
	i := slices.IndexFunc(r.shirts, func(s domain.Shirt) bool { return s.ID == id })

	if i == -1 {
		return repository.ErrNotFound
	}

	r.shirts = slices.Delete(r.shirts, i, i+1)
	return nil
}

func shirtsInOrder(a, b domain.Shirt) bool {
	cmpTimes := a.CreatedAt.Compare(b.CreatedAt)
	cmpNames := strings.Compare(a.Name, b.Name)
	cmpIDs := strings.Compare(a.ID, b.ID)
	return (cmpTimes > 0 || (cmpTimes == 0 && cmpNames < 0) || (cmpTimes == 0 && cmpNames == 0 && cmpIDs < 0))
}
