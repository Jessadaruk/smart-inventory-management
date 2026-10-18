export const money = (satang: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(
    satang / 100,
  );
export const dateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
export const movementName = (type: string) =>
  ({ IN: "รับเข้า", OUT: "เบิกออก", ADJUST: "ปรับยอด" })[
    type as "IN" | "OUT" | "ADJUST"
  ] ?? type;
