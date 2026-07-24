import { makePrisma } from "../scripts/_db";

const prisma = makePrisma();

const cats = [
  { slug: "marketplace", name: "Marketplace", description: "Listings, deals, and trading talk", sortOrder: 0 },
  { slug: "guides", name: "Guides", description: "How-tos and walkthroughs", sortOrder: 1 },
  { slug: "questions", name: "Q&A", description: "Ask the community", sortOrder: 2 },
  { slug: "services", name: "Services", description: "Offer or find digital services", sortOrder: 3 },
  { slug: "gaming", name: "Gaming", description: "Games, accounts, and ranks", sortOrder: 4 },
  { slug: "ai", name: "AI", description: "ChatGPT, Claude, Midjourney & more", sortOrder: 5 },
  { slug: "software", name: "Software", description: "Tools, licenses, and stacks", sortOrder: 6 },
  { slug: "hosting", name: "Hosting", description: "Servers, domains, VPNs", sortOrder: 7 },
  { slug: "programming", name: "Programming", description: "Dev talk and snippets", sortOrder: 8 },
];

async function main() {
  for (const c of cats) {
    await prisma.forumCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  console.log({
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    forum: await prisma.forumCategory.count(),
    suppliers: await prisma.supplier.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
