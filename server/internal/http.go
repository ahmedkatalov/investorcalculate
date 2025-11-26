package internal

import "net/http"

// withCORS добавляет CORS заголовки ко всем запросам
func withCORS(h http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Разрешаем запросы с любого origin (в продакшене замените на ваш домен)
        origin := r.Header.Get("Origin")
        if origin == "" {
            origin = "*"
        }
        w.Header().Set("Access-Control-Allow-Origin", origin)
        
        // Разрешаем методы
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        
        // Разрешаем заголовки
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin")
        
        // Разрешаем куки если нужно
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        
        // Разрешаем кэширование preflight на 1 час
        w.Header().Set("Access-Control-Max-Age", "3600")
        
        // Обрабатываем preflight запросы
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        h.ServeHTTP(w, r)
    })
}