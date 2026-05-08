import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// In-memory cache for research results to avoid repeating API calls
const researchCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/research/search", async (req, res) => {
    const query = req.query.query as string;
    if (!query) return res.status(400).json({ error: "Missing query" });

    // Check cache
    const cached = researchCache.get(query);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      // Using OpenAlex API - known for better availability and open data
      // mailto is used for OpenAlex's "polite pool" to get better rate limits
      const mailto = "dragon.mkmk@gmail.com"; 
      const apiUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10&mailto=${mailto}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        console.error(`OpenAlex API responded with ${status}: ${errorText}`);
        return res.status(status).json({ error: `Research API Error: ${status}` });
      }

      const data = await response.json();
      
      // Map OpenAlex works to the internal Paper interface
      // OpenAlex uses an "inverted index" for abstracts which we reconstruct
      const results = data.results.map((work: any) => {
        let abstract = "";
        if (work.abstract_inverted_index) {
          const entries = Object.entries(work.abstract_inverted_index);
          const words: string[] = [];
          entries.forEach(([word, positions]: [string, any]) => {
            positions.forEach((pos: number) => {
              words[pos] = word;
            });
          });
          abstract = words.join(" ");
        }

        return {
          paperId: work.id.split("/").pop(), // Extract ID from URL
          title: work.display_name || "Unknown Title",
          abstract: abstract || null,
          year: work.publication_year || null,
          url: work.doi || work.ids?.mag || null,
          externalIds: {
            DOI: work.doi ? work.doi.replace("https://doi.org/", "") : undefined
          },
          authors: (work.authorships || []).map((a: any) => ({
            name: a.author?.display_name || "Unknown Author"
          })),
          citationCount: work.cited_by_count || 0
        };
      });

      researchCache.set(query, { data: results, timestamp: Date.now() });
      res.json(results);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch research papers" });
    }
  });

  // Research Matrix API
  app.post("/api/research/matrix", async (req, res) => {
    const { papers } = req.body;
    const paperSummaries = papers.map((p: any) => `Title: ${p.title}\nAbstract: ${p.abstract}\nYear: ${p.year}`).join("\n---\n");

    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Compare the following research papers. Create a matrix describing: 
      1. Research Methodology 
      2. Primary Hypothesis 
      3. Key Findings
      4. Research Gap (What's missing?)
      
      Papers:
      ${paperSummaries}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["columns", "rows"],
            properties: {
              columns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              rows: { type: SchemaType.ARRAY, items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }
            }
          }
        }
      });
      res.json(JSON.parse(response.response.text()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Research Citations API
  app.post("/api/research/citations", async (req, res) => {
    const { paper } = req.body;
    const authorNames = paper.authors.map((a: any) => a.name).join(", ");
    const doi = paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : paper.url;

    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Generate citations for this paper:
      Authors: ${authorNames}
      Year: ${paper.year || 'n.d.'}
      Title: ${paper.title}
      Identifier: ${doi}
      
      Provide strictly formatted strings for: APA 7th, IEEE, MLA 9, and Vancouver.
      Return JSON: { "apa": "...", "ieee": "...", "mla": "...", "vancouver": "..." }` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["apa", "ieee", "mla", "vancouver"],
            properties: {
              apa: { type: SchemaType.STRING },
              ieee: { type: SchemaType.STRING },
              mla: { type: SchemaType.STRING },
              vancouver: { type: SchemaType.STRING }
            }
          }
        }
      });
      res.json(JSON.parse(response.response.text()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Research Gaps API
  app.post("/api/research/gaps", async (req, res) => {
    const { papers } = req.body;
    const context = papers.map((p: any) => `Title: ${p.title}\nAbstract: ${p.abstract}`).join("\n\n");

    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Based on these research abstracts, identify 3 unique "Research Gaps" or original thesis topics that a student could pursue. Explain WHY each topic is a gap.
      
      Papers:
      ${context}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["topics"],
            properties: {
              topics: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["title", "reason"],
                  properties: {
                    title: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING }
                  }
                }
              }
            }
          }
        }
      });
      res.json(JSON.parse(response.response.text()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Lesson Visualize API
  app.post("/api/lesson/visualize", async (req, res) => {
    const { topic } = req.body;
    try {
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Generate a structured knowledge graph for the topic: "${topic}". 
      Create a logical flow of concepts from basic to advanced.
      Each node should have an ID (e.g. 'n1', 'n2'), a label (short name), and a description (Thai language, 1 sentence).
      Positions should be roughly laid out in a hierarchy or readable flow (x from 0 to 800, y from 0 to 600).
      Edges should connect related concepts.
      Return ONLY a valid JSON object matching the LessonGraph interface.` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            required: ["nodes", "edges"],
            properties: {
              nodes: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["id", "data", "position"],
                  properties: {
                    id: { type: SchemaType.STRING },
                    data: {
                      type: SchemaType.OBJECT,
                      required: ["label"],
                      properties: {
                        label: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING }
                      }
                    },
                    position: {
                      type: SchemaType.OBJECT,
                      required: ["x", "y"],
                      properties: {
                        x: { type: SchemaType.NUMBER },
                        y: { type: SchemaType.NUMBER }
                      }
                    }
                  }
                }
              },
              edges: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  required: ["id", "source", "target"],
                  properties: {
                    id: { type: SchemaType.STRING },
                    source: { type: SchemaType.STRING },
                    target: { type: SchemaType.STRING },
                    label: { type: SchemaType.STRING }
                  }
                }
              }
            }
          }
        }
      });
      res.json(JSON.parse(response.response.text()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
