import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function getCatalog() {
  return prisma.subject.findMany({
    include: {
      resources: {
        include: {
          sections: {
            select: {
              id: true,
              title: true,
              checksum: true,
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export function catalogChecksum(data: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
