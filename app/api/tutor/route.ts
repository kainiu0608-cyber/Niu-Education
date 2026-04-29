import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const message = String(formData.get("message") || "");
    const mode = String(formData.get("mode") || "teach");
    const grade = String(formData.get("grade") || "middle/high school");
    const subject = String(formData.get("subject") || "auto-detect");
    const historyRaw = String(formData.get("history") || "[]");
    const files = formData.getAll("files") as File[];

    let history: ChatMessage[] = [];
    try {
      history = JSON.parse(historyRaw);
    } catch {
      history = [];
    }

    const content: any[] = [
      {
        type: "input_text",
        text: `
App: Niu Education
Mode: ${mode}
Grade level: ${grade}
Subject: ${subject}

Recent conversation:
${history
  .slice(-12)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n\n")}

Student message:
${message || "The student uploaded homework and wants help."}
        `,
      },
    ];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: "One image is too large. Keep images under 8MB." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      content.push({
        type: "input_image",
        image_url: dataUrl,
        detail: "high",
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Niu Education, a premium AI homework tutor app.

Goal:
Teach students step by step. Help them understand, not just copy.

Personality:
- Friendly, clear, motivating.
- Explain like the student is around the selected grade level.
- Use simple words.
- Be direct and organized.

Modes:
- teach: full step-by-step explanation.
- hints: give hints first, avoid final answer.
- check: check student work and correct mistakes.
- study: make a study guide, notes, key ideas, and practice.
- quiz: quiz the student with questions and wait for answers.
- quick: short answer with key steps.
- explain: explain like the student is confused.

Rules:
- If an image is uploaded, read it carefully.
- If blurry, say what is unclear.
- If multiple problems show, focus on what the student asks.
- Always teach the thinking.
- Ask a follow-up if needed.
- End with a small “Try this next” or “Want me to check your answer?”

Math formatting:
- Use Markdown.
- Use LaTeX for math.
- Inline math must use \$begin:math:text$ \.\.\. \\$end:math:text$.
- Big equations must use $$ ... $$.
- Use \\frac{}{} for stacked fractions.
- Use \\sqrt{} for square roots.
- Use x^2 style exponents.
- Make equations clean and readable.
          `,
        },
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 2400,
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong. Try again with a clearer screenshot.",
      },
      { status: 500 }
    );
  }
}