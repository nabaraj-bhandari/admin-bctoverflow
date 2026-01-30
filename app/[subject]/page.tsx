import { listPDFs, listCompressedPDFs } from "@/lib/helperFunctions.server";
import ClientSubjectPage from "./subject.client";
import { notFound } from "next/navigation";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;

  if (!subject) {
    notFound();
  }

  const pdfs = listPDFs(subject);
  const compressedPdfs = listCompressedPDFs(subject);

  return (
    <ClientSubjectPage
      subject={subject}
      pdfs={pdfs}
      compressedPdfs={compressedPdfs}
    />
  );
}
