package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/pkg/erp"
	"github.com/ylttravels/transit-os/backend/pkg/gds"
	"github.com/ylttravels/transit-os/backend/pkg/seatlock"
)

// --- Bus search handler ---

type BusSearchHandler struct {
	agg *gds.Aggregator
}

func NewBusSearchHandler(agg *gds.Aggregator) *BusSearchHandler {
	return &BusSearchHandler{agg: agg}
}

func (h *BusSearchHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/bus/search", h.search)
}

func (h *BusSearchHandler) search(c *gin.Context) {
	source := c.Query("source")
	dest := c.Query("destination")
	if source == "" || dest == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "source and destination are required"})
		return
	}
	dateStr := c.Query("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date must be YYYY-MM-DD"})
		return
	}
	passengers, _ := strconv.Atoi(c.DefaultQuery("passengers", "1"))
	if passengers <= 0 {
		passengers = 1
	}

	req := models.SearchRequest{
		Source:      source,
		Destination: dest,
		Date:        date,
		Passengers:  passengers,
	}

	start := time.Now()
	// 3-second hard deadline: even if one GDS hangs, the client still gets
	// a response with whatever the healthy suppliers returned.
	trips, errs := h.agg.SearchWithTimeout(c.Request.Context(), req, 3*time.Second)

	errStrs := make(map[string]string, len(errs))
	for k, v := range errs {
		errStrs[k] = v.Error()
	}

	c.JSON(http.StatusOK, gin.H{
		"trips":     trips,
		"errors":     errStrs,
		"elapsedMs": time.Since(start).Milliseconds(),
	})
}

// --- Seat lock handler ---

type SeatLockHandler struct {
	mgr *seatlock.Manager
}

func NewSeatLockHandler(mgr *seatlock.Manager) *SeatLockHandler {
	return &SeatLockHandler{mgr: mgr}
}

func (h *SeatLockHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/bus/lock-seat", h.lock)
	rg.POST("/bus/unlock-seat", h.unlock)
	rg.GET("/bus/seat-locks/:tripId", h.snapshot)
}

func (h *SeatLockHandler) lock(c *gin.Context) {
	var req struct {
		TripID   string   `json:"tripId"   binding:"required"`
		SeatIDs  []string `json:"seatIds"  binding:"required"`
		LockedBy string   `json:"lockedBy" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	acquired, err := h.mgr.TryAcquire(req.TripID, req.SeatIDs, req.LockedBy)
	if err != nil {
		if errors.Is(err, seatlock.ErrSeatAlreadyLocked) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"acquired":   acquired,
		"ttlSeconds": int(seatlock.DefaultTTL.Seconds()),
	})
}

func (h *SeatLockHandler) unlock(c *gin.Context) {
	var req struct {
		TripID   string   `json:"tripId"   binding:"required"`
		SeatIDs  []string `json:"seatIds"  binding:"required"`
		LockedBy string   `json:"lockedBy" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.mgr.Release(req.TripID, req.SeatIDs, req.LockedBy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SeatLockHandler) snapshot(c *gin.Context) {
	tripID := c.Param("tripId")
	locks := h.mgr.Snapshot(tripID)
	c.JSON(http.StatusOK, gin.H{"locks": locks})
}

// --- ERP dashboard handler ---

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler { return &DashboardHandler{} }

func (h *DashboardHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/erp/dashboard/sync", h.sync)
}

// sync is the single endpoint that replaces 26 separate HTTP calls. One
// request fans out into N concurrent goroutines inside
// erp.LoadOperatorDashboard, each issuing QueryContext against the shared
// pool. The client gets one payload, one round-trip.
func (h *DashboardHandler) sync(c *gin.Context) {
	opID, err := strconv.ParseInt(c.DefaultQuery("operatorId", "1"), 10, 64)
	if err != nil || opID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "operatorId must be a positive integer"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 6*time.Second)
	defer cancel()

	payload, err := erp.LoadOperatorDashboard(ctx, opID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "dashboard load failed"})
		return
	}
	c.JSON(http.StatusOK, payload)
}
