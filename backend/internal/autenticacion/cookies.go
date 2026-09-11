package autenticacion

import "net/http"

const duracionCookieAccessToken = 15 * 60
const duracionCookieRefreshToken = 7 * 24 * 60 * 60

func establecerCookiesSesion(w http.ResponseWriter, cookieSecure bool, accessToken, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HttpOnly: true,
		Secure:   cookieSecure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   duracionCookieAccessToken,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   cookieSecure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   duracionCookieRefreshToken,
	})
}

func limpiarCookiesSesion(w http.ResponseWriter, cookieSecure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		HttpOnly: true,
		Secure:   cookieSecure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   cookieSecure,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   -1,
	})
}
