export function formatearTimer(expiraEn, ahora = Date.now()) {
  const ms = Math.max(0, Number(expiraEn) - ahora);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
