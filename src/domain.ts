export type Language = "en" | "es";
export type Service = "brakes" | "oil" | "tires" | "ac" | "diagnostic";
export type Status = "New" | "Contacted" | "Scheduled";
export interface Lead {
  id: string;
  name: string;
  contact: string;
  vehicle: string;
  service: Service;
  notes: string;
  language: Language;
  date: string;
  time: string;
  status: Status;
  createdAt: string;
  sample?: boolean;
}
export type Intake = Omit<Lead, "id" | "status" | "createdAt" | "sample">;
export const services: Record<Service, { en: string; es: string }> = {
  brakes: { en: "Brake service", es: "Servicio de frenos" },
  oil: { en: "Oil change", es: "Cambio de aceite" },
  tires: { en: "Tires & alignment", es: "Llantas y alineación" },
  ac: { en: "A/C service", es: "Servicio de aire" },
  diagnostic: { en: "General inspection", es: "Inspección general" },
};
export function miamiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function nextDay(offset = 1) {
  const d = new Date(miamiToday() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function validateIntake(
  data: Intake,
  today = miamiToday(),
): string | null {
  if (data.name.trim().length < 2 || data.name.length > 80) return "name";
  if (
    !(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) ||
      (/^[+()\d\s.-]+$/.test(data.contact) &&
        data.contact.replace(/\D/g, "").length >= 10 &&
        data.contact.replace(/\D/g, "").length <= 15)
    ) ||
    data.contact.length > 160
  )
    return "contact";
  if (data.vehicle.trim().length < 3 || data.vehicle.length > 100)
    return "vehicle";
  if (!Object.hasOwn(services, data.service)) return "service";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    !Number.isFinite(Date.parse(data.date)) ||
    new Date(data.date).toISOString().slice(0, 10) !== data.date ||
    data.date <= today
  )
    return "date";
  if (!["Morning", "Afternoon"].includes(data.time)) return "time";
  if (!["en", "es"].includes(data.language) || data.notes.length > 1000)
    return "notes";
  return null;
}
export function seedLeads(): Lead[] {
  return [
    {
      id: "sample-1",
      name: "Sofia Rivera",
      contact: "sofia@example.com",
      vehicle: "2021 Honda Civic",
      service: "brakes",
      notes: "Squeaking when braking. Prefers Spanish.",
      language: "es",
      date: nextDay(),
      time: "Morning",
      status: "New",
      createdAt: new Date().toISOString(),
      sample: true,
    },
    {
      id: "sample-2",
      name: "Daniel Brooks",
      contact: "daniel@example.com",
      vehicle: "2020 Toyota Camry",
      service: "oil",
      notes: "Routine maintenance.",
      language: "en",
      date: nextDay(),
      time: "Afternoon",
      status: "Contacted",
      createdAt: new Date().toISOString(),
      sample: true,
    },
    {
      id: "sample-3",
      name: "Mateo Santos",
      contact: "mateo@example.com",
      vehicle: "2019 Ford F-150",
      service: "ac",
      notes: "Air is not cooling.",
      language: "es",
      date: nextDay(2),
      time: "Morning",
      status: "New",
      createdAt: new Date().toISOString(),
      sample: true,
    },
    {
      id: "sample-4",
      name: "Emma Wilson",
      contact: "emma@example.com",
      vehicle: "2022 Hyundai Tucson",
      service: "tires",
      notes: "Rotation and alignment.",
      language: "en",
      date: nextDay(3),
      time: "Afternoon",
      status: "Scheduled",
      createdAt: new Date().toISOString(),
      sample: true,
    },
  ];
}
