import fetch from "node-fetch";

const OWNER = process.env.GITHUB_OWNER || "nabaraj-bhandari";
const REPO = process.env.GITHUB_REPO || "academic-resources";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN!;

interface GitHubFileResponse {
  sha: string;
}

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

  const data = (await res.json()) as GitHubFileResponse;
  return data.sha;
}

export async function uploadPdf(
  githubPath: string,
  contentBuffer: Buffer,
  sha?: string,
) {
  const content = contentBuffer.toString("base64");

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

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`GitHub Upload Failed: ${res.status} - ${errorBody}`);
  }
}
