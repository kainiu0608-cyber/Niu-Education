import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function cleanXmlText(xml: string) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractOfficeText(file: File) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const parts: string[] = [];

  for (const path of Object.keys(zip.files)) {
    const isDocx = path.startsWith("word/") && path.endsWith(".xml");
    const isPptx = path.startsWith("ppt/slides/") && path.endsWith(".xml");

    if (isDocx || isPptx) {
      const xml = await zip.files[path].async("text");
      const text = cleanXmlText(xml);
      if (text) parts.push(text);
    }
  }

  return parts.join("\n\n").slice(0, 30000);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in Vercel or .env.local." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const message = String(formData.get("message") || "");
    const mode = String(formData.get("mode") || "teach");
    const subject = String(formData.get("subject") || "Auto-detect");
    const grade = String(formData.get("grade") || "middle/high school");
    const historyRaw = String(formData.get("history") || "[]");
    const files = formData.getAll("files") as File[];

    let history: ChatMessage[] = [];
    try {
      history = JSON.parse(historyRaw);
    } catch {
      history = [];
    }

    let extractedFilesText = "";

    const content: any[] = [
      {
        type: "input_text",
        text: `
App: Niu Education
Mode: ${mode}
Subject: ${subject}
Grade level: ${grade}

Conversation so far:
${history
  .slice(-14)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n\n")}

New student message:
${message || "The student uploaded homework and wants help."}
        `,
      },
    ];

    for (const file of files) {
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name} is too large. Keep files under 12MB.` },
          { status: 400 }
        );
      }

      if (file.type.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;

        content.push({
          type: "input_image",
          image_url: dataUrl,
          detail: "high",
        });
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".pptx")) {
        const text = await extractOfficeText(file);
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\n${text}`;
      } else if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\n${(await file.text()).slice(0, 30000)}`;
      } else {
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\nUnsupported file type.`;
      }
    }

    if (extractedFilesText) {
      content.push({
        type: "input_text",
        text: `Uploaded file text:\n${extractedFilesText}`,
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Niu Education, a premium AI tutor.

Main job:
Teach students clearly, step by step, without being a cheating machine.

Modes:
teach = full step-by-step explanation
hints = hints first, avoid instant final answer
check = check student's work and explain mistakes
study = make a study guide, notes, practice
quiz = quiz the student and wait
quick = short but clear
explain = explain simply

Quality rules:
- Be organized.
- Use headings.
- Avoid huge walls of text.
- If an image/file is uploaded, analyze it.
- For PowerPoints, summarize by slide/topic.
- For Word docs, summarize and answer questions from it.
- End with a helpful next action.

Math formatting:
- Use dollar-sign LaTeX only.
- Inline math: $...$
- Big equations: $$...$$
- Use \\frac{}{} for stacked fractions.
- Use \\sqrt{} for roots.
- Never leave raw ugly LaTeX outside dollar signs.

Also create metadata:
At the VERY END, include a hidden JSON block exactly like this:
NIU_METADATA_START
{"title":"short useful title","summary":"1 sentence summary of the whole conversation"}
NIU_METADATA_END
          `,
        },
        { role: "user", content },
      ],
      max_output_tokens: 3000,
    });

    const full = response.output_text || "";

    const metadataMatch = full.match(
      /NIU_METADATA_START\s*([\s\S]*?)\s*NIU_METADATA_END/
    );

    let answer = full
      .replace(/NIU_METADATA_START[\s\S]*?NIU_METADATA_END/g, "")
      .trim();

    let chatTitle = "Homework chat";
    let chatSummary = "A saved Niu Education tutoring conversation.";

    if (metadataMatch?.[1]) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        chatTitle = metadata.title || chatTitle;
        chatSummary = metadata.summary || chatSummary;
      } catch {}
    }

    return NextResponse.json({
      answer,
      chatTitle,
      chatSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong. Try a clearer screenshot or smaller file.",
      },
      { status: 500 }
    );
  }
}