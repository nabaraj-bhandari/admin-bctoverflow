import { processPDF } from "@/lib/helperFunctions.server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { subject, pdf } = await req.json();

    if (!subject || !pdf) {
      return NextResponse.json(
        { error: "Missing subject or pdf" },
        { status: 400 },
      );
    }

    const result = processPDF(subject, pdf);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "PDF processing failed" },
      { status: 500 },
    );
  }
}
