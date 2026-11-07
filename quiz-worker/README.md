# Enable textbook AI quizzes

SSC Compass includes links to the nine Balbharati editions supplied for the app and opens each chapter at its first page. Books are streamed from Balbharati through the Pages site and rendered in the in-app reader. The Pages build copies the PDF.js reader into dist during npm ci. The public GitHub repository contains page mappings and code, with no textbook PDFs or secret keys.

The quiz Worker accepts only a known chapter ID from a signed-in, allowlisted adult Firebase user. It reads a fresh selection of up to eight pages from that chapter, requests five age-appropriate MCQs, validates the response format and page bounds. The browser grades answers locally. The provider receives the public textbook excerpt and a chapter prompt. It does not receive the Firebase ID, account details, marks, or answers.

## Cloudflare Pages setup

Use the Cloudflare Pages project that already hosts SSC Compass. For a Git-connected build, select the repository root, framework preset **None**, build command `npm ci`, and output directory `dist`. The root `functions` folder provides `/api/quiz`. A dashboard drag-and-drop of `dist` alone only publishes static files.

Open **Workers & Pages → your Pages project → Settings → Variables and Secrets**. In **Production**, add encrypted secrets:

| Secret | Value |
| --- | --- |
| `GROQ_API_KEY` | Your Groq API key |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `ADULT_FIREBASE_UIDS` | Your adult account’s UID from Firebase Authentication → Users. Separate multiple adult UIDs with commas. |

Redeploy from the connected repository after saving the secrets. Sign in with the listed adult account and open **Lessons → AI quiz**. Review the quiz and use Copy quiz link to share it. Your sister can open the link and practise without contacting either provider. The quiz uses the chosen lesson’s PDF pages automatically.

The existing Firebase project and sign-in still work. The Pages Function uses the app’s Firebase web configuration. Only set `FIREBASE_WEB_API_KEY` if this deployment uses a different Firebase project. The browser calls the Pages site directly without a separate Worker URL.

Groq handles English-language textbook text. OpenRouter handles PDF/OCR requests, including Marathi and Hindi, and can take over when Groq cannot produce a valid quiz. OpenRouter PDF OCR and model calls can incur charges. Set a spending limit on the OpenRouter key. The Pages Function limits bursts per isolate. That limit does not replace a provider spending cap.

Keep keys out of the browser, GitHub, and chat. Live generation requires the Pages deployment and secrets. Reading textbooks and opening a shared quiz link work without AI credentials.
