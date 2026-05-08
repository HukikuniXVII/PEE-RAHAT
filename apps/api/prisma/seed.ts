import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  // ─── Users + Tutor profiles ─────────────────────────────────────────────
  const nut = await prisma.user.upsert({
    where: { email: "nut@example.com" },
    update: {},
    create: {
      supabaseId: "seed-nut",
      email: "nut@example.com",
      displayName: "พี่นัท (Pee Nut)",
      role: "tutor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nut",
      tutorProfile: {
        create: {
          bio: "เหรียญทองโอลิมปิกฟิสิกส์ สรุปเนื้อหาเข้าใจง่าย เน้นเทคนิคทำโจทย์ไว",
          university: "Chulalongkorn University",
          faculty: "Engineering",
          subjects: ["Physics", "Math"],
          hourlyRate: 350,
          rating: 4.9,
          reviewCount: 12,
          isVerified: true,
        },
      },
    },
    include: { tutorProfile: true },
  });

  const jane = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      supabaseId: "seed-jane",
      email: "jane@example.com",
      displayName: "พี่เจน (Khun Jane)",
      role: "tutor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
      tutorProfile: {
        create: {
          bio: "สอนภาษาอังกฤษสนุก ไม่น่าเบื่อ เน้นการใช้จริงและเทคนิคตัดช้อยส์ TGAT",
          university: "Chulalongkorn University",
          faculty: "Arts",
          subjects: ["English"],
          hourlyRate: 400,
          rating: 4.8,
          reviewCount: 9,
          isVerified: true,
        },
      },
    },
    include: { tutorProfile: true },
  });

  // ─── Sheets ─────────────────────────────────────────────────────────────
  if (nut.tutorProfile) {
    await prisma.studySheet.upsert({
      where: { id: "seed-sheet-1" },
      update: {},
      create: {
        id: "seed-sheet-1",
        sellerId: nut.tutorProfile.id,
        title: "สรุปสูตรฟิสิกส์ A-Level (ฉบับรวบรัด)",
        description: "สูตรครบทุกบท พร้อมเทคนิคพลิกแพลง",
        subject: "Physics",
        priceThb: 150,
        rating: 4.9,
        pdfObjectKey: "seed/physics-a-level.pdf",
        previewImageObjectKeys: [],
        pageCount: 24,
      },
    });
  }
  if (jane.tutorProfile) {
    await prisma.studySheet.upsert({
      where: { id: "seed-sheet-2" },
      update: {},
      create: {
        id: "seed-sheet-2",
        sellerId: jane.tutorProfile.id,
        title: "TGAT English Vocabulary Checklist",
        description: "Vocab ที่ออกซ้ำในข้อสอบ TGAT 5 ปีย้อนหลัง",
        subject: "English",
        priceThb: 99,
        rating: 4.7,
        pdfObjectKey: "seed/tgat-vocab.pdf",
        previewImageObjectKeys: [],
        pageCount: 18,
      },
    });
  }

  // ─── TCAS programs ──────────────────────────────────────────────────────
  const programs = [
    {
      university: "Chulalongkorn University",
      faculty: "Engineering",
      major: "Computer Engineering",
      round: "3",
      minScore: 61.67,
      weights: { tGat: 20, tPat3: 30, aLevelMath1: 20, aLevelPhy: 20, aLevelChe: 10 },
      tags: ["Engineering", "Tech"],
    },
    {
      university: "Thammasat University",
      faculty: "Medicine",
      major: "Medicine",
      round: "3",
      minScore: 71.67,
      weights: {
        tPat1: 30,
        aLevelMath1: 14,
        aLevelEng: 14,
        aLevelPhy: 9.33,
        aLevelChe: 9.33,
        aLevelBio: 9.34,
        aLevelThai: 7,
        aLevelSoc: 7,
      },
      tags: ["Medicine", "Health"],
    },
    {
      university: "Khon Kaen University",
      faculty: "Engineering",
      major: "Digital Engineering",
      round: "3",
      minScore: 50.67,
      weights: { tGat: 20, tPat3: 40, aLevelMath1: 20, aLevelEng: 20 },
      tags: ["Engineering", "Digital"],
    },
  ];
  for (const p of programs) {
    await prisma.tcasProgram.upsert({
      where: {
        university_major_round: {
          university: p.university,
          major: p.major,
          round: p.round,
        },
      },
      update: {},
      create: p,
    });
  }

  await prisma.tcasDeadline.createMany({
    data: [
      { title: "TGAT/TPAT Registration", date: new Date("2026-11-01"), type: "registration" },
      { title: "TGAT/TPAT Exam Day", date: new Date("2026-12-15"), type: "exam" },
      { title: "A-Level Registration", date: new Date("2027-02-01"), type: "registration" },
      { title: "Score Announcement", date: new Date("2027-04-15"), type: "announcement" },
    ],
    skipDuplicates: true,
  });

  // ─── Quiz questions ─────────────────────────────────────────────────────
  await prisma.quizQuestion.createMany({
    data: [
      {
        subject: "Physics",
        topic: "Newtonian Mechanics",
        question: "กฎข้อที่ 1 ของนิวตัน (Newton's First Law) กล่าวถึงเรื่องใด?",
        options: ["ความสมดุลและความเฉื่อย", "แรงเสียดทาน", "แรงดึงดูดระหว่างมวล", "โมเมนตัม"],
        correctIndex: 0,
      },
      {
        subject: "Math",
        topic: "Calculus",
        question: "อนุพันธ์ของ f(x) = x^2 คืออะไร?",
        options: ["x", "2x", "x/2", "2"],
        correctIndex: 1,
      },
      {
        subject: "English",
        topic: "Vocabulary",
        question: "Which word is a synonym for 'Abundant'?",
        options: ["Scarce", "Plentiful", "Rare", "Limited"],
        correctIndex: 1,
      },
    ],
    skipDuplicates: true,
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete");
}

seed()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
