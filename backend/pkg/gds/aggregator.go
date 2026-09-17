// Package gds implements the GDS Aggregator using the Strategy Pattern.
// Each bus inventory supplier is hidden behind a single GDSClient interface
// so the search endpoint fans out to all of them concurrently and normalizes
// results into one unified TripOption schema.
package gds

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/ylttravels/transit-os/backend/internal/models"
)

// GDSClient is the Strategy interface. Every supplier implements Search.
type GDSClient interface {
	Name() string
	Search(ctx context.Context, req models.SearchRequest) ([]models.TripOption, error)
}

// Aggregator fans a single request out to every registered GDSClient
// concurrently and merges normalized results.
type Aggregator struct {
	clients []GDSClient
}

func NewAggregator(clients ...GDSClient) *Aggregator {
	return &Aggregator{clients: clients}
}

// Result is what each goroutine sends down the results channel.
type Result struct {
	Trips []models.TripOption
	Err   error
	From  string
}

// Search runs every GDSClient concurrently, collects results via a channel,
// and returns the merged slice plus a map of per-supplier errors.
//
// Why goroutines + channels reduce latency: if three suppliers each take
// 300ms, sequential calls take 900ms; concurrent calls take ~300ms (bounded
// by the slowest). Partial failures (one GDS down) do NOT fail the whole
// request — the caller still gets usable results from healthy suppliers.
func (a *Aggregator) Search(ctx context.Context, req models.SearchRequest) ([]models.TripOption, map[string]error) {
	var wg sync.WaitGroup
	resCh := make(chan Result, len(a.clients))

	for _, c := range a.clients {
		wg.Add(1)
		go func(client GDSClient) {
			defer wg.Done()
			trips, err := client.Search(ctx, req)
			resCh <- Result{Trips: trips, Err: err, From: client.Name()}
		}(c)
	}

	go func() {
		wg.Wait()
		close(resCh)
	}()

	merged := make([]models.TripOption, 0, len(a.clients)*2)
	errs := make(map[string]error)
	for res := range resCh {
		if res.Err != nil {
			errs[res.From] = res.Err
			continue
		}
		merged = append(merged, res.Trips...)
	}
	return merged, errs
}

// SearchWithTimeout wraps Search with a hard deadline.
func (a *Aggregator) SearchWithTimeout(parent context.Context, req models.SearchRequest, timeout time.Duration) ([]models.TripOption, map[string]error) {
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	return a.Search(ctx, req)
}

// --- Mock GDS clients ---

type BitlaAPI struct{}

func (BitlaAPI) Name() string { return "bitla" }
func (BitlaAPI) Search(ctx context.Context, req models.SearchRequest) ([]models.TripOption, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return []models.TripOption{
		buildMock("bitla-101", "Bitla Travels", "AC Sleeper", req, 899, 1299),
		buildMock("bitla-102", "Bitla Travels", "Non-AC Seater", req, 499, 799),
	}, nil
}

type MantisAPI struct{}

func (MantisAPI) Name() string { return "mantis" }
func (MantisAPI) Search(ctx context.Context, req models.SearchRequest) ([]models.TripOption, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return []models.TripOption{
		buildMock("mantis-201", "Mantis Lines", "AC Semi-Sleeper", req, 749, 1099),
	}, nil
}

type AbhiBusCRS struct{}

func (AbhiBusCRS) Name() string { return "abhibus" }
func (AbhiBusCRS) Search(ctx context.Context, req models.SearchRequest) ([]models.TripOption, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if time.Now().UnixNano()%10 == 0 {
		return nil, errors.New("abhibus: upstream timeout")
	}
	return []models.TripOption{
		buildMock("abhi-301", "AbhiBus Partner", "AC Sleeper", req, 999, 1499),
		buildMock("abhi-302", "AbhiBus Partner", "Volvo Multi-Axle", req, 1199, 1799),
	}, nil
}

// DefaultAggregator returns an Aggregator pre-wired with mock suppliers.
func DefaultAggregator() *Aggregator {
	return NewAggregator(BitlaAPI{}, MantisAPI{}, AbhiBusCRS{})
}

func buildMock(tripID, opName, busType string, req models.SearchRequest, minP, maxP float64) models.TripOption {
	const rows = 6
	seats := make([]models.SeatInfo, 0, rows*2)
	for r := 1; r <= rows; r++ {
		for c := 0; c < 2; c++ {
			seats = append(seats, models.SeatInfo{
				ID:       tripID + "-" + label(r, c),
				Label:    label(r, c),
				Row:      r,
				Col:      c,
				Deck:     "lower",
				Price:    minP + float64(r-1)*50,
				Currency: "INR",
				Status:   "available",
				Type:     busType,
			})
		}
	}
	dep := req.Date.Add(8 * time.Hour)
	return models.TripOption{
		TripID:         tripID,
		Operator:       models.OperatorInfo{Name: opName, Rating: 4.2},
		Source:         req.Source,
		Destination:    req.Destination,
		DepartureAt:    dep,
		ArrivalAt:      dep.Add(7 * time.Hour),
		DurationMins:   420,
		BusType:        busType,
		TotalSeats:     len(seats),
		AvailableSeats: len(seats),
		MinPrice:       minP,
		MaxPrice:       maxP,
		Currency:       "INR",
		Seats:          seats,
		GDS:            tripID[:indexOf(tripID, "-")],
	}
}

func label(row, col int) string {
	return string(rune('A'+col)) + itoa(row)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [8]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
