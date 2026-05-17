/**
 * Maps an api-client thrown error to user-facing Thai copy. Discriminates
 * on `code` first (typed business errors), then falls back to status-class
 * messages, so the UI never surfaces raw backend strings like
 * "Request failed: 500" or "ConflictException".
 *
 * Matches the ApiError envelope produced by AllExceptionsFilter on the API
 * side: errors thrown by createApiClient() carry { statusCode, code, details }
 * via Object.assign on the Error instance.
 */
interface ApiClientError {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
  }
  if (!error || typeof error !== "object") {
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
  const e = error as ApiClientError;

  switch (e.code) {
    case "BOOKING_OVERLAP":
      return "ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกช่วงเวลาอื่น";
  }

  switch (e.statusCode) {
    case 400:
      return "ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    case 401:
      return "กรุณาเข้าสู่ระบบเพื่อทำรายการต่อ";
    case 403:
      return "คุณไม่มีสิทธิ์ทำรายการนี้";
    case 404:
      return "ไม่พบข้อมูลที่ต้องการ";
    case 409:
      return "ข้อมูลขัดแย้งกับรายการอื่น กรุณาลองใหม่อีกครั้ง";
    case 422:
      return "ข้อมูลที่กรอกไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง";
    case 429:
      return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (typeof e.statusCode === "number" && e.statusCode >= 500) {
    return "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

/**
 * Maps a Supabase AuthError (from supabase.auth.signInWithPassword /
 * signUp / signInWithOAuth) to user-facing Thai copy. Supabase's
 * AuthError exposes only `.message: string` — no statusCode / code — so
 * it bypasses getErrorMessage above. We match on substrings of the
 * known-stable English messages.
 *
 * Also accepts a raw string (the case where /auth/callback/route.ts
 * redirected back with ?error=... in the query string).
 */
export function supabaseAuthErrorMessage(error: unknown): string {
  let raw: string | undefined;
  if (typeof error === "string") {
    raw = error;
  } else if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") raw = m;
  }
  if (!raw) return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

  const m = raw.toLowerCase();
  if (m.includes("unsupported provider") || m.includes("provider is not enabled")) {
    return "ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วย Google";
  }
  if (m.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (m.includes("email not confirmed")) {
    return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  }
  if (m.includes("user already registered")) {
    return "อีเมลนี้ถูกใช้สมัครไปแล้ว กรุณาเข้าสู่ระบบ";
  }
  if (m.includes("password should be at least")) {
    return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  }
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
