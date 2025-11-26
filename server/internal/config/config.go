package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	PostgresHost     string
	PostgresPort     string
	APIPort          string
	CORSOrigins      []string
}

func Load() *Config {
	cfg := &Config{
		PostgresUser:     getEnv("POSTGRES_USER", "invest"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", "investpass"),
		PostgresDB:       getEnv("POSTGRES_DB", "investdb"),
		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnv("POSTGRES_PORT", "5432"),
		APIPort:          getEnv("API_PORT", "8080"),
	}

	// CORS может содержать несколько доменов через запятую
	corsRaw := getEnv("CORS_ORIGIN", "*")

	// превращаем строку в слайс
	cfg.CORSOrigins = parseCORS(corsRaw)

	log.Printf("Config loaded: DB=%s@%s:%s API_PORT=%s CORS=%v\n",
		cfg.PostgresUser,
		cfg.PostgresHost,
		cfg.PostgresPort,
		cfg.APIPort,
		cfg.CORSOrigins,
	)

	return cfg
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

func getEnv(key, def string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return def
	}
	return val
}

func parseCORS(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{"*"}
	}

	// allow: "http://site.com, https://app.com"
	parts := strings.Split(raw, ",")

	var cleaned []string
	for _, p := range parts {
		x := strings.TrimSpace(p)
		if x != "" {
			cleaned = append(cleaned, x)
		}
	}

	if len(cleaned) == 0 {
		return []string{"*"}
	}

	return cleaned
}
