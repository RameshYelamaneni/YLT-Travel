// Package seatlock implements a concurrency-safe in-memory seat lock manager.
//
// Why in-memory locking instead of a DB row lock per check: during a booking
// rush, dozens of users may try to grab the same seat within the same second.
// Hitting the DB for every lock check would saturate the connection pool and
// serialize on row locks. Instead we keep a mutex-protected map in process
// memory; a lock/unlock is a few nanoseconds of mutex time, no DB round-trip.
// The DB is only touched at final booking commit.
//
// This prevents race conditions and double-booking: the RWMutex serializes all
// writers, and the atomic TryAcquire check-then-set is performed under the
// write lock so two concurrent goroutines cannot both observe "free" and both
// acquire the same seat.
package seatlock

import (
	"errors"
	"sync"
	"time"
)

const DefaultTTL = 10 * time.Minute

var (
	ErrSeatAlreadyLocked = errors.New("seatlock: seat already locked")
	ErrSeatNotLocked     = errors.New("seatlock: seat not locked")
	ErrNotLockOwner      = errors.New("seatlock: caller is not the lock owner")
)

type LockMeta struct {
	TripID     string    `json:"tripId"`
	SeatID     string    `json:"seatId"`
	LockedBy   string    `json:"lockedBy"`
	AcquiredAt time.Time `json:"acquiredAt"`
	ExpiresAt  time.Time `json:"expiresAt"`
}

type Manager struct {
	mu     sync.RWMutex
	locks  map[string]LockMeta
	ttl    time.Duration
	stopCh chan struct{}
}

func NewManager(ttl time.Duration) *Manager {
	m := &Manager{
		locks:  make(map[string]LockMeta),
		ttl:    ttl,
		stopCh: make(chan struct{}),
	}
	go m.reaper(1 * time.Minute)
	return m
}

func (m *Manager) Close() {
	select {
	case <-m.stopCh:
	default:
		close(m.stopCh)
	}
}

func key(tripID, seatID string) string { return tripID + ":" + seatID }

// TryAcquire attempts to lock the given seats atomically (all-or-nothing).
func (m *Manager) TryAcquire(tripID string, seatIDs []string, lockedBy string) ([]LockMeta, error) {
	now := time.Now()
	expires := now.Add(m.ttl)

	m.mu.Lock()
	defer m.mu.Unlock()

	for _, sid := range seatIDs {
		k := key(tripID, sid)
		if existing, ok := m.locks[k]; ok {
			if existing.ExpiresAt.After(now) && existing.LockedBy != lockedBy {
				return nil, ErrSeatAlreadyLocked
			}
		}
	}

	acquired := make([]LockMeta, 0, len(seatIDs))
	for _, sid := range seatIDs {
		k := key(tripID, sid)
		meta := LockMeta{
			TripID:     tripID,
			SeatID:     sid,
			LockedBy:   lockedBy,
			AcquiredAt: now,
			ExpiresAt:  expires,
		}
		m.locks[k] = meta
		acquired = append(acquired, meta)
	}
	return acquired, nil
}

func (m *Manager) Release(tripID string, seatIDs []string, lockedBy string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, sid := range seatIDs {
		k := key(tripID, sid)
		meta, ok := m.locks[k]
		if !ok {
			return ErrSeatNotLocked
		}
		if meta.LockedBy != lockedBy {
			return ErrNotLockOwner
		}
		delete(m.locks, k)
	}
	return nil
}

func (m *Manager) IsLocked(tripID, seatID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	meta, ok := m.locks[key(tripID, seatID)]
	if !ok {
		return false
	}
	return meta.ExpiresAt.After(time.Now())
}

func (m *Manager) Snapshot(tripID string) []LockMeta {
	m.mu.RLock()
	defer m.mu.RUnlock()
	now := time.Now()
	out := make([]LockMeta, 0)
	for _, meta := range m.locks {
		if meta.TripID == tripID && meta.ExpiresAt.After(now) {
			out = append(out, meta)
		}
	}
	return out
}

func (m *Manager) reaper(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.sweepExpired()
		}
	}
}

func (m *Manager) sweepExpired() {
	now := time.Now()
	m.mu.Lock()
	defer m.mu.Unlock()
	for k, meta := range m.locks {
		if !meta.ExpiresAt.After(now) {
			delete(m.locks, k)
		}
	}
}
