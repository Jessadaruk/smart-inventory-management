// จำกัดการลองรหัสผ่านต่ออีเมล สำหรับระบบ local เครื่องเดียว
const attempts = new Map<string, { count: number; expires: number }>();
export function canAttemptLogin(email: string) {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.expires < now) attempts.delete(key);
  }
  const previous = attempts.get(email);
  if (previous && previous.count >= 10) return false;
  if (!previous) {
    if (attempts.size >= 5000) attempts.clear();
    attempts.set(email, { count: 1, expires: now + 15 * 60 * 1000 });
  } else previous.count++;
  return true;
}
export function clearLoginAttempts(email: string) {
  attempts.delete(email);
}
