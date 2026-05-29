import { NextResponse } from "next/server";

type RunBody = {
  code: string;
  language: string;
  input?: string;
};

function getLanguageId(language: string) {
  const normalized = language.toLowerCase();

  if (normalized === "c++" || normalized === "cpp") return 54;
  if (normalized === "c") return 50;
  if (normalized === "java") return 62;
  if (normalized === "python") return 71;
  if (normalized === "javascript") return 63;
  if (normalized === "typescript") return 74;

  return null;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.JUDGE0_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing JUDGE0_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Partial<RunBody>;
    const code = body.code ?? "";
    const language = body.language ?? "";
    const input = body.input ?? "";

    if (!code.trim()) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    if (!language.trim()) {
      return NextResponse.json({ error: "Language is required." }, { status: 400 });
    }

    const languageId = getLanguageId(language);

    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    const createRes = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: input,
        }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      return NextResponse.json(
        { error: errText || `Judge0 error: ${createRes.status}` },
        { status: 500 }
      );
    }

    const data = await createRes.json();

    const output =
      data.stdout ||
      data.stderr ||
      data.compile_output ||
      data.message ||
      data.status?.description ||
      "Program finished with no output.";

    return NextResponse.json({ output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Execution error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}