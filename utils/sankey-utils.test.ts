import { describe, it, expect } from "vitest";
import { getEncodedData } from "./sankey-utils";
import { DEFAULT_SETTINGS } from "./constants";
import type { EncodingMap, RowData } from "./tableau-utils";

// Minimal Field stub — only `name` is used by getEncodedData
function field(name: string): any {
  return { name, id: name, description: undefined };
}

function cell(value: string | null) {
  return { value, formattedValue: value, nativeValue: value };
}

function makeRow(
  tupleId: number,
  fields: Record<string, string | null>,
): RowData {
  const row: any = { tupleId };
  for (const [k, v] of Object.entries(fields)) {
    row[k] = cell(v);
  }
  return row;
}

const dropoffSettings = { ...DEFAULT_SETTINGS, sankeyType: "dropoff" as const };

// ─── Helpers ───────────────────────────────────────────────────────────

function getDropoffNodes(result: ReturnType<typeof getEncodedData>) {
  return result.nodes.filter((n) => n.id.startsWith("dropoff-"));
}

function getDropoffLinks(result: ReturnType<typeof getEncodedData>) {
  return result.links.filter((l) => {
    const targetId = typeof l.target === "string" ? l.target : l.target.id;
    return targetId.startsWith("dropoff-");
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe("drop-off sankey", () => {
  describe("3 stages: drop-off from stage 1 (second stage)", () => {
    // Data: A → X → P (100), A → X → null (50)
    // X has 150 incoming but only 100 outgoing → 50 drop-off
    const encoding: EncodingMap = {
      level: [field("S1"), field("S2"), field("S3")],
      edge: [field("Value")],
    };

    const data: RowData[] = [
      makeRow(1, { S1: "A", S2: "X", S3: "P", Value: "100" }),
      makeRow(2, { S1: "A", S2: "X", S3: null, Value: "50" }),
    ];

    it("creates a drop-off node from stage 1", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffs = getDropoffNodes(result);

      expect(dropoffs.length).toBeGreaterThanOrEqual(1);

      const xDropoff = dropoffs.find((n) => n.name.includes("X"));
      expect(xDropoff).toBeDefined();
      expect(xDropoff!.layer).toBe(2); // placed after stage 1
    });

    it("drop-off link has correct value (50)", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffLinks = getDropoffLinks(result);

      const xLink = dropoffLinks.find((l) => {
        const targetId = typeof l.target === "string" ? l.target : l.target.id;
        return targetId.includes("X");
      });
      expect(xLink).toBeDefined();
      expect(xLink!.value).toBe(50);
    });
  });

  describe("3 stages: drop-off from stage 0 (first stage)", () => {
    // Data: A → X → P (100), A → null → null (50)
    // Row 2: in dropoff mode, source A at stage 0 is valid but target at stage 1 is null → break
    // So row 2 contributes 50 to A's total but no outgoing flow is created
    // A should have a drop-off of 50
    const encoding: EncodingMap = {
      level: [field("S1"), field("S2"), field("S3")],
      edge: [field("Value")],
    };

    const data: RowData[] = [
      makeRow(1, { S1: "A", S2: "X", S3: "P", Value: "100" }),
      makeRow(2, { S1: "A", S2: null, S3: null, Value: "50" }),
    ];

    it("creates a drop-off node from stage 0", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffs = getDropoffNodes(result);

      const aDropoff = dropoffs.find((n) => n.name.includes("A"));
      expect(aDropoff).toBeDefined();
      expect(aDropoff!.layer).toBe(1); // placed after stage 0
    });

    it("drop-off link has correct value (50)", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffLinks = getDropoffLinks(result);

      const aLink = dropoffLinks.find((l) => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id;
        return sourceId === "0-A";
      });
      expect(aLink).toBeDefined();
      expect(aLink!.value).toBe(50);
    });
  });

  describe("2 stages: drop-off should work", () => {
    // With only 2 stages, if A → X (100) and A → null (50),
    // A should show a drop-off of 50
    const encoding: EncodingMap = {
      level: [field("S1"), field("S2")],
      edge: [field("Value")],
    };

    const data: RowData[] = [
      makeRow(1, { S1: "A", S2: "X", Value: "100" }),
      makeRow(2, { S1: "A", S2: null, Value: "50" }),
    ];

    it("creates a drop-off node from the first stage", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffs = getDropoffNodes(result);

      const aDropoff = dropoffs.find((n) => n.name.includes("A"));
      expect(aDropoff).toBeDefined();
      expect(aDropoff!.layer).toBe(1);
    });

    it("drop-off has value 50", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffLinks = getDropoffLinks(result);

      const aLink = dropoffLinks.find((l) => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id;
        return sourceId === "0-A";
      });
      expect(aLink).toBeDefined();
      expect(aLink!.value).toBe(50);
    });
  });

  describe("no drop-off when all value is preserved", () => {
    const encoding: EncodingMap = {
      level: [field("S1"), field("S2"), field("S3")],
      edge: [field("Value")],
    };

    const data: RowData[] = [
      makeRow(1, { S1: "A", S2: "X", S3: "P", Value: "100" }),
      makeRow(2, { S1: "A", S2: "Y", S3: "Q", Value: "50" }),
    ];

    it("creates no drop-off nodes", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffs = getDropoffNodes(result);
      expect(dropoffs).toHaveLength(0);
    });
  });

  describe("multiple nodes with drop-off at different stages", () => {
    // Stage 0: A, B
    // Stage 1: X
    // Stage 2: P
    // A → X → P (100), A → X → null (30), B → null → null (50)
    // Expected: B drops 50 at stage 0→1, X drops 30 at stage 1→2
    const encoding: EncodingMap = {
      level: [field("S1"), field("S2"), field("S3")],
      edge: [field("Value")],
    };

    const data: RowData[] = [
      makeRow(1, { S1: "A", S2: "X", S3: "P", Value: "100" }),
      makeRow(2, { S1: "A", S2: "X", S3: null, Value: "30" }),
      makeRow(3, { S1: "B", S2: null, S3: null, Value: "50" }),
    ];

    it("creates drop-off from both stage 0 (B) and stage 1 (X)", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffs = getDropoffNodes(result);

      const bDropoff = dropoffs.find((n) => n.name.includes("B"));
      const xDropoff = dropoffs.find((n) => n.name.includes("X"));

      expect(bDropoff).toBeDefined();
      expect(bDropoff!.layer).toBe(1);

      expect(xDropoff).toBeDefined();
      expect(xDropoff!.layer).toBe(2);
    });

    it("drop-off values are correct", () => {
      const result = getEncodedData(data, encoding, dropoffSettings);
      const dropoffLinks = getDropoffLinks(result);

      const bLink = dropoffLinks.find((l) => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id;
        return sourceId === "0-B";
      });
      const xLink = dropoffLinks.find((l) => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id;
        return sourceId === "1-X";
      });

      expect(bLink).toBeDefined();
      expect(bLink!.value).toBe(50);

      expect(xLink).toBeDefined();
      expect(xLink!.value).toBe(30);
    });
  });
});
