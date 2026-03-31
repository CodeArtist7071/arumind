
type FormValues = {
    habit: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    start_time: string;
    end_time: string;
    chapter_id?: string;
    date?: string;
    is_recurring: boolean;
    syncToCalendar: boolean;
};
export const parseRoutineWithAI = async (text: string): Promise<Partial<FormValues>> => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error("No Gemini API key found");

    const res = await fetch(
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Extract routine details from this text and return ONLY valid JSON with no markdown.

Text: "${text}"

Return this exact shape:
{
  "habit": "short routine name as string",
  "priority": "HIGH or MEDIUM or LOW",
  "start_time": "HH:MM in 24h format or empty string",
  "end_time": "HH:MM in 24h format or empty string"
}`,
                    }],
                }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
            }),
        },
    );

    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
};