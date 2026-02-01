import { NextResponse } from "next/server";
import compressPDF from "@/lib/admin/compressPdf.server";

export async function POST(req: Request) {
  try {
    const { subject, pdf } = await req.json();

    if (!subject || !pdf) {
      return NextResponse.json(
        { error: "Missing subject (code) or pdf (filename)" },
        { status: 400 },
      );
    }

    const result = compressPDF(subject, pdf);

    return NextResponse.json({
      ...result,
      message: "Compression successful. Source is ready for processing.",
    });
  } catch (err) {
    console.error("Compression Route Error:", err);
    return NextResponse.json(
      { error: "PDF compression failed. Check server logs." },
      { status: 500 },
    );
  }
}
