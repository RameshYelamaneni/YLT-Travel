package migrate

import (
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func newID() string { return uuid.NewString() }

func hash(pass string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
