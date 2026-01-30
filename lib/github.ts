import fs from "fs";
import fetch from "node-fetch";

const OWNER = process.env.GITHUB_OWNER!;
const REPO = process.env.GITHUB_REPO!;
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN!;

export async function getSha(path: string) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  const sha = (await res.json()).sha;

  return sha;
}

export async function uploadPdf(
  githubPath: string,
  localFilePath: string,
  sha?: string,
) {
  const content = fs.readFileSync(localFilePath).toString("base64");

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${githubPath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: sha ? `Update ${githubPath}` : `Add ${githubPath}`,
        content,
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!res.ok) throw new Error(await res.text());
}
