import Link from "next/link";
import { listSubjects } from "@/lib/helperFunctions.server";

export default function Home() {
  const subjects = listSubjects();

  return (
    <ul>
      {subjects.map((s) => (
        <li key={s}>
          <Link href={`/${s}`}>{s}</Link>
        </li>
      ))}
    </ul>
  );
}
