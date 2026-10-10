package httpapi

import (
	"encoding/json"
	"haxball-kits/internal/domain"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	MAX_PAGE_SIZE           = 1000
	DEFAULT_PAGE_PARAM      = 1
	DEFAULT_PAGE_SIZE_PARAM = 20
)

type apiShirt struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Angle     int       `json:"angle"`
	TextColor string    `json:"textColor"`
	Colors    []string  `json:"colors"`
	CreatedAt time.Time `json:"createdAt"`
}

func apiShirtFromShirt(shirt domain.Shirt) apiShirt {
	return apiShirt{
		ID:        shirt.ID,
		Name:      shirt.Name,
		Angle:     shirt.Angle,
		TextColor: shirt.TextColor,
		Colors:    shirt.Colors,
		CreatedAt: shirt.CreatedAt.UTC(),
	}
}

func (h *ShirtHandler) ListShirts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	page, pageSize, apiErr := parseListParams(r)
	if apiErr != nil {
		setResponse(w, http.StatusBadRequest, apiErr.toJSON())
		return
	}

	shirts, err := h.repo.List(page, pageSize)
	if err != nil {
		setResponse(w, http.StatusInternalServerError, newApiError("internal server error").toJSON())
		return
	}

	apiShirts := make([]apiShirt, len(shirts))
	for i := range shirts {
		apiShirts[i] = apiShirtFromShirt(shirts[i])
	}

	total, err := h.repo.Total()
	if err != nil {
		setResponse(w, http.StatusInternalServerError, newApiError("internal server error").toJSON())
		return
	}

	response := struct {
		Items []apiShirt `json:"items"`
		Total int        `json:"total"`
	}{
		Items: apiShirts,
		Total: total,
	}

	jsonShirts, err := json.Marshal(response)
	if err != nil {
		setResponse(w, http.StatusInternalServerError, newApiError("internal server error").toJSON())
		return
	}

	setResponse(w, http.StatusOK, jsonShirts)
}

func parseListParams(r *http.Request) (page int, pageSize int, apiErr *apiError) {
	values := r.URL.Query()

	page, valid := parseQueryParam(values, "page", DEFAULT_PAGE_PARAM, func(v int) bool { return v > 0 })
	if !valid {
		return 0, 0, newApiError("invalid page param")
	}

	pageSize, valid = parseQueryParam(values, "pageSize", DEFAULT_PAGE_SIZE_PARAM, func(v int) bool { return v >= 0 })
	if !valid {
		return 0, 0, newApiError("invalid pageSize param")
	}

	pageSize = min(pageSize, MAX_PAGE_SIZE)
	return
}

func parseQueryParam(values url.Values, query string, defaultValue int, isValid func(int) bool) (int, bool) {
	valueStr := values.Get(query)
	if valueStr == "" {
		return defaultValue, true
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil || !isValid(value) {
		return 0, false
	}

	return value, true
}
