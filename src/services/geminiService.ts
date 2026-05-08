export interface LessonNode {
  id: string;
  data: { label: string; description?: string };
  position: { x: number; y: number };
}

export interface LessonEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface LessonGraph {
  nodes: LessonNode[];
  edges: LessonEdge[];
}

export async function generateLessonGraph(topic: string): Promise<LessonGraph> {
  try {
    const res = await fetch("/api/lesson/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Lesson visualization failed");
    }
    return await res.json();
  } catch (error) {
    console.error("Lesson Visualize Error:", error);
    throw error;
  }
}
