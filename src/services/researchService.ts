export interface Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  url: string | null;
  externalIds?: { 
    DOI?: string;
  };
  authors: { name: string }[];
  citationCount: number;
}

export async function searchResearchPapers(query: string): Promise<Paper[]> {
  try {
    const res = await fetch(`/api/research/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Search failed");
    }
    return await res.json();
  } catch (error) {
    console.error("Research Search Error:", error);
    throw error;
  }
}

export async function generateComparisonMatrix(papers: Paper[]) {
  try {
    const res = await fetch("/api/research/matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papers })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Matrix generation failed");
    }
    return await res.json();
  } catch (error) {
    console.error("Matrix Error:", error);
    throw error;
  }
}

export async function generateCitations(paper: Paper) {
  try {
    const res = await fetch("/api/research/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Citation generation failed");
    }
    return await res.json();
  } catch (error) {
    console.error("Citation Error:", error);
    throw error;
  }
}

export async function identifyResearchGap(papers: Paper[]) {
  try {
    const res = await fetch("/api/research/gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papers })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Gap identification failed");
    }
    return await res.json();
  } catch (error) {
    console.error("Gaps Error:", error);
    throw error;
  }
}
