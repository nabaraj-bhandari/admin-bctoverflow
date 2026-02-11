import { prisma } from "@/lib/prisma";

export async function GET() {
  const meta = await prisma.metaData.findUnique({
    where: { id: 1 },
    select: { checksum: true },
  });

  return Response.json({ checksum: meta?.checksum });
}
