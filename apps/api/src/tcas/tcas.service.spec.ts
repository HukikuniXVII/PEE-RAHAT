import { NotFoundException } from "@nestjs/common";
import type { ProgramComponents } from "@peerahat/types";

import { TcasService } from "./tcas.service";

// Minimal fake of the Prisma slice TcasService touches. Returning the same
// program from findUnique and an empty array from findMany is enough to
// exercise whatIf's scoring math without spinning up the DB.
function makePrisma(program: {
  id: string;
  university: string;
  tags: string[];
  totalMinScore: number | null;
  components: ProgramComponents;
}) {
  return {
    tcasProgram: {
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) =>
        id === program.id
          ? {
              id: program.id,
              university: program.university,
              tags: program.tags,
              totalMinScore: program.totalMinScore,
              components: program.components,
              round: "r3_admission",
              admissionYear: 2569,
            }
          : null,
      ),
      findMany: jest.fn(async () => []),
    },
    tcasDeadline: { findMany: jest.fn() },
  };
}

describe("TcasService.whatIf — discriminated component union", () => {
  it("scores a 'single'-only program as before", async () => {
    const components: ProgramComponents = {
      gpaxMin: null,
      exams: [
        {
          type: "single",
          system: "tgat",
          code: "",
          name: "TGAT",
          weight: 30,
          min: null,
        },
        {
          type: "single",
          system: "aLevel",
          code: "61",
          name: "Math1",
          weight: 70,
          min: null,
        },
      ],
    };
    const prisma = makePrisma({
      id: "p1",
      university: "U",
      tags: [],
      totalMinScore: 50,
      components,
    });
    const svc = new TcasService(prisma as never);

    const result = await svc.whatIf("p1", { tgat: 80, "aLevel:61": 60 });
    // 80*0.30 + 60*0.70 = 24 + 42 = 66
    expect(result.weightedAverage).toBeCloseTo(66);
    expect(result.isOnTrack).toBe(true);
    expect(result.meetsTotalMin).toBe(true);
  });

  it("picks the highest-scoring option for a chooseHighest group", async () => {
    const components: ProgramComponents = {
      gpaxMin: null,
      exams: [
        {
          type: "single",
          system: "tgat",
          code: "",
          name: "TGAT",
          weight: 20,
          min: null,
        },
        {
          type: "chooseHighest",
          weight: 80,
          min: null,
          options: [
            { system: "aLevel", code: "61", name: "Math1" },
            { system: "aLevel", code: "64", name: "Physics" },
            { system: "aLevel", code: "65", name: "Chemistry" },
            { system: "aLevel", code: "66", name: "Biology" },
          ],
        },
      ],
    };
    const prisma = makePrisma({
      id: "p2",
      university: "U",
      tags: [],
      totalMinScore: 50,
      components,
    });
    const svc = new TcasService(prisma as never);

    // Student is mediocre at Math1 (50) but great at Biology (90).
    // The group should pick Biology → 90*0.80 + 50*0.20 = 72 + 10 = 82.
    const result = await svc.whatIf("p2", {
      tgat: 50,
      "aLevel:61": 50,
      "aLevel:64": 40,
      "aLevel:65": 60,
      "aLevel:66": 90,
    });
    expect(result.weightedAverage).toBeCloseTo(82);
    expect(result.isOnTrack).toBe(true);
  });

  it("enforces chooseHighest.min against the BEST option", async () => {
    const components: ProgramComponents = {
      gpaxMin: null,
      exams: [
        {
          type: "single",
          system: "tgat",
          code: "",
          name: "TGAT",
          weight: 20,
          min: null,
        },
        {
          type: "chooseHighest",
          weight: 80,
          min: 70, // best option must clear 70
          options: [
            { system: "aLevel", code: "64", name: "Physics" },
            { system: "aLevel", code: "65", name: "Chemistry" },
          ],
        },
      ],
    };
    const prisma = makePrisma({
      id: "p3",
      university: "U",
      tags: [],
      totalMinScore: null,
      components,
    });
    const svc = new TcasService(prisma as never);

    // Best option scored 65 — under 70 → group fails its min.
    const result = await svc.whatIf("p3", {
      tgat: 80,
      "aLevel:64": 65,
      "aLevel:65": 40,
    });
    expect(result.failedPerSubjectMins).toHaveLength(1);
    expect(result.failedPerSubjectMins[0]).toMatchObject({
      name: "Physics", // the best option's identity
      need: 70,
      have: 65,
    });
    expect(result.isOnTrack).toBe(false);
  });

  it("surfaces groupOptions on the subject gap for a chooseHighest group", async () => {
    const components: ProgramComponents = {
      gpaxMin: null,
      exams: [
        {
          type: "chooseHighest",
          weight: 100,
          min: null,
          options: [
            { system: "aLevel", code: "64", name: "Physics" },
            { system: "aLevel", code: "65", name: "Chemistry" },
          ],
        },
      ],
    };
    const prisma = makePrisma({
      id: "p4",
      university: "U",
      tags: [],
      totalMinScore: 80,
      components,
    });
    const svc = new TcasService(prisma as never);

    // Best option scored 50 → weighted = 50 < 80, so we get a gap.
    const result = await svc.whatIf("p4", {
      "aLevel:64": 50,
      "aLevel:65": 30,
    });
    expect(result.subjectGaps).toHaveLength(1);
    expect(result.subjectGaps[0]?.groupOptions).toEqual([
      { system: "aLevel", code: "64", name: "Physics" },
      { system: "aLevel", code: "65", name: "Chemistry" },
    ]);
    expect(result.subjectGaps[0]?.name).toBe("Physics"); // current winner
  });

  it("404s on unknown programId", async () => {
    const prisma = makePrisma({
      id: "p5",
      university: "U",
      tags: [],
      totalMinScore: null,
      components: { gpaxMin: null, exams: [] },
    });
    const svc = new TcasService(prisma as never);
    await expect(svc.whatIf("missing", {})).rejects.toThrow(NotFoundException);
  });
});
