/**
 * Stellar Stories — Cloudflare Worker
 * =====================================
 * DEPLOY INSTRUCTIONS (see bottom of file for step-by-step)
 *
 * This Worker proxies requests from the Stellar Stories game to the Claude API.
 * The API key is stored as a Cloudflare secret — never in code or committed to git.
 *
 * After deploying, copy your Worker URL and paste it into:
 *   docs/stellar-stories/index.html  →  const WORKER_URL = 'YOUR_WORKER_URL_HERE';
 */

// ============================================================
// CORS — domains allowed to call this Worker
// ============================================================
const ALLOWED_ORIGINS = [
  'https://galaxydashboard.com',
  'https://www.galaxydashboard.com',
  'https://rithera1.github.io',
];

// ============================================================
// MAIN HANDLER
// ============================================================
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid request body.', 400, corsHeaders);
    }

    // Validate topic
    const topic = String(body.topic || '').trim().slice(0, 600);
    if (topic.length < 3) {
      return jsonError('Topic is required.', 400, corsHeaders);
    }

    // Optional skill focus array (validated against whitelist)
    const VALID_SKILLS = new Set([
      'Sequence', 'Character Motivation', 'Theme', 'Point of View',
      'Vocabulary', 'Inference', 'Cause & Effect', 'Compare & Contrast',
      "Author's Purpose", 'Main Idea',
    ]);
    const rawSkills = Array.isArray(body.skills) ? body.skills : [];
    const skills = rawSkills.filter(s => typeof s === 'string' && VALID_SKILLS.has(s));

    // Call Claude
    let anthropicRes;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2800,
          messages: [{ role: 'user', content: buildPrompt(topic, skills) }],
        }),
      });
    } catch (err) {
      console.error('Fetch to Anthropic failed:', err);
      return jsonError('Could not reach the AI service. Please try again.', 502, corsHeaders);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '');
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return jsonError('AI service returned an error. Please try again.', 502, corsHeaders);
    }

    const apiData = await anthropicRes.json().catch(() => null);
    const rawText = apiData?.content?.[0]?.text || '';

    // Extract JSON from Claude's response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response:', rawText.slice(0, 500));
      return jsonError('Story generation failed. Please try again.', 502, corsHeaders);
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse JSON from Claude response');
      return jsonError('Story generation failed. Please try again.', 502, corsHeaders);
    }

    // Validate structure
    if (
      !result.story?.title ||
      !result.story?.text ||
      !Array.isArray(result.questions) ||
      result.questions.length < 4
    ) {
      console.error('Claude response missing required fields');
      return jsonError('Story generation failed. Please try again.', 502, corsHeaders);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

// ============================================================
// HELPERS
// ============================================================
function jsonError(message, status, corsHeaders) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================
// SKILL DEFINITIONS (FL B.E.S.T. aligned)
// ============================================================
const SKILL_DEFS = {
  'Sequence':             { standard: 'ELA.3.R.3.2',  instruction: 'Ask about the ORDER OF EVENTS: what happened first, next, or last in the story.' },
  'Character Motivation': { standard: 'ELA.3.R.1.1',  instruction: 'Ask WHY a specific character did a specific action — their reason or feeling behind it.' },
  'Theme':                { standard: 'ELA.3.R.1.2',  instruction: 'Ask what LESSON or MESSAGE the story teaches. The correct answer should be a universal truth, not a plot summary.' },
  'Point of View':        { standard: 'ELA.3.R.1.3',  instruction: 'Ask about a character\'s PERSPECTIVE or FEELINGS about an event — how they see or feel about something.' },
  'Vocabulary':           { standard: 'ELA.3.V.1.3',  instruction: 'Choose a word that ACTUALLY APPEARS in the story and ask what it means in context. Quote the sentence it appears in.' },
  'Inference':            { standard: 'ELA.3.R.1.1',  instruction: 'Ask something the reader can FIGURE OUT that is NOT directly stated. The answer requires reading between the lines.' },
  'Cause & Effect':       { standard: 'ELA.3.R.2.1',  instruction: 'Ask what CAUSED something to happen, or what HAPPENED AS A RESULT of a story event.' },
  'Compare & Contrast':   { standard: 'ELA.3.R.3.3',  instruction: 'Ask how two CHARACTERS, SETTINGS, or EVENTS are similar or different.' },
  "Author's Purpose":     { standard: 'ELA.3.R.2.3',  instruction: 'Ask WHY the author included a specific detail, dialogue, or description — what effect it has on the reader.' },
  'Main Idea':            { standard: 'ELA.3.R.2.2',  instruction: 'Ask what the story is MOSTLY ABOUT — the central idea, not a minor detail.' },
};

const DEFAULT_SKILLS = [
  'Sequence', 'Character Motivation', 'Theme', 'Vocabulary', 'Inference', 'Cause & Effect',
];

// ============================================================
// CLAUDE PROMPT
// ============================================================
function buildPrompt(topic, selectedSkills) {
  // Determine which 6 skills to use
  let skillsToUse;
  if (selectedSkills && selectedSkills.length > 0) {
    // Pad to 6 by cycling through the selection if fewer than 6 chosen
    skillsToUse = [...selectedSkills];
    let i = 0;
    while (skillsToUse.length < 6) {
      skillsToUse.push(selectedSkills[i % selectedSkills.length]);
      i++;
    }
    skillsToUse = skillsToUse.slice(0, 6);
  } else {
    skillsToUse = DEFAULT_SKILLS;
  }

  const focusNote = selectedSkills && selectedSkills.length > 0
    ? `NOTE: The student has chosen to focus on these skills: ${selectedSkills.join(', ')}. Design all 6 questions around these skills (repeating skills if fewer than 6 were chosen).`
    : 'Use the balanced default skill mix below.';

  const questionList = skillsToUse.map((skill, i) => {
    const def = SKILL_DEFS[skill] || { standard: 'ELA.3.R.1.1', instruction: 'Create an appropriate comprehension question.' };
    return `${i + 1}. ${skill.toUpperCase()} (${def.standard}) — ${def.instruction}`;
  }).join('\n');

  return `You are creating a reading comprehension activity for a Florida 3rd grade student.

STUDENT'S STORY IDEAS: "${topic}"

${focusNote}

═══════════════════════════════════════
STEP 1 — WRITE THE STORY
═══════════════════════════════════════
Write an original short story that naturally incorporates the student's ideas.

Story requirements:
• Length: 420–480 words total (count carefully before continuing)
• Reading level: Florida 3rd grade (Lexile ~520–820L)
• 100% kid-safe: NO violence, NO death, NO scary content, NO weapons, NO adult themes
• Clear narrative arc: beginning, middle, and end
• At least 2 named characters with distinct personalities and clear motivations
• A specific problem the main character faces and a satisfying solution
• At least 2 exchanges of dialogue between characters
• Vivid but simple descriptive language a 3rd grader can enjoy

═══════════════════════════════════════
STEP 2 — SELF-REVIEW THE STORY (silently)
═══════════════════════════════════════
Before writing questions, silently verify:
✓ Story is completely kid-safe
✓ Story is 420–480 words
✓ Story has a clear problem AND solution
✓ At least 2 named characters with motivations
✓ Appropriate vocabulary for Florida 3rd grade
If anything fails, silently rewrite and recheck before continuing.

═══════════════════════════════════════
STEP 3 — CREATE 6 COMPREHENSION QUESTIONS
═══════════════════════════════════════
Write exactly 6 multiple-choice questions using these Florida B.E.S.T. ELA skills:

${questionList}

Each question must:
• Have exactly 4 answer choices
• Have ONE clearly correct answer, directly supported by the story
• Have 3 plausible but clearly wrong distractors a 3rd grader might consider
• Use simple vocabulary appropriate for 3rd grade
• NOT give away answers to other questions

═══════════════════════════════════════
STEP 4 — VERIFY QUESTIONS (silently)
═══════════════════════════════════════
For each question confirm:
✓ Correct answer is clearly supported by story text
✓ Distractors are plausible but wrong
✓ Vocabulary word (if applicable) is actually present in the story text
✓ Question language is appropriate for 3rd grade
If any question fails, silently fix it before outputting.

═══════════════════════════════════════
STEP 5 — OUTPUT
═══════════════════════════════════════
Return ONLY the JSON below — no markdown, no code fences, no explanation, no text before or after.

{
  "story": {
    "title": "Story Title Here",
    "text": "Full story text here. Use \\n\\n to separate paragraphs."
  },
  "questions": [
    {
      "id": 1,
      "skill": "Sequence",
      "standard": "ELA.3.R.1.1",
      "question": "Question text here?",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correct": 0,
      "explanation": "1-2 sentence explanation referencing specific story details."
    },
    {
      "id": 2,
      "skill": "Character Motivation",
      "standard": "ELA.3.R.1.2",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    },
    {
      "id": 3,
      "skill": "Story Elements",
      "standard": "ELA.3.R.1.1",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    },
    {
      "id": 4,
      "skill": "Theme",
      "standard": "ELA.3.R.1.3",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    },
    {
      "id": 5,
      "skill": "Vocabulary",
      "standard": "ELA.3.V.1.3",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    },
    {
      "id": 6,
      "skill": "Inference",
      "standard": "ELA.3.R.3.1",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    }
  ]
}

CRITICAL: The "correct" field is a 0-based index into the "choices" array. Double-check each correct index before outputting. Return ONLY the raw JSON — nothing else.`;
}

/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║         CLOUDFLARE SETUP INSTRUCTIONS (Step by Step)            ║
 ╚══════════════════════════════════════════════════════════════════╝

 STEP 1 — Log in to Cloudflare
   Go to: https://dash.cloudflare.com
   Sign in to the account that has your existing Cloudflare setup.

 STEP 2 — Open Workers & Pages
   In the left sidebar, click "Workers & Pages"

 STEP 3 — Create a new Worker
   Click "Create" (blue button, top right)
   Choose "Create Worker"
   Name it: stellar-stories-api   (or any name you like)
   Click "Deploy" (you'll edit the code next)

 STEP 4 — Edit the Worker code
   After deploying, click "Edit Code"
   Delete ALL the default code in the editor
   Copy and paste the ENTIRE contents of this file (cloudflare-worker.js)
   Click "Save and Deploy"

 STEP 5 — Add your API key as a secret
   Go back to your Worker's overview page
   Click the "Settings" tab
   Click "Variables and Secrets" (or just "Variables")
   Under "Secret Variables" click "Add variable"
     Variable name:  ANTHROPIC_API_KEY
     Value:          [paste your new Anthropic API key here]
   Click "Encrypt" then "Save"
   IMPORTANT: Get a NEW key from console.anthropic.com first — the one
   shared in chat was exposed and should be revoked.

 STEP 6 — Get your Worker URL
   Go to your Worker's overview
   You'll see a URL like: https://stellar-stories-api.YOUR-SUBDOMAIN.workers.dev
   Copy that URL

 STEP 7 — Update the game file
   Open: docs/stellar-stories/index.html
   Find this line near the top of the <script> section:
     const WORKER_URL = 'YOUR_WORKER_URL_HERE';
   Replace with your actual Worker URL:
     const WORKER_URL = 'https://stellar-stories-api.YOUR-SUBDOMAIN.workers.dev';
   Save and commit/push to GitHub.

 STEP 8 — Test it
   Visit https://galaxydashboard.com/stellar-stories/
   Type a story idea and click Generate.
   First request might take 2-3 seconds extra (Worker cold start).

 OPTIONAL — Custom domain for the Worker
   If you want a cleaner URL like api.galaxydashboard.com/story,
   you can add a custom domain in the Worker's "Settings → Domains & Routes" tab.
   Ask Claude Code if you want help with that step.

 OPTIONAL — Rate limiting / spending control
   Set a monthly spending cap in Anthropic console → Settings → Billing
   Recommend: $5-10/month cap for personal family use.
*/
