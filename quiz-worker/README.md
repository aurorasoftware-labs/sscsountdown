# Enable textbook AI quizzes

SSC Compass includes links to the nine Balbharati editions supplied for the app and opens each chapter at its first page. Books are served by Balbharati. The public GitHub repository contains page mappings and code, with no textbook PDFs or secret keys.

The quiz Worker accepts only a known chapter ID from a signed-in, allowlisted adult Firebase user. It reads a fresh selection of up to eight pages from that chapter, requests five age-appropriate MCQs, validates the response format and page bounds. The browser grades answers locally. The provider receives the public textbook excerpt and a chapter prompt. It does not receive the Firebase ID, account details, marks, or answers.

## Activate the service

1. Create **Groq** and **OpenRouter** API keys. Keep both out of Firebase settings, the browser, GitHub, and chat. OpenRouter PDF OCR and model usage can incur charges. Configure a spending limit on the OpenRouter key.
2. Sign into Cloudflare with `npx wrangler login` from the `quiz-worker` directory after running `npm ci`. If the Worker is deployed under a different app hostname, adjust `APP_ORIGIN` in `wrangler.toml`.
3. From `quiz-worker`, run the following and enter values when prompted.

   ```sh
   npx wrangler secret put GROQ_API_KEY
   npx wrangler secret put OPENROUTER_API_KEY
   npx wrangler secret put FIREBASE_WEB_API_KEY
   npx wrangler secret put ADULT_FIREBASE_UIDS
   npm run deploy
   ```

   Use the existing Firebase web API key for `FIREBASE_WEB_API_KEY`. For `ADULT_FIREBASE_UIDS`, use your adult account’s UID from Firebase Authentication → Users. Separate multiple authorised UIDs with commas. Set a Cloudflare plan with sufficient Worker CPU if large PDFs hit the free plan's CPU limit.
4. Set `endpoint` in `dist/quiz-config.js` to the deployed Worker URL plus `/quiz`, and redeploy Firebase Hosting. Sign into the allowlisted adult account and use **Lessons → AI quiz**. Review the quiz and download it to share. The student can open the quiz file from that lesson without contacting either provider.

The Worker limits quiz requests per authorised adult account. It tries Groq for English-language chapter text and uses OpenRouter for PDF/OCR, including Marathi and Hindi, or if Groq cannot produce a valid quiz. The live hosted quiz still needs a configured Worker and an API key before it can generate questions. The textbook links work independently.
