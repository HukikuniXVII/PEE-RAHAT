import { PrismaClient } from "@prisma/client";
import { addDays, addHours } from "date-fns";

import { pricePayout } from "../src/payments/pricing";

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

  // ─── TCAS programs (FR-TC-02) ──────────────────────────────────────────
  // Each program's components live in a discriminated union:
  //   - type: "single" → one subject carries `weight`%
  //   - type: "chooseHighest" → group of options sharing `weight`%; the
  //     student's max score among them is what counts. Chula R3 row 043
  //     in the real PDF uses this with 4 science subjects sharing 80%.
  const tcasPrograms = [
    {
      university: "จุฬาลงกรณ์มหาวิทยาลัย",
      faculty: "คณะวิศวกรรมศาสตร์",
      major: "วิศวกรรมคอมพิวเตอร์",
      round: "r3_admission" as const,
      admissionYear: 2569,
      quotaSeats: 215,
      totalMinScore: 61.67,
      components: {
        gpaxMin: null,
        exams: [
          { type: "single" as const, system: "tgat", code: "", name: "TGAT", weight: 20, min: null },
          { type: "single" as const, system: "tpat", code: "30", name: "TPAT 3 วิทย์-เทคโนโลยี-วิศวะ", weight: 30, min: null },
          { type: "single" as const, system: "aLevel", code: "61", name: "คณิตศาสตร์ประยุกต์ 1", weight: 20, min: null },
          { type: "single" as const, system: "aLevel", code: "64", name: "ฟิสิกส์", weight: 20, min: null },
          { type: "single" as const, system: "aLevel", code: "65", name: "เคมี", weight: 10, min: null },
        ],
      },
      tags: ["Engineering", "Tech"],
    },
    {
      university: "มหาวิทยาลัยธรรมศาสตร์",
      faculty: "คณะแพทยศาสตร์",
      major: "แพทยศาสตรบัณฑิต",
      round: "r3_admission" as const,
      admissionYear: 2569,
      quotaSeats: 80,
      totalMinScore: 71.67,
      components: {
        gpaxMin: null,
        exams: [
          { type: "single" as const, system: "tpat", code: "10", name: "TPAT 1 กสพท.", weight: 30, min: null },
          { type: "single" as const, system: "aLevel", code: "61", name: "คณิตศาสตร์ประยุกต์ 1", weight: 14, min: null },
          { type: "single" as const, system: "aLevel", code: "82", name: "ภาษาอังกฤษ", weight: 14, min: null },
          { type: "single" as const, system: "aLevel", code: "64", name: "ฟิสิกส์", weight: 9.33, min: null },
          { type: "single" as const, system: "aLevel", code: "65", name: "เคมี", weight: 9.33, min: null },
          { type: "single" as const, system: "aLevel", code: "66", name: "ชีววิทยา", weight: 9.34, min: null },
          { type: "single" as const, system: "aLevel", code: "81", name: "ภาษาไทย", weight: 7, min: null },
          { type: "single" as const, system: "aLevel", code: "70", name: "สังคมศึกษา", weight: 7, min: null },
        ],
      },
      tags: ["Medicine", "Health"],
    },
    {
      university: "มหาวิทยาลัยขอนแก่น",
      faculty: "คณะวิศวกรรมศาสตร์",
      major: "วิศวกรรมดิจิทัล",
      round: "r3_admission" as const,
      admissionYear: 2569,
      quotaSeats: 50,
      totalMinScore: 50.67,
      components: {
        gpaxMin: null,
        exams: [
          { type: "single" as const, system: "tgat", code: "", name: "TGAT", weight: 20, min: null },
          { type: "single" as const, system: "tpat", code: "30", name: "TPAT 3 วิทย์-เทคโนโลยี-วิศวะ", weight: 40, min: null },
          { type: "single" as const, system: "aLevel", code: "61", name: "คณิตศาสตร์ประยุกต์ 1", weight: 20, min: null },
          { type: "single" as const, system: "aLevel", code: "82", name: "ภาษาอังกฤษ", weight: 20, min: null },
        ],
      },
      tags: ["Engineering", "Digital"],
    },
    // KKU NetSat (Round 2 quota) — demonstrates per-subject min + totalMinScore
    // gates that the calculator must surface independently.
    {
      university: "มหาวิทยาลัยขอนแก่น",
      faculty: "คณะวิศวกรรมศาสตร์",
      major: "วิศวกรรมคอมพิวเตอร์",
      programType: "ภาคปกติ",
      round: "r2_quota_kku_netsat" as const,
      admissionYear: 2569,
      quotaSeats: 30,
      totalMinScore: 30,
      sourceUrl:
        "https://apps.admissions.kku.ac.th/web/quota/detail/5524/13540",
      components: {
        gpaxMin: null,
        exams: [
          { type: "single" as const, system: "tpat", code: "30", name: "TPAT 3 วิทย์-เทคโนโลยี-วิศวะ", weight: 20, min: null },
          { type: "single" as const, system: "netsat", code: "102", name: "SAT1 ภาษาอังกฤษ", weight: 30, min: null },
          { type: "single" as const, system: "netsat", code: "103", name: "SAT1 คณิตศาสตร์", weight: 30, min: 20 },
          { type: "single" as const, system: "netsat", code: "204", name: "SAT2 ฟิสิกส์", weight: 20, min: 20 },
        ],
      },
      tags: ["Engineering", "Tech", "KKU"],
    },
    // Synthetic chooseHighest demo (mirrors Chula R3 row 043's pattern):
    // four science subjects share one 80% weight, with the student's
    // highest scorer carrying the group. Exercises the new component
    // shape end-to-end in the calculator.
    {
      university: "จุฬาลงกรณ์มหาวิทยาลัย",
      faculty: "คณะวิทยาศาสตร์",
      major: "หลักสูตรวิทยาศาสตรบัณฑิต (กลุ่ม chooseHighest)",
      round: "r3_admission" as const,
      admissionYear: 2569,
      quotaSeats: 60,
      totalMinScore: 55,
      components: {
        gpaxMin: null,
        exams: [
          { type: "single" as const, system: "tgat", code: "", name: "TGAT", weight: 20, min: null },
          {
            type: "chooseHighest" as const,
            weight: 80,
            min: null,
            options: [
              { system: "aLevel" as const, code: "61", name: "คณิตศาสตร์ประยุกต์ 1" },
              { system: "aLevel" as const, code: "64", name: "ฟิสิกส์" },
              { system: "aLevel" as const, code: "65", name: "เคมี" },
              { system: "aLevel" as const, code: "66", name: "ชีววิทยา" },
            ],
          },
        ],
      },
      tags: ["Science"],
    },
  ];
  // Prisma v5 doesn't allow nulls in compound unique-where, so we look the row
  // up by the non-null parts (university+major+round+year+programType) and
  // create-or-update by id. Seed only runs in dev — two queries is fine.
  for (const p of tcasPrograms) {
    const existing = await prisma.tcasProgram.findFirst({
      where: {
        university: p.university,
        major: p.major,
        round: p.round,
        admissionYear: p.admissionYear,
        programType: p.programType ?? null,
        subTrack: null,
      },
      select: { id: true },
    });
    const data = {
      university: p.university,
      campus: null,
      faculty: p.faculty,
      major: p.major,
      subTrack: null,
      programType: p.programType ?? null,
      round: p.round,
      admissionYear: p.admissionYear,
      quotaSeats: p.quotaSeats,
      components: p.components,
      totalMinScore: p.totalMinScore,
      tags: p.tags,
      sourceUrl: p.sourceUrl ?? null,
    };
    if (existing) {
      await prisma.tcasProgram.update({ where: { id: existing.id }, data });
    } else {
      await prisma.tcasProgram.create({ data });
    }
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

  // ─── Student + payment-flow scenarios ──────────────────────────────────
  const ning = await prisma.user.upsert({
    where: { email: "ning@example.com" },
    update: {},
    create: {
      supabaseId: "seed-ning",
      email: "ning@example.com",
      displayName: "น้องหนิง (Nong Ning)",
      role: "student",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ning",
      studentProfile: {
        create: { schoolGrade: "M.6", pdpaConsentAt: new Date() },
      },
    },
  });

  const nutTutorId = nut.tutorProfile!.id;
  const janeTutorId = jane.tutorProfile!.id;
  const now = new Date();

  // 5 bookings spanning every status the FR-PM-* + FR-TH-06 flows touch.
  // Time-sensitive fields are refreshed on each seed run so report windows
  // and accept deadlines stay realistic.
  const bookings = [
    {
      id: "seed-booking-1",
      tutorId: nutTutorId,
      subject: "Physics",
      status: "requested" as const,
      scheduledAt: addDays(now, 4),
      durationMinutes: 60,
      amountThb: 350,
      acceptDeadlineAt: addHours(now, 24),
      reportWindowEndsAt: null as Date | null,
    },
    {
      id: "seed-booking-2",
      tutorId: nutTutorId,
      subject: "Math",
      status: "accepted" as const,
      scheduledAt: addDays(now, 2),
      durationMinutes: 60,
      amountThb: 350,
      acceptDeadlineAt: addHours(now, -2),
      reportWindowEndsAt: null,
    },
    {
      id: "seed-booking-3",
      tutorId: janeTutorId,
      subject: "English",
      status: "paid" as const,
      scheduledAt: addHours(now, -1),
      durationMinutes: 60,
      amountThb: 400,
      acceptDeadlineAt: addHours(now, -36),
      reportWindowEndsAt: addHours(now, 12),
    },
    {
      id: "seed-booking-4",
      tutorId: nutTutorId,
      subject: "Physics",
      status: "completed" as const,
      scheduledAt: addDays(now, -7),
      durationMinutes: 60,
      amountThb: 350,
      acceptDeadlineAt: addDays(now, -8),
      reportWindowEndsAt: addDays(now, -6),
    },
    {
      id: "seed-booking-5",
      tutorId: janeTutorId,
      subject: "English",
      status: "reported" as const,
      scheduledAt: addDays(now, -1),
      durationMinutes: 60,
      amountThb: 400,
      acceptDeadlineAt: addDays(now, -2),
      reportWindowEndsAt: addHours(now, 6),
    },
  ];
  for (const b of bookings) {
    const { id, ...rest } = b;
    await prisma.booking.upsert({
      where: { id },
      update: {
        scheduledAt: rest.scheduledAt,
        acceptDeadlineAt: rest.acceptDeadlineAt,
        reportWindowEndsAt: rest.reportWindowEndsAt,
        status: rest.status,
      },
      create: { id, studentId: ning.id, ...rest },
    });
  }

  // ─── Payout first, then intents — so B4's intent can be linked to it ──
  // (FR-PM-06 + FR-PM-07). seed-pi-4 carries payoutId = seed-payout-1,
  // which makes it ineligible for re-counting on a second compute call —
  // that's the idempotency proof.
  const periodStart = addDays(now, -30);
  const periodEnd = now;
  const payoutPricing = pricePayout(350);
  await prisma.payout.upsert({
    where: { id: "seed-payout-1" },
    update: { periodStart, periodEnd, scheduledAt: periodEnd },
    create: {
      id: "seed-payout-1",
      tutorId: nutTutorId,
      periodStart,
      periodEnd,
      ...payoutPricing,
      scheduledAt: periodEnd,
    },
  });

  // PaymentIntents for B3 (held_in_escrow), B4 (released + linked to
  // seed-payout-1), B5 (disputed via admin freeze — FR-PM-05).
  const intents = [
    {
      id: "seed-pi-3",
      bookingId: "seed-booking-3",
      amountThb: 400,
      status: "held_in_escrow" as const,
      releasedAt: null as Date | null,
      expiresAt: addHours(now, 1),
      payoutId: null as string | null,
    },
    {
      id: "seed-pi-4",
      bookingId: "seed-booking-4",
      amountThb: 350,
      status: "released_for_payout" as const,
      releasedAt: addDays(now, -5),
      expiresAt: addDays(now, -8),
      payoutId: "seed-payout-1",
    },
    {
      id: "seed-pi-5",
      bookingId: "seed-booking-5",
      amountThb: 400,
      status: "disputed" as const,
      releasedAt: null,
      expiresAt: addDays(now, -1),
      payoutId: null,
    },
  ];
  for (const i of intents) {
    await prisma.paymentIntent.upsert({
      where: { id: i.id },
      update: {
        status: i.status,
        releasedAt: i.releasedAt,
        payoutId: i.payoutId,
      },
      create: {
        id: i.id,
        payerId: ning.id,
        itemType: "booking",
        bookingId: i.bookingId,
        amountThb: i.amountThb,
        promptPayQrPayload: `promptpay-stub:amount=${i.amountThb}`,
        status: i.status,
        releasedAt: i.releasedAt,
        expiresAt: i.expiresAt,
        payoutId: i.payoutId,
      },
    });
  }

  // ─── Community: post + 2 replies + 1 upvote + 1 report ─────────────────
  const post = await prisma.communityPost.upsert({
    where: { id: "seed-post-1" },
    update: {},
    create: {
      id: "seed-post-1",
      authorId: ning.id,
      title: "ใครเคยใช้สูตรลัดทำโจทย์ Projectile Motion บ้างคะ",
      content:
        "อยากได้เทคนิคจำสูตรเร็ว ๆ ค่ะ เหลือเวลาอีกนิดเดียวก่อนสอบ A-Level",
      upvoteCount: 1,
    },
  });
  await prisma.communityReply.upsert({
    where: { id: "seed-reply-1" },
    update: {},
    create: {
      id: "seed-reply-1",
      postId: post.id,
      authorId: nut.id,
      content:
        "ลองดู checklist 4 ขั้นตอน: แตกแกน x/y, หา v0x v0y, ใช้ t กลาง, แล้วค่อยกลับมาคิดระยะ",
    },
  });
  await prisma.communityReply.upsert({
    where: { id: "seed-reply-2" },
    update: {},
    create: {
      id: "seed-reply-2",
      postId: post.id,
      authorId: jane.id,
      content: "นอกเรื่องนิดนึง ใครเก่ง English พอแลกติว Physics กับเค้าได้บ้างคะ 😅",
    },
  });
  await prisma.postUpvote.upsert({
    where: { postId_userId: { postId: post.id, userId: nut.id } },
    update: {},
    create: { postId: post.id, userId: nut.id },
  });
  await prisma.report.upsert({
    where: { id: "seed-report-1" },
    update: {},
    create: {
      id: "seed-report-1",
      reporterId: jane.id,
      targetType: "reply",
      targetId: "seed-reply-2",
      reason: "off_topic",
      details: "Soliciting off-platform contact (FR-PM-08 spirit).",
    },
  });

  // ─── 3rd tutor with pending KYC (FR-TH-02) ─────────────────────────────
  const tin = await prisma.user.upsert({
    where: { email: "tin@example.com" },
    update: {},
    create: {
      supabaseId: "seed-tin",
      email: "tin@example.com",
      displayName: "พี่ติน (Pee Tin)",
      role: "tutor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tin",
      tutorProfile: {
        create: {
          bio: "นักศึกษาแพทย์ปี 4 รอตรวจเอกสารยืนยันตัวตน",
          university: "Mahidol University",
          faculty: "Medicine",
          subjects: ["Biology", "Chemistry"],
          hourlyRate: 500,
          isVerified: false,
        },
      },
    },
  });
  await prisma.kycSubmission.upsert({
    where: { id: "seed-kyc-1" },
    update: {},
    create: {
      id: "seed-kyc-1",
      userId: tin.id,
      idPhotoKey: "seed/kyc/tin-id.jpg",
      selfieKey: "seed/kyc/tin-selfie.jpg",
      transcriptKey: "seed/kyc/tin-transcript.pdf",
      status: "pending",
    },
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
