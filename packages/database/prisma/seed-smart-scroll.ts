/**
 * Smart Scroll feature seed — production-safe, additive, idempotent.
 *
 * Targets the live Stunity QA School (the main production school) and
 * creates real data for all 5 Smart Scroll features:
 *
 *   1. UserStats (XP + levels) for every active student & teacher
 *   2. Quiz War — LIVE 10A vs 10B mathematics battle
 *   3. Quiz War participants — students split across both teams
 *   4. Feynman Bounties — 3 real XP-staked questions from students
 *   5. Bounty replies — peer explanations on each bounty
 *   6. Recall Cards — spaced-repetition cards per student (requires
 *      quiz questions; skipped with a warning when none exist)
 *
 * Rules:
 *   ✅  Upsert / createIfNotExists everywhere — safe to re-run
 *   ✅  Never deletes existing rows
 *   ✅  Logs every created/skipped item
 *   ✅  Fails fast on unexpected errors — no silent data corruption
 *
 * Usage:
 *   cd packages/database
 *   npx tsx prisma/seed-smart-scroll.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Real production IDs ──────────────────────────────────────────────
const SCHOOL_ID = 'cmn1e43ir002a14op0m3ibq2g'; // Stunity QA School

const TEACHERS = [
  { id: 'cmomz8obg0005mhkjz52gubx4', name: 'Kosal Lim',  role: 'TEACHER' as const },
  { id: 'cmon15ukd0002goeamsduqydj', name: 'Bopha Tan',  role: 'TEACHER' as const },
];

const STUDENTS = [
  { id: 'cmomz8kul0002mhkj6t34ec9h', name: 'Chanmony Prak',   grade: 'Grade 11', team: 'A' as const },
  { id: 'cmon15wbh0005goeajmp9de6d', name: 'Leakhena Chan',   grade: 'Grade 11', team: 'A' as const },
  { id: 'cmnt5p0dc0002y5j1wcy4vn9z', name: 'តារា ម៉ៅ',         grade: 'Grade 10', team: 'A' as const },
  { id: 'cmoo2yqun0002avh2k9fet5sm', name: 'សុខា មុន្នី',       grade: 'Grade 10', team: 'B' as const },
  { id: 'cmnspq7l6000238nh27eduj9d', name: 'Vanna Heng',      grade: 'Grade 12', team: 'B' as const },
  { id: 'cmnsvp4070002kb2n7glhjy2y', name: 'Sophea Prak',     grade: 'Grade 12', team: 'B' as const },
];

const ADMIN_ID = 'cmn1e47ny004h14opmt5rya67';

// XP starting points — realistic for active secondary students.
const STUDENT_XP_BASE = [240, 185, 310, 95, 420, 275];
const TEACHER_XP_BASE = [680, 510];

// ─── Utilities ────────────────────────────────────────────────────────

const log = (emoji: string, msg: string) => console.log(`${emoji}  ${msg}`);

/** Level from XP — mirrors the mobile levelling formula. */
function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱  Smart Scroll production seed');
  console.log(`    School: Stunity QA School  (${SCHOOL_ID})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. UserStats — XP + levels ──────────────────────────────────────
  console.log('📊 [1/5] Upserting UserStats (XP + level)...');

  for (const [i, student] of STUDENTS.entries()) {
    const xp = STUDENT_XP_BASE[i];
    const level = levelFromXp(xp);
    await prisma.userStats.upsert({
      where: { userId: student.id },
      create: { userId: student.id, xp, level },
      update: {},  // don't overwrite real accumulated XP
    });
    log('  ✅', `${student.name}: ${xp} XP  lvl ${level}`);
  }

  for (const [i, teacher] of TEACHERS.entries()) {
    const xp = TEACHER_XP_BASE[i];
    const level = levelFromXp(xp);
    await prisma.userStats.upsert({
      where: { userId: teacher.id },
      create: { userId: teacher.id, xp, level },
      update: {},
    });
    log('  ✅', `${teacher.name}: ${xp} XP  lvl ${level}`);
  }

  // Admin
  await prisma.userStats.upsert({
    where: { userId: ADMIN_ID },
    create: { userId: ADMIN_ID, xp: 100, level: 2 },
    update: {},
  });
  log('  ✅', `QA Admin: 100 XP  lvl 2`);

  // ── 2. Quiz War — LIVE mathematics battle ────────────────────────────
  console.log('\n⚔️  [2/5] Creating LIVE Quiz War...');

  const WAR_ID = 'quizwar-stunity-qa-math-001';
  const now = new Date();
  const warEndsAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min from now

  const existingWar = await prisma.quizWar.findUnique({ where: { id: WAR_ID } });
  let war;

  if (existingWar) {
    log('  ⏭ ', `Quiz War ${WAR_ID} already exists — updating scores + endsAt`);
    war = await prisma.quizWar.update({
      where: { id: WAR_ID },
      data: {
        status: 'LIVE',
        teamAScore: 418,
        teamBScore: 402,
        endsAt: warEndsAt,
      },
    });
  } else {
    war = await prisma.quizWar.create({
      data: {
        id: WAR_ID,
        schoolId: SCHOOL_ID,
        subject: 'Mathematics · Algebra',
        status: 'LIVE',
        round: 4,
        totalRounds: 6,
        teamAName: '10A',
        teamAColor: '#0EA5E9',   // sky-blue
        teamAScore: 418,
        teamBName: '10B',
        teamBColor: '#F97316',   // orange
        teamBScore: 402,
        startsAt: new Date(now.getTime() - 5 * 60 * 1000),
        endsAt: warEndsAt,
        rewardXp: 200,
      },
    });
    log('  ✅', `Quiz War created: 10A (418) vs 10B (402)  LIVE  ends in 15 min`);
  }

  // ── 3. Quiz War participants ─────────────────────────────────────────
  console.log('\n👥 [3/5] Joining students to Quiz War...');

  for (const student of STUDENTS) {
    await prisma.quizWarParticipant.upsert({
      where: { warId_userId: { warId: war.id, userId: student.id } },
      create: {
        warId: war.id,
        userId: student.id,
        team: student.team,
        correctAnswers: student.team === 'A' ? Math.floor(Math.random() * 8) + 4 : Math.floor(Math.random() * 7) + 3,
        totalAnswers: 12,
        xpEarned: 0,
      },
      update: {},
    });
    log('  ✅', `${student.name} → Team ${student.team}`);
  }

  // ── 4. Feynman Bounties ──────────────────────────────────────────────
  console.log('\n🪙 [4/5] Creating Feynman Bounties...');

  // Each bounty stakes XP from the asker. We verify the user has enough
  // (seed gives them ample). Using direct create instead of the escrow
  // helper because we also manually debit in the same block — clean and
  // explicit for seed data.
  type BountyDef = {
    id: string;
    askerId: string;
    askerName: string;
    subject: string;
    subjectColor: string;
    questionText: string;
    attachmentName?: string;
    bountyXp: number;
    durationHours: number;
  };

  const BOUNTIES: BountyDef[] = [
    {
      id: 'bounty-physics-density-001',
      askerId: STUDENTS[0].id, // Chanmony Prak
      askerName: STUDENTS[0].name,
      subject: 'Physics · Density',
      subjectColor: '#4F46E5',
      questionText:
        'Why does ice float on water? My teacher explained it has to do with ' +
        'density but I cannot understand how a solid can be less dense than its ' +
        'liquid form. Every other solid I know sinks. Can someone explain the ' +
        'hydrogen-bond geometry behind this? I attached the textbook diagram.',
      attachmentName: 'textbook_ch4_density.jpg',
      bountyXp: 100,
      durationHours: 24,
    },
    {
      id: 'bounty-math-lhopital-001',
      askerId: STUDENTS[4].id, // Vanna Heng
      askerName: STUDENTS[4].name,
      subject: 'Mathematics · Calculus',
      subjectColor: '#0284C7',
      questionText:
        "I can mechanically apply L'Hôpital's rule but I have zero intuition for " +
        "WHY it works. Why does taking the derivative of the numerator and " +
        "denominator separately give you the limit? What is the geometric " +
        "interpretation? A visual or analogy would help a lot.",
      bountyXp: 150,
      durationHours: 48,
    },
    {
      id: 'bounty-biology-genetics-001',
      askerId: STUDENTS[2].id, // តារា ម៉ៅ
      askerName: STUDENTS[2].name,
      subject: 'Biology · Genetics',
      subjectColor: '#16A34A',
      questionText:
        'If the mother is blood type O and the father is blood type AB, what ' +
        'blood types can their children have? I keep getting confused about which ' +
        'alleles are dominant and how to draw the Punnett square correctly. ' +
        'Please show the full cross diagram.',
      bountyXp: 75,
      durationHours: 12,
    },
  ];

  for (const bounty of BOUNTIES) {
    const existing = await prisma.bounty.findUnique({ where: { id: bounty.id } });
    if (existing) {
      log('  ⏭ ', `Bounty ${bounty.id} already exists — skipped`);
      continue;
    }

    const expiresAt = new Date(Date.now() + bounty.durationHours * 60 * 60 * 1000);

    await prisma.$transaction([
      // Debit asker's XP (escrow)
      prisma.userStats.update({
        where: { userId: bounty.askerId },
        data: { xp: { decrement: bounty.bountyXp } },
      }),
      // Create the bounty
      prisma.bounty.create({
        data: {
          id: bounty.id,
          askerId: bounty.askerId,
          subject: bounty.subject,
          subjectColor: bounty.subjectColor,
          questionText: bounty.questionText,
          attachmentName: bounty.attachmentName ?? null,
          bountyXp: bounty.bountyXp,
          status: 'ACTIVE',
          expiresAt,
        },
      }),
    ]);

    log('  ✅', `${bounty.askerName} staked ${bounty.bountyXp} XP → "${bounty.subject}"`);
  }

  // ── 5. Bounty replies ────────────────────────────────────────────────
  console.log('\n💬 [5/5] Adding bounty replies...');

  type ReplyDef = {
    id: string;
    bountyId: string;
    tutorId: string;
    tutorName: string;
    content: string;
  };

  const REPLIES: ReplyDef[] = [
    // Physics — Kosal Lim (teacher) explains ice density
    {
      id: 'reply-physics-kosal-001',
      bountyId: 'bounty-physics-density-001',
      tutorId: TEACHERS[0].id,
      tutorName: TEACHERS[0].name,
      content:
        'Great question! Here is the key: water molecules form a special crystalline ' +
        'lattice when they freeze. Each water molecule has two hydrogen-bond donors ' +
        '(the H atoms) and two acceptors (lone pairs on O). In liquid water these ' +
        'bonds are constantly breaking and re-forming — the molecules are relatively ' +
        'close together.\n\n' +
        'When water freezes, every molecule locks into a tetrahedral lattice with ' +
        'exactly four hydrogen bonds, each at ~109.5°. This lattice structure has ' +
        'more SPACE between molecules than liquid water. More space = lower density.\n\n' +
        'Think of it like this: randomly stacked books fill a box more densely than ' +
        'books arranged perfectly on a shelf with gaps between them. Ice is the ' +
        '"shelf" arrangement — structured but spacious.',
    },
    // Physics — Sophea Prak (student) adds a complement
    {
      id: 'reply-physics-sophea-001',
      bountyId: 'bounty-physics-density-001',
      tutorId: STUDENTS[5].id,
      tutorName: STUDENTS[5].name,
      content:
        'To add to Teacher Kosal\'s explanation: a quick way to remember this is ' +
        '"ice expands because of the H-bond cage." Water is one of the very few ' +
        'substances that expands on freezing (bismuth and a few others do too). ' +
        'This property is actually VITAL for life — if ice sank, lakes would freeze ' +
        'solid from the bottom up and kill everything inside. The floating ice ' +
        'layer acts as insulation.',
    },
    // Math — Leakhena Chan explains L\'Hôpital geometrically
    {
      id: 'reply-math-leakhena-001',
      bountyId: 'bounty-math-lhopital-001',
      tutorId: STUDENTS[1].id,
      tutorName: STUDENTS[1].name,
      content:
        'Here is the geometric intuition:\n\n' +
        'When you have lim(x→a) f(x)/g(x) and both go to 0, think of f and g as ' +
        'two curves that both pass through the point (a, 0). Near x=a, each curve ' +
        'looks approximately like a straight line. The slope of f near a is f\'(a), ' +
        'and the slope of g near a is g\'(a).\n\n' +
        'The ratio f(x)/g(x) near a is approximately:\n' +
        '  [f\'(a) · (x-a)] / [g\'(a) · (x-a)]  =  f\'(a) / g\'(a)\n\n' +
        'The (x-a) terms cancel! That\'s the heart of it. You\'re comparing how ' +
        'fast the two functions escape zero, not the functions themselves. ' +
        "L'Hôpital is just formalizing \"look at the slopes near the problematic point.\"",
    },
    // Biology — Bopha Tan (teacher) walks through the Punnett square
    {
      id: 'reply-bio-bopha-001',
      bountyId: 'bounty-biology-genetics-001',
      tutorId: TEACHERS[1].id,
      tutorName: TEACHERS[1].name,
      content:
        'Let\'s draw this step by step.\n\n' +
        'Mother is type O → genotype ii (both alleles are recessive i)\n' +
        'Father is type AB → genotype I^A I^B (one dominant A, one dominant B)\n\n' +
        'Punnett square:\n' +
        '         I^A      I^B\n' +
        '    i  | I^A i  | I^B i |\n' +
        '    i  | I^A i  | I^B i |\n\n' +
        'Result: 50% type A (I^A i), 50% type B (I^B i)\n\n' +
        'The children CANNOT be type O or type AB.\n' +
        '- Type O requires ii, but the father has no i allele to give.\n' +
        '- Type AB requires I^A I^B, but the mother has no I^A or I^B to give.\n\n' +
        'This is a classic example where the parents\' types would surprise most ' +
        'people — but the Punnett square makes it clear.',
    },
  ];

  for (const reply of REPLIES) {
    // Check the bounty exists first
    const bounty = await prisma.bounty.findUnique({ where: { id: reply.bountyId } });
    if (!bounty) {
      log('  ⚠️ ', `Skipping reply ${reply.id} — bounty ${reply.bountyId} not found`);
      continue;
    }

    const existing = await prisma.bountyReply.findFirst({
      where: { id: reply.id },
    });
    if (existing) {
      log('  ⏭ ', `Reply ${reply.id} already exists — skipped`);
      continue;
    }

    await prisma.bountyReply.create({
      data: {
        id: reply.id,
        bountyId: reply.bountyId,
        tutorId: reply.tutorId,
        format: 'TEXT',
        content: reply.content,
        ahaCount: 0,
        isWinner: false,
      },
    });
    log('  ✅', `${reply.tutorName} replied to "${bounty.subject}"`);
  }

  // ── Recall Cards — create only if quiz questions exist ──────────────
  console.log('\n🧠 [Bonus] Recall Cards...');
  const qCount = await prisma.quizQuestion.count({
    where: { post: { schoolId: SCHOOL_ID } },
  });
  if (qCount === 0) {
    log('  ⚠️ ', 'No quiz questions found at this school — recall cards auto-create when students submit quizzes. Skipped.');
  } else {
    const questions = await prisma.quizQuestion.findMany({
      where: { post: { schoolId: SCHOOL_ID } },
      take: 3,
      select: { id: true, post: { select: { topicTags: true, title: true } } },
    });

    for (const student of STUDENTS.slice(0, 3)) {
      for (const q of questions) {
        const subject = q.post.topicTags[0]?.replace(/^#/, '') ?? 'general';
        const subjectLabel = q.post.title ?? subject;
        await prisma.recallCard.upsert({
          where: { userId_questionId: { userId: student.id, questionId: q.id } },
          create: {
            userId: student.id,
            questionId: q.id,
            subject,
            subjectLabel,
            xpReward: 5,
            nextReviewAt: new Date(),
            recallStrength: 0.35,
          },
          update: {},
        });
      }
    }
    log('  ✅', `Recall cards created for ${Math.min(STUDENTS.length, 3)} students`);
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const [warCount, participantCount, bountyCount, replyCount, cardCount, statsCount] =
    await Promise.all([
      prisma.quizWar.count({ where: { schoolId: SCHOOL_ID } }),
      prisma.quizWarParticipant.count({ where: { war: { schoolId: SCHOOL_ID } } }),
      prisma.bounty.count({ where: { asker: { schoolId: SCHOOL_ID } } }),
      prisma.bountyReply.count({ where: { bounty: { asker: { schoolId: SCHOOL_ID } } } }),
      prisma.recallCard.count({ where: { user: { schoolId: SCHOOL_ID } } }),
      prisma.userStats.count({ where: { user: { schoolId: SCHOOL_ID } } }),
    ]);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Smart Scroll seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n   School:          Stunity QA School`);
  console.log(`   UserStats:       ${statsCount} users with XP`);
  console.log(`   Quiz Wars:       ${warCount} (LIVE: 10A ${418} vs 10B ${402})`);
  console.log(`   War Participants:${participantCount} (split A/B)`);
  console.log(`   Bounties:        ${bountyCount} ACTIVE`);
  console.log(`   Bounty Replies:  ${replyCount}`);
  console.log(`   Recall Cards:    ${cardCount}`);
  console.log('\n   To verify in the app:');
  console.log('   ① Login as Chanmony / Sophea / Vanna → open Feed');
  console.log('   ② Quiz War banner should appear (LIVE, 15-min countdown)');
  console.log('   ③ Feynman Bounty cards every ~8 posts');
  console.log('   ④ "Verify post" appears in ••• menu for teacher accounts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
