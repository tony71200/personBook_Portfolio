# SKILL.md: AI Agent Operational Guidelines

## 1. Core Competencies & Tech Stack
The Agent must be proficient in the following to maintain project integrity:
* **LLM Integration:** Using `@google/generative-ai` for both` gemini-1.5-flash` (Chat) and `text-embedding-004` (RAG).
* **Vector Mathematics:** Implementing client-side Cosine Similarity to compare user query vectors against the database.json vectors.
* **RAG Flow:** Embedding -> Vector Search (Cosine Similarity) -> Context Augmentation -> Generation.
* **Persona Logic:** Always use the "Em" pronoun. Maintain a polite, humble, yet technically expert tone.
* **Security:** Never expose the API Key in client-side code. Use the Vercel Proxy URL.
## 2. The RAG Pipeline Logic
The Agent must follow this exact execution flow for every user query:
  1. Quota Check: Verify localStorage to ensure the 15 RPM limit isn't exceeded.
  2. Embedding: Convert the user's string into a vector.
  3. Retrieval: Search database.json for the Top 3 most similar content chunks (Score > 0.7).
  4. Augmentation: Inject the retrieved chunks into the SYSTEM_INSTRUCTION.
  5. Generation: Call the Gemini API and stream/display the response.
## 3. Persona & Linguistic Constraints
The Agent must adhere to these "Soft Skills" to represent you accurately:
* **The "Em" Persona:** Always use polite Vietnamese pronouns ("Em", "Dạ", "Anh/Chị").
* **chnical Accuracy:** Do not generalize technical details. Use specific terms from the database (e.g., HALCON 25.05, TiffLibrary 0.6.65, OpenCVSharp).
* **Strict Silence:** If a query falls outside the provided JSON data (e.g., "What is the price of Bitcoin?"), the Agent must politely decline and redirect to your professional background.
## 4. Mandatory Documentation Update (CRITICAL)
After every modification or new feature implementation, the Agent MUST update the project's README.md under a new section titled "AI Chatbot Maintenance":
**Requirement for README.md Updates:**
* File Manifest: List all new/modified files (e.g., src/js/ai-handler.js).
* Function Map: Briefly describe the purpose of key functions (e.g., syncVectors(), updateQuotaUI()).
* Dependency Log: List any new CDN links or NPM packages added.
* Version History: Log the date of the update and the core changes made (e.g., "Updated RAG similarity threshold to 0.75").
## 5. Technical Constraints
* **Rate Limiting:** Check `localStorage` before every request. If > 15 requests/min, show a "Cool-down" message.
* **Source Grounding:** If information is not in `database.json`, the Agent MUST NOT hallucinate. Use the fallback phrase: "Dạ, em chưa có thông tin này, Anh/Chị muốn hỏi về dự án AI khác của em không?"

## 6. Documentation Standard
* **README.md Sync:** Every time a file structure or function is changed, the Agent must update the `README.md` manifest.
* **Modular Code:** Keep AI logic in `js/ai-core.js` and UI logic in `js/ui-manager.js`.
