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
