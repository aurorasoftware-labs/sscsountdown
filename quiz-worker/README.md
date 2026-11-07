# Enable textbook AI quizzes

SSC Compass includes links to the nine Balbharati editions supplied for the app and opens each chapter at its first page. Books are served by Balbharati. The public GitHub repository contains page mappings and code, with no textbook PDFs or secret keys.

The quiz Worker accepts only a known chapter ID from a signed-in, allowlisted Firebase user. It reads a fresh selection of up to eight pages from that chapter, requests five age-appropriate MCQs, validates the returned answers and references, and screens the generated content. The browser grades answers locally. The provider receives the public textbook excerpt and a chapter prompt. It does not receive the student's Firebase ID, account details, marks, or answers.

## Activate the service

1. Create a restricted **OpenAI API project key** for the quiz service. Enable API billing on that project and set a usage alert or project budget. An API project budget alert is not a hard spending cap. Keep this key out of Firebase settings, the browser, GitHub, and chat.
2. Sign into Cloudflare with `npx wrangler login` from the `quiz-worker` directory after running `npm ci`. If the Worker is deployed under a different app hostname, adjust `APP_ORIGIN` in `wrangler.toml`.
3. From `quiz-worker`, run the following and enter values when prompted.

   ```sh
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put FIREBASE_WEB_API_KEY
   npx wrangler secret put ALLOWED_FIREBASE_UIDS
   npm run deploy
   ```

   Use the existing Firebase web API key for `FIREBASE_WEB_API_KEY`. For `ALLOWED_FIREBASE_UIDS`, use the student's UID from Firebase Authentication → Users. Separate multiple authorised UIDs with commas. Set a Cloudflare plan with sufficient Worker CPU if large PDFs hit the free plan's CPU limit.
4. Set `endpoint` in `dist/quiz-config.js` to the deployed Worker URL plus `/quiz`, and redeploy Firebase Hosting. Sign into the allowlisted account and use **Lessons → AI quiz**.

The Worker limits quiz requests per authorised account. The live hosted quiz still needs a configured Worker and an API key before it can generate questions. The textbook links work independently.
