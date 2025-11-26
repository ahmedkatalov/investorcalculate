package config


import (
	"log"
	"os"
)

type Config struct {
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	PostgresHost     string
	PostgresPort     string
	APIPort          string
	CORSOrigin       string
}

func Load() *Config {
	cfg := &Config{
		PostgresUser:     os.Getenv("POSTGRES_USER"),
		PostgresPassword: os.Getenv("POSTGRES_PASSWORD"),
		PostgresDB:       os.Getenv("POSTGRES_DB"),
		PostgresHost:     os.Getenv("POSTGRES_HOST"),
		PostgresPort:     os.Getenv("POSTGRES_PORT"),
		APIPort:          os.Getenv("API_PORT"),
		CORSOrigin:       os.Getenv("CORS_ORIGIN"),
	}

	if cfg.APIPort == "" {
		cfg.APIPort = "8080"
	}
	if cfg.PostgresHost == "" {
		cfg.PostgresHost = "localhost"
	}

	log.Println("Config loaded")
	return cfg
}
