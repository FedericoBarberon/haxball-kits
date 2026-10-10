package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"haxball-kits/internal/domain"
	"haxball-kits/internal/repository"
)

type listShirtsFakeRepository struct {
	items       []domain.Shirt
	total       int
	listErr     error
	totalErr    error
	listCalls   int
	totalCalls  int
	gotPage     int
	gotPageSize int
}

func (f *listShirtsFakeRepository) List(page, pageSize int) ([]domain.Shirt, error) {
	f.listCalls++
	f.gotPage = page
	f.gotPageSize = pageSize
	if f.listErr != nil {
		return nil, f.listErr
	}
	if pageSize == 0 {
		return []domain.Shirt{}, nil
	}
	return f.items, nil
}

func (f *listShirtsFakeRepository) Create(domain.Shirt) error {
	return nil
}

func (f *listShirtsFakeRepository) Total() (int, error) {
	f.totalCalls++
	if f.totalErr != nil {
		return 0, f.totalErr
	}
	return f.total, nil
}

func (f *listShirtsFakeRepository) Get(string) (domain.Shirt, error) {
	return domain.Shirt{}, repository.ErrNotFound
}

func (f *listShirtsFakeRepository) Delete(string) error {
	return repository.ErrNotFound
}

func newListShirtsHandler(repo repository.ShirtRepository) *ShirtHandler {
	return NewShirtHandler(
		repo,
		func() time.Time {
			return time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)
		},
		func() string {
			return "550e8400-e29b-41d4-a716-446655440000"
		},
	)
}

func TestListShirts_ReturnsItemsAndTotal(t *testing.T) {
	secondCreatedAt := time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)
	firstCreatedAt := time.Date(2026, time.January, 3, 3, 4, 5, 0, time.UTC)
	repo := &listShirtsFakeRepository{
		items: []domain.Shirt{
			{
				ID:             "second",
				Name:           "Second",
				Angle:          45,
				TextColor:      "#abcdef",
				Colors:         []string{"#123456", "#fedcba"},
				CreatedAt:      secondCreatedAt,
				OwnerTokenHash: "second-hash",
			},
			{
				ID:             "first",
				Name:           "First",
				Angle:          90,
				TextColor:      "#654321",
				Colors:         []string{"#abcdef"},
				CreatedAt:      firstCreatedAt,
				OwnerTokenHash: "first-hash",
			},
		},
		total: 7,
	}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=2&pageSize=2", nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	assertJSONContentType(t, response)

	var body struct {
		Items []struct {
			ID             string    `json:"id"`
			Name           string    `json:"name"`
			Angle          int       `json:"angle"`
			TextColor      string    `json:"textColor"`
			Colors         []string  `json:"colors"`
			CreatedAt      time.Time `json:"createdAt"`
			OwnerToken     string    `json:"ownerToken"`
			OwnerTokenHash string    `json:"ownerTokenHash"`
		} `json:"items"`
		Total int `json:"total"`
	}
	decodeJSON(t, response, &body)

	if body.Total != 7 {
		t.Errorf("total = %d, want 7", body.Total)
	}
	if len(body.Items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(body.Items))
	}
	if got := body.Items[0].ID; got != "second" {
		t.Errorf("items[0].id = %q, want %q", got, "second")
	}
	if got := body.Items[1].ID; got != "first" {
		t.Errorf("items[1].id = %q, want %q", got, "first")
	}
	if body.Items[0].Name != "Second" || body.Items[1].Name != "First" {
		t.Errorf("items names = %q, %q; want %q, %q", body.Items[0].Name, body.Items[1].Name, "Second", "First")
	}
	if body.Items[0].Angle != 45 || body.Items[0].TextColor != "#abcdef" || !reflect.DeepEqual(body.Items[0].Colors, []string{"#123456", "#fedcba"}) || !body.Items[0].CreatedAt.Equal(secondCreatedAt) {
		t.Errorf("first item API fields = %#v, want mapped public fields", body.Items[0])
	}
	if body.Items[1].Angle != 90 || body.Items[1].TextColor != "#654321" || !reflect.DeepEqual(body.Items[1].Colors, []string{"#abcdef"}) || !body.Items[1].CreatedAt.Equal(firstCreatedAt) {
		t.Errorf("second item API fields = %#v, want mapped public fields", body.Items[1])
	}
	if body.Items[0].OwnerToken != "" || body.Items[0].OwnerTokenHash != "" {
		t.Fatal("items expose owner token data")
	}
	if repo.gotPage != 2 || repo.gotPageSize != 2 {
		t.Errorf("List() called with (%d, %d), want (2, 2)", repo.gotPage, repo.gotPageSize)
	}
}

func TestListShirts_EmptyRepositoryReturnsEmptyItems(t *testing.T) {
	repo := &listShirtsFakeRepository{items: []domain.Shirt{}, total: 0}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=1&pageSize=10", nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	assertJSONContentType(t, response)

	var body struct {
		Items json.RawMessage `json:"items"`
		Total int             `json:"total"`
	}
	decodeJSON(t, response, &body)

	if string(body.Items) != "[]" {
		t.Errorf("items = %s, want []", body.Items)
	}
	if body.Total != 0 {
		t.Errorf("total = %d, want 0", body.Total)
	}
}

func TestListShirts_LimitsPageSizeToMaximum(t *testing.T) {
	repo := &listShirtsFakeRepository{items: []domain.Shirt{}, total: 0}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=3&pageSize="+strconv.Itoa(MAX_PAGE_SIZE+1), nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if repo.gotPage != 3 || repo.gotPageSize != MAX_PAGE_SIZE {
		t.Errorf("List() called with (%d, %d), want (3, %d)", repo.gotPage, repo.gotPageSize, MAX_PAGE_SIZE)
	}
}

func TestListShirts_UsesDefaultsForMissingParameters(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		wantPage int
		wantSize int
	}{
		{name: "both missing", query: "", wantPage: 1, wantSize: 20},
		{name: "page missing", query: "?pageSize=7", wantPage: 1, wantSize: 7},
		{name: "page size missing", query: "?page=3", wantPage: 3, wantSize: 20},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &listShirtsFakeRepository{items: []domain.Shirt{}, total: 0}
			handler := newListShirtsHandler(repo)
			request := httptest.NewRequest(http.MethodGet, "/shirts"+tt.query, nil)
			response := httptest.NewRecorder()

			handler.ListShirts(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
			}
			if repo.gotPage != tt.wantPage || repo.gotPageSize != tt.wantSize {
				t.Errorf("List() called with (%d, %d), want (%d, %d)", repo.gotPage, repo.gotPageSize, tt.wantPage, tt.wantSize)
			}
		})
	}
}

func TestListShirts_ZeroPageSizeReturnsEmptyItemsAndTotal(t *testing.T) {
	repo := &listShirtsFakeRepository{items: []domain.Shirt{{ID: "must-not-be-returned"}}, total: 4}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=2&pageSize=0", nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	assertJSONContentType(t, response)

	var body struct {
		Items json.RawMessage `json:"items"`
		Total int             `json:"total"`
	}
	decodeJSON(t, response, &body)
	if string(body.Items) != "[]" {
		t.Errorf("items = %s, want []", body.Items)
	}
	if body.Total != 4 {
		t.Errorf("total = %d, want 4", body.Total)
	}
	if repo.totalCalls != 1 {
		t.Errorf("Total() calls = %d, want 1", repo.totalCalls)
	}
}

func TestListShirts_RejectsInvalidPage(t *testing.T) {
	tests := []struct {
		name string
		page string
	}{
		{name: "zero", page: "0"},
		{name: "negative", page: "-1"},
		{name: "non numeric", page: "abc"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &listShirtsFakeRepository{}
			handler := newListShirtsHandler(repo)
			request := httptest.NewRequest(http.MethodGet, "/shirts?page="+tt.page+"&pageSize=10", nil)
			response := httptest.NewRecorder()

			handler.ListShirts(response, request)

			if response.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
			if repo.listCalls != 0 || repo.totalCalls != 0 {
				t.Errorf("repository calls = List:%d Total:%d, want no calls", repo.listCalls, repo.totalCalls)
			}
		})
	}
}

func TestListShirts_RejectsInvalidPageSize(t *testing.T) {
	tests := []struct {
		name     string
		pageSize string
	}{
		{name: "negative", pageSize: "-1"},
		{name: "non numeric", pageSize: "abc"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &listShirtsFakeRepository{}
			handler := newListShirtsHandler(repo)
			request := httptest.NewRequest(http.MethodGet, "/shirts?page=1&pageSize="+tt.pageSize, nil)
			response := httptest.NewRecorder()

			handler.ListShirts(response, request)

			if response.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
			if repo.listCalls != 0 || repo.totalCalls != 0 {
				t.Errorf("repository calls = List:%d Total:%d, want no calls", repo.listCalls, repo.totalCalls)
			}
		})
	}
}

func TestListShirts_ListErrorReturnsInternalServerError(t *testing.T) {
	const internalMessage = "database connection details"
	repo := &listShirtsFakeRepository{listErr: errors.New(internalMessage)}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=1&pageSize=10", nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if strings.Contains(response.Body.String(), internalMessage) {
		t.Fatalf("response exposes internal error: %q", response.Body.String())
	}
	assertErrorBody(t, response)
}

func TestListShirts_TotalErrorReturnsInternalServerError(t *testing.T) {
	const internalMessage = "database connection details"
	repo := &listShirtsFakeRepository{
		items:    []domain.Shirt{},
		totalErr: errors.New(internalMessage),
	}
	handler := newListShirtsHandler(repo)
	request := httptest.NewRequest(http.MethodGet, "/shirts?page=1&pageSize=10", nil)
	response := httptest.NewRecorder()

	handler.ListShirts(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if strings.Contains(response.Body.String(), internalMessage) {
		t.Fatalf("response exposes internal error: %q", response.Body.String())
	}
	assertErrorBody(t, response)
}

func assertJSONContentType(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	if got := response.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
}

func decodeJSON(t *testing.T, response *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		t.Fatalf("decode response JSON: %v; body = %q", err, response.Body.String())
	}
}

func assertErrorBody(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()

	var body struct {
		Error string `json:"error"`
	}
	decodeJSON(t, response, &body)
	if body.Error == "" {
		t.Error("error response has an empty error field")
	}
}
