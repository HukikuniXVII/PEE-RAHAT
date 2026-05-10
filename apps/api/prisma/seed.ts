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

  // PaymentIntents for B3 (held_in_escrow), B4 (released, within payout
  // window), B5 (disputed via admin freeze — FR-PM-05).
  const intents = [
    {
      id: "seed-pi-3",
      bookingId: "seed-booking-3",
      amountThb: 400,
      status: "held_in_escrow" as const,
      releasedAt: null as Date | null,
      expiresAt: addHours(now, 1),
    },
    {
      id: "seed-pi-4",
      bookingId: "seed-booking-4",
      amountThb: 350,
      status: "released" as const,
      releasedAt: addDays(now, -5),
      expiresAt: addDays(now, -8),
    },
    {
      id: "seed-pi-5",
      bookingId: "seed-booking-5",
      amountThb: 400,
      status: "disputed" as const,
      releasedAt: null,
      expiresAt: addDays(now, -1),
    },
  ];
  for (const i of intents) {
    await prisma.paymentIntent.upsert({
      where: { id: i.id },
      update: { status: i.status, releasedAt: i.releasedAt },
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
      },
    });
  }

  // ─── Payout for the released intent (FR-PM-06 + FR-PM-07) ──────────────
  // Picks up B4 only (B3 still held, B5 disputed, B1/B2 no intent).
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
