import { getCatalog, catalogChecksum } from "@/lib/helperFunctions";

export async function GET() {
  try {
    const catalog = await getCatalog();
    const checksum = catalogChecksum(catalog);

    return Response.json({
      checksum,
      data: catalog,
    });
  } catch {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
