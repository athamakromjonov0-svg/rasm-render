const TOKEN_KEY = "skinmarket_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

// Backend bilan yagona aloqa nuqtasi.
// Token avtomatik qo'shiladi, xato xabari backenddan olinadi.
export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // Content-Type avtomatik (multipart boundary)
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, { method, headers, body: payload });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* bo'sh javob */
  }

  if (!res.ok) {
    let msg = data && data.message;
    // Joi validatsiya xatlari: { errors: [{ field, error }] }
    if (Array.isArray(data?.errors) && data.errors.length) {
      msg = data.errors.map((e) => e.error).join("; ");
    }
    const err = new Error(msg || `Xatolik yuz berdi (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}
