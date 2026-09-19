import { describe, it, expect } from "vitest";
import { validateIntake, type Intake } from "./domain";
import { understandRequest } from "./agents/receptionist";
import { captureRequest } from "./agents/manager";
import { summarize } from "./agents/analytics";
import { createLocalRepository, STORAGE_KEY } from "./integrations/local-leads";
const good: Intake = {
  name: "Alex Demo",
  contact: "alex@example.com",
  vehicle: "2020 Honda Accord",
  service: "brakes",
  notes: "Fictional request",
  language: "es",
  date: "2099-12-01",
  time: "Morning",
};
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
describe("receptionist language and service intake", () => {
  it("recognizes mixed Spanish and English", () =>
    expect(
      understandRequest("Hola, necesito brakes para mi Honda Accord"),
    ).toMatchObject({
      language: "es",
      service: "brakes",
      vehicle: "Honda Accord",
    }));
  it("recognizes English oil change", () =>
    expect(
      understandRequest("Oil change for a 2021 Toyota Camry"),
    ).toMatchObject({
      language: "en",
      service: "oil",
      vehicle: "2021 Toyota Camry",
    }));
  it("falls back to inspection for unknown issues", () =>
    expect(understandRequest("There is a strange noise")).toMatchObject({
      service: "diagnostic",
    }));
  it("detects Spanish air conditioning requests", () =>
    expect(understandRequest("El aire no funciona")).toMatchObject({
      language: "es",
      service: "ac",
    }));
});
describe("request boundaries", () => {
  it("accepts valid fictional data", () =>
    expect(validateIntake(good)).toBeNull());
  it.each([
    ["contact", "invalid"],
    ["contact", "123"],
    ["name", " "],
    ["vehicle", "x"],
    ["date", "2020-01-01"],
    ["date", "2099-02-30"],
    ["time", "Midnight"],
    ["service", "unsupported"],
  ])("rejects invalid %s", (key, value) =>
    expect(validateIntake({ ...good, [key]: value })).toBe(key),
  );
  it("rejects same-day requests", () =>
    expect(validateIntake({ ...good, date: "2099-12-01" }, "2099-12-01")).toBe(
      "date",
    ));
  it("accepts a US phone", () =>
    expect(validateIntake({ ...good, contact: "(305) 555-0100" })).toBeNull());
});
describe("manager and repository", () => {
  it("persists requests across repository instances and keeps sample labels separate", () => {
    const memory = storage();
    const repo = createLocalRepository(memory);
    const lead = captureRequest(good, repo);
    const restored = createLocalRepository(memory).list();
    expect(restored).toHaveLength(5);
    expect(restored[0]).toEqual(lead);
    expect(lead.sample).toBeUndefined();
    expect(lead.status).toBe("New");
    expect(summarize(restored).open).toBe(3);
  });
  it("does not write an invalid request", () => {
    const memory = storage();
    expect(() =>
      captureRequest(
        { ...good, contact: "bad" },
        createLocalRepository(memory),
      ),
    ).toThrow("contact");
    expect(memory.getItem(STORAGE_KEY)).toBeNull();
  });
  it("surfaces failed writes rather than claiming success", () => {
    const memory = {
      getItem: () => "[]",
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => captureRequest(good, createLocalRepository(memory))).toThrow(
      "quota",
    );
  });
  it("preserves corrupt data for explicit recovery", () => {
    const memory = storage();
    memory.setItem(STORAGE_KEY, "bad json");
    expect(() => createLocalRepository(memory).list()).toThrow();
    expect(memory.getItem(STORAGE_KEY)).toBe("bad json");
  });
  it("rejects structurally invalid stored records", () => {
    const memory = storage();
    memory.setItem(STORAGE_KEY, '[{"name":"bad"}]');
    expect(() => createLocalRepository(memory).list()).toThrow(
      "Invalid saved data",
    );
  });
  it("persists status changes without duplication", () => {
    const repo = createLocalRepository(storage());
    const lead = captureRequest(good, repo);
    repo.replace(
      repo
        .list()
        .map((l) => (l.id === lead.id ? { ...l, status: "Contacted" } : l)),
    );
    expect(repo.list()[0].status).toBe("Contacted");
    expect(repo.list()).toHaveLength(5);
  });
});
