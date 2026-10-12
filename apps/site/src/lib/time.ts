const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

// Worked minutes from ordered punches [in, breakStart, breakEnd, out]:
// only closed work spans count (in→breakStart, breakEnd→out).
export function workedMinutes(times: readonly string[]) {
  let total = 0;
  for (let i = 0; i + 1 < times.length; i += 2) total += toMin(times[i + 1]) - toMin(times[i]);
  return total;
}

export const formatHours = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
