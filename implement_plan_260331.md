# IMPLEMENT_PLAN.md: AI Portfolio Chatbot with RAG
## 1. Project Overview
The objective is to integrate a Retrieval-Augmented Generation (RAG) chatbot into the `personBook_Portfolio` project at the `<div class="chatbot-box" data-chatbot>` location. The chatbot serves as a virtual representative, answering recruiter questions about technical expertise and personal background using the Gemini 1.5 Flash API.
## 2. Project Goal
Integrate a professional, RAG-powered chatbot into the `personBook_Portfolio` at the target location: `<div class="chatbot-box" data-chatbot>`. The chatbot must strictly answer based on provided personal/project data, maintain a natural tone, and track API usage.

## 3. Technical Stack
* **Engine:** `gemini-1.5-flash` (Free Tier).
* **Embeddings:** `text-embedding-004`.
* **Framework:** `@google/generative-ai (CDN or NPM).`
* **Data Strategy:** Local Vector Search (Cosine Similarity).
* **Security:** Vercel Serverless Proxy (to hide API_KEY).
* **Persona:** Polite and professional (Vietnamese "Em" pronoun).
* **Tracking:** Browser `localStorage` to monitor the 15 RPM (Requests Per Minute) limit.
## 3. Data Structure Recommendation
To ensure high-quality retrieval, the Agent should use a "Chunk-with-Metadata" format for `database.json`.
``` JSON
[
  {
    "id": "tech_halcon",
    "category": "technical",
    "content": "Experienced with HALCON 25.05. Note: In this version, tuple_string requires 3 input parameters. Expert in overpaint_gray and phase_correlation for industrial inspection.",
    "vector": [...]
  },
  {
    "id": "personal_ncku",
    "category": "personal",
    "content": "Active member of the Vietnamese Student Association at NCKU. I enjoy organizing community events and branding for student activities.",
    "vector": [...]
  },
  {
    "id": "personal_fitness",
    "category": "personal",
    "content": "Disciplined in fitness and weight training. I maintain a 5-day hybrid gym/home training schedule to stay sharp and productive.",
    "vector": [...]
  }
]
```
## 4. Execution Tasks for Agent
### Task 1: Security & Proxy Setup
Since the site is hosted on GitHub Pages (Static), the Agent must NOT hardcode the API Key in the frontend.
* **Requirement:** Create a simple serverless function (e.g., api/chat.js for Vercel) that acts as a bridge. The frontend sends the query to the Proxy $\rightarrow$ Proxy adds the API_KEY $\rightarrow$ Proxy calls Gemini.
### Task 2: Vector Search Engine
Implement a client-side search to find the most relevant context before calling the LLM.
``` JavaScript
// Agent Reference Code: Cosine Similarity
function cosineSimilarity(A, B) {
    let dot = A.reduce((sum, a, i) => sum + a * B[i], 0);
    let magA = Math.sqrt(A.reduce((sum, a) => sum + a * a, 0));
    let magB = Math.sqrt(B.reduce((sum, b) => sum + b * b, 0));
    return dot / (magA * magB);
}
```
### Task 3: The "Em" Persona Prompt
The Agent must configure the `System Instruction` to strictly follow the persona and the context boundaries.
``` JavaScript
const SYSTEM_INSTRUCTION = `
You are the Virtual Assistant for [Your Name].
PERSONA:
- Refer to yourself as "Em" (a polite Vietnamese pronoun for a junior/candidate).
- Be professional, polite, and enthusiastic.
- If answering in English, maintain a respectful and helpful tone.

KNOWLEDGE BOUNDARY:
- Use only the provided "Context" which includes technical projects (HALCON, C#, OpenCV) and personal interests (Gym, NCKU student activities).
- If information is missing, say: "Dạ, hiện tại em chưa có thông tin chi tiết về phần này trong hồ sơ. Anh/Chị có muốn biết thêm về các dự án Computer Vision của em không?"
- DO NOT answer questions about politics, religion, or external general knowledge.
`;
```
### Task 4: Quota & UI Integration
Implement a visual indicator for the 15 RPM (Requests Per Minute) limit.
``` JavaScript
// Agent Reference Code: Quota Tracker
let requestLogs = JSON.parse(localStorage.getItem('gemini_quota') || "[]");

function checkQuota() {
    const now = Date.now();
    requestLogs = requestLogs.filter(time => now - time < 60000);
    const remaining = 15 - requestLogs.length;
    
    // Update UI
    const quotaDisplay = document.querySelector('.quota-count');
    quotaDisplay.innerText = `Queries remaining: ${remaining}/15 (RPM)`;
    
    return remaining > 0;
}
```
## 5. UI/UX Requirements for `<div data-chatbot>`
* **Chat History:** Persist the conversation during the session.
* **Typing Effect:** Use a small delay/animation to make the AI response feel natural.
* **Mobile Friendly:** Ensure the chat box doesn't break the "Book" layout on smaller screens.
## 6. Development Workflow (Manual Update)
  * 1. Add new content to raw_data.json.
  * 2. Run the generate_vectors.js utility locally to get new embeddings.
  * 3. Replace the existing database.json in the /data folder.
  * 4. Commit and Push to GitHub.
## 7. Implementation Steps

### Phase 1: Data Preparation
- [ ] Create `database.json` with chunks of expertise (HALCON 25.05, OpenCV, C#, NCKU activities).
- [ ] Generate vectors using `text-embedding-004` and store them in the JSON file.

### Phase 2: Backend Proxy (Vercel)
- [ ] Create `api/chat.js` to handle communication with Gemini.
- [ ] Set `GEMINI_API_KEY` as an environment variable in Vercel.
- [ ] Configure CORS to allow requests only from your GitHub Pages domain.

### Phase 3: Frontend Integration
- [ ] Implement `semanticSearch()` in JavaScript to find relevant context from `database.json`.
- [ ] Build the UI inside `.chatbot-box` with a message list and input field.
- [ ] Add a `quota-display` to show remaining queries (X/15 RPM).

### Phase 4: Maintenance
- [ ] Update `README.md` with the new "AI Chatbot Maintenance" section.
