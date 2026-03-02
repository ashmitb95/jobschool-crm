import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import { stages, messageTemplates, leads, messages, candidateProfiles } from "../src/lib/db/schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

const STAGES = [
  { id: createId(), name: "New Lead", order: 0, color: "#4a8fd4", isDefault: true },
  { id: createId(), name: "Contacted", order: 1, color: "#c49a3c", isDefault: false },
  { id: createId(), name: "Interested", order: 2, color: "#e8622a", isDefault: false },
  { id: createId(), name: "Qualified", order: 3, color: "#8b5cf6", isDefault: false },
  { id: createId(), name: "Enrolled", order: 4, color: "#3a9e6e", isDefault: false },
  { id: createId(), name: "Lost", order: 5, color: "#6b7280", isDefault: false },
];

const TEMPLATES = [
  { name: "Welcome Message", body: "Hi {{name}}! Welcome to JobSchool. We're excited to help you on your career journey. Start by optimising your CV with our free AI tool: {{cv_link}}", channel: "whatsapp", stageName: "New Lead" },
  { name: "Follow-up", body: "Hey {{name}}, just checking in! Have you had a chance to try our CV Optimiser? It's free and takes just 2 minutes.", channel: "whatsapp", stageName: "Contacted" },
  { name: "Interest Confirmation", body: "Great news {{name}}! We'd love to tell you more about our programmes. When's a good time for a quick call?", channel: "whatsapp", stageName: "Interested" },
  { name: "Qualified Lead", body: "Hi {{name}}, you've been shortlisted for our upcoming programme. We'll be sharing details shortly. Stay tuned!", channel: "whatsapp", stageName: "Qualified" },
  { name: "Enrollment Confirmation", body: "Congratulations {{name}}! Welcome aboard. You're now enrolled in the JobSchool programme. Check your email for next steps.", channel: "whatsapp", stageName: "Enrolled" },
];

const SAMPLE_LEADS = [
  { name: "Arjun Mehta", phone: "+919876543210", email: "arjun@gmail.com", source: "meta_ads" },
  { name: "Priya Sharma", phone: "+919876543211", email: "priya.sharma@gmail.com", source: "meta_ads" },
  { name: "Rahul Verma", phone: "+919876543212", email: "rahul.v@gmail.com", source: "manual" },
  { name: "Sneha Patel", phone: "+919876543213", email: "sneha.p@gmail.com", source: "meta_ads" },
  { name: "Vikram Singh", phone: "+919876543214", email: "vikram@outlook.com", source: "referral" },
  { name: "Ananya Reddy", phone: "+919876543215", email: "ananya.r@gmail.com", source: "meta_ads" },
  { name: "Karthik Nair", phone: "+919876543216", email: "karthik.n@gmail.com", source: "website" },
  { name: "Divya Iyer", phone: "+919876543217", email: "divya.i@gmail.com", source: "meta_ads" },
  { name: "Amit Kumar", phone: "+919876543218", email: "amit.k@gmail.com", source: "manual" },
  { name: "Neha Gupta", phone: "+919876543219", email: "neha.g@gmail.com", source: "meta_ads" },
  { name: "Rohan Das", phone: "+919876543220", email: "rohan.d@gmail.com", source: "referral" },
  { name: "Meera Joshi", phone: "+919876543221", email: "meera.j@gmail.com", source: "meta_ads" },
  { name: "Sanjay Tiwari", phone: "+919876543222", email: null, source: "meta_ads" },
  { name: "Pooja Agarwal", phone: "+919876543223", email: "pooja.a@gmail.com", source: "website" },
  { name: "Arun Prasad", phone: "+919876543224", email: "arun.p@gmail.com", source: "meta_ads" },
  { name: "Kavita Rao", phone: "+919876543225", email: "kavita.r@gmail.com", source: "manual" },
  { name: "Deepak Mishra", phone: "+919876543226", email: "deepak.m@gmail.com", source: "meta_ads" },
  { name: "Ritu Saxena", phone: "+919876543227", email: "ritu.s@gmail.com", source: "referral" },
  { name: "Manish Pandey", phone: "+919876543228", email: null, source: "meta_ads" },
  { name: "Swati Deshmukh", phone: "+919876543229", email: "swati.d@gmail.com", source: "meta_ads" },
  { name: "Ajay Bhatia", phone: "+919876543230", email: "ajay.b@gmail.com", source: "website" },
  { name: "Tanvi Kulkarni", phone: "+919876543231", email: "tanvi.k@gmail.com", source: "meta_ads" },
  { name: "Rajesh Sinha", phone: "+919876543232", email: "rajesh.s@gmail.com", source: "manual" },
  { name: "Nisha Menon", phone: "+919876543233", email: "nisha.m@gmail.com", source: "meta_ads" },
  { name: "Suresh Patil", phone: "+919876543234", email: null, source: "meta_ads" },
  { name: "Ankita Bhatt", phone: "+919876543235", email: "ankita.b@gmail.com", source: "referral" },
  { name: "Vivek Chopra", phone: "+919876543236", email: "vivek.c@gmail.com", source: "meta_ads" },
  { name: "Shruti Kapoor", phone: "+919876543237", email: "shruti.k@gmail.com", source: "website" },
  { name: "Gaurav Malhotra", phone: "+919876543238", email: "gaurav.m@gmail.com", source: "meta_ads" },
  { name: "Ishita Sen", phone: "+919876543239", email: "ishita.s@gmail.com", source: "manual" },
];

async function main() {
  console.log("Seeding Turso database...");

  // Clear tables
  await db.delete(messages);
  await db.delete(candidateProfiles);
  await db.delete(leads);
  await db.delete(stages);
  await db.delete(messageTemplates);

  // Create stages
  const now = new Date().toISOString();
  for (const s of STAGES) {
    await db.insert(stages).values({ ...s, createdAt: now });
  }
  console.log(`Created ${STAGES.length} stages`);

  // Create templates and link to stages
  for (const t of TEMPLATES) {
    const id = createId();
    await db.insert(messageTemplates).values({
      id,
      name: t.name,
      body: t.body,
      channel: t.channel,
      createdAt: now,
      updatedAt: now,
    });
    const stage = STAGES.find((s) => s.name === t.stageName);
    if (stage) {
      const { eq } = await import("drizzle-orm");
      await db.update(stages).set({ templateId: id }).where(eq(stages.id, stage.id));
    }
  }
  console.log(`Created ${TEMPLATES.length} templates`);

  // Create leads across stages
  const dist = [
    { stageIndex: 0, count: 10 },
    { stageIndex: 1, count: 7 },
    { stageIndex: 2, count: 5 },
    { stageIndex: 3, count: 4 },
    { stageIndex: 4, count: 2 },
    { stageIndex: 5, count: 2 },
  ];

  let leadIdx = 0;
  for (const d of dist) {
    for (let i = 0; i < d.count && leadIdx < SAMPLE_LEADS.length; i++) {
      const l = SAMPLE_LEADS[leadIdx];
      const daysAgo = Math.floor(Math.random() * 30);
      const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
      await db.insert(leads).values({
        id: createId(),
        name: l.name,
        phone: l.phone,
        email: l.email,
        source: l.source,
        stageId: STAGES[d.stageIndex].id,
        createdAt: created,
        updatedAt: created,
      });
      leadIdx++;
    }
  }
  console.log(`Created ${leadIdx} leads`);
  console.log("Seed complete!");
}

main().catch(console.error);
