/* Scripted, résumé-grounded answers. No network calls, no live model — pattern matching over fixed copy. */
(function (root) {
  'use strict';

  const LINKS = {
    resume: 'resume.html',
    github: 'https://github.com/geddie212',
    linkedin: 'https://linkedin.com/in/paul-ged',
    email: 'mailto:pauliusgedrimas@gmail.com',
  };

  const QUICK_QUESTIONS = [
    'Does he know AI?',
    "Is he full-stack, back-end or front-end?",
    "What's his stack?",
    'Change the website to dark mode',
    "What's he studying?",
    'How do I contact him?',
  ];

  const FALLBACK = `I'm a scripted assistant, not a live model, so I might not have a line for that yet. Try asking about his AI work, his stack, his projects, or tell me to switch to dark mode. You can also read the <a href="${LINKS.resume}">full résumé</a>.`;

  const INTENTS = [
    {
      id: 'ai',
      triggers: ['ai', 'artificial intelligence', 'machine learning', ' ml ', 'llm', 'neural network', 'gradient descent', 'model'],
      respond: () => `Yes — AI runs through most of his work. He built a retrieval-augmented LLM agent over USF's course catalog and ran a 20-participant study against a baseline ChatGPT agent (CS 486). BehaviorTrace trains a random-forest model on wearable biosignals to predict activity states. Health Agent uses an LLM to turn conversational meal/workout logs into structured records. He also built <a href="https://forklane.ai">Forklane</a>, a coding agent that runs across Anthropic, OpenAI, Gemini and local Ollama models. What he's most drawn to is the math underneath — things like gradient descent and loss landscapes, and where that training process gets slow or unstable.`,
    },
    {
      id: 'stack-role',
      triggers: ['full stack', 'fullstack', 'full-stack', 'back end', 'backend', 'front end', 'frontend', 'front-end', 'back-end'],
      respond: () => `Full-stack, with a pull toward the backend and data side. On the backend: Flask + SQLite APIs (Café API, Coffee &amp; Wi-Fi, his blog), a FastAPI service behind Health Agent, and the SQL pipeline behind BehaviorTrace. On the frontend/native side: this site's HTML/CSS/JS, a SwiftUI app for iPhone and Apple Watch, and the Forklane CLI. So — comfortable end to end, strongest where data pipelines and model integration meet an interface.`,
    },
    {
      id: 'stack',
      triggers: ['stack', 'tech stack', 'technologies', 'tools', 'languages', 'what does he use', 'what does he know'],
      respond: () => `Core languages: Python, Java, C and JavaScript, plus HTML/CSS and SQL. Frameworks and tools: Flask, FastAPI, SwiftUI, scikit-learn, SQLite, HealthKit/WatchConnectivity, and LLM APIs (Anthropic, OpenAI, Gemini, Ollama) via Forklane. He's also done C-level systems work — threading with the producer–consumer model — and a fair amount of straight data-structures-and-algorithms practice.`,
    },
    {
      id: 'projects',
      triggers: ['project', 'built', 'portfolio', 'work has he done', 'github'],
      respond: () => `A few highlights: <strong>BehaviorTrace</strong> (wearable biosignal research tooling), <strong>Apple BehaviorTrace</strong> (a SwiftUI companion app), <strong>Health Agent</strong> (conversational meal/workout logging), and <strong>Forklane</strong> (a multi-provider coding agent). Scroll up to "Selected Work" and "Lab and research work" for the full writeups, or see everything on <a href="${LINKS.github}">GitHub</a>.`,
    },
    {
      id: 'education',
      triggers: ['study', 'studying', 'school', 'university', 'degree', 'gpa', 'major', 'usf'],
      respond: () => `He's studying Computer Science at the University of San Francisco, expected to graduate in 2028, with a 3.91/4.00 GPA. His coursework leans into data structures and algorithms, systems programming, and applied AI.`,
    },
    {
      id: 'availability',
      triggers: ['internship', 'available', 'availability', 'hiring', 'open to', 'looking for work', 'job'],
      respond: () => `He's open to internships and research roles, based in San Francisco. He's currently a CS student at USF with hands-on experience in wearable research tooling and applied AI — reach out if that overlaps with what you're building.`,
    },
    {
      id: 'contact',
      triggers: ['contact', 'reach him', 'email', 'linkedin', 'get in touch'],
      respond: () => `Best ways to reach him: <a href="${LINKS.email}">pauliusgedrimas@gmail.com</a> or <a href="${LINKS.linkedin}">LinkedIn</a>. His code lives on <a href="${LINKS.github}">GitHub</a>, and the full résumé is <a href="${LINKS.resume}">here</a>.`,
    },
    {
      id: 'theme-dark',
      triggers: ['dark mode', 'dark theme', 'night mode', 'make it dark', 'go dark'],
      action: 'theme-dark',
      respond: () => `Done — switched to dark mode. Say "light mode" to switch back.`,
    },
    {
      id: 'theme-light',
      triggers: ['light mode', 'light theme', 'day mode', 'make it light'],
      action: 'theme-light',
      respond: () => `Done — switched to light mode.`,
    },
    {
      id: 'theme-toggle',
      triggers: ['toggle theme', 'switch theme', 'change theme', 'switch the theme'],
      action: 'theme-toggle',
      respond: () => `Toggled the theme — say "dark mode" or "light mode" if you want a specific one.`,
    },
  ];

  function normalize(input) {
    return String(input)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function respond(raw) {
    const text = ` ${normalize(raw)} `;
    let best = null;
    let bestScore = 0;
    for (const intent of INTENTS) {
      let score = 0;
      for (const trigger of intent.triggers) {
        if (text.includes(` ${trigger} `) || text.includes(trigger)) score += trigger.split(' ').length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = intent;
      }
    }
    if (!best) return { text: FALLBACK, action: null };
    return { text: best.respond(), action: best.action || null };
  }

  const api = { respond, QUICK_QUESTIONS, LINKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AssistantData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
