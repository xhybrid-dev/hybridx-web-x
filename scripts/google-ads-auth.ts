/**
 * One-time Google sign-in for Keyword Planner (docs/content-engine-plan.md,
 * step 10). Run it on your own computer, once:
 *
 *   npx tsx scripts/google-ads-auth.ts <client-id> <client-secret>
 *
 * (or put GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in .env and run it
 * with no arguments). The client is an OAuth client of type "Desktop app", in
 * a Google Cloud project whose consent screen is set to "In production":
 * left in "Testing", Google expires the refresh token after seven days and
 * the weekly volume check starts failing.
 *
 * It prints a link. Open it, sign in as the Google user who can see the Ads
 * account, and allow access. The browser comes back to this script on
 * 127.0.0.1, which prints the refresh token, once, for you to store as the
 * GOOGLE_ADS_REFRESH_TOKEN secret. Nothing is written to disk.
 *
 * When the browser is on another machine (the script runs over SSH, in a
 * container or in WSL), that last step lands on a "can't connect" page.
 * Copy the whole address from the browser's address bar and paste it into
 * this terminal instead: the script takes whichever arrives first.
 *
 * The scope is Google Ads only. The site uses it for one read-only call,
 * GenerateKeywordHistoricalMetrics; it creates no campaigns and spends nothing.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createInterface } from 'node:readline';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/adwords';

async function main() {
  const [argId, argSecret] = process.argv.slice(2);
  const clientId = argId || process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = argSecret || process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Usage: npx tsx scripts/google-ads-auth.ts <client-id> <client-secret>');
    process.exit(1);
  }

  const state = randomBytes(16).toString('hex');
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();

  const url = client.generateAuthUrl({
    access_type: 'offline',
    // Always ask, so Google always returns a refresh token, even on a second run.
    prompt: 'consent',
    scope: [SCOPE],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
  console.log('\nOpen this link, sign in, and allow access:\n');
  console.log(url);
  console.log('\nWaiting for Google to send you back here...');
  console.log('If your browser shows "can\'t connect" instead, copy the whole address from its');
  console.log('address bar (it starts http://127.0.0.1) and paste it here, then press Enter:\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>((resolve, reject) => {
    const finish = (params: URLSearchParams): string | null => {
      if (params.get('state') !== state) return 'That was not the sign-in this script started.';
      const got = params.get('code');
      server.close();
      rl.close();
      if (got) resolve(got);
      else reject(new Error(params.get('error') ?? 'no code returned'));
      return null;
    };
    rl.on('line', (line) => {
      const text = line.trim();
      if (!text) return;
      let params: URLSearchParams;
      try {
        params = new URL(text).searchParams;
      } catch {
        console.log('That is not an address. Paste the whole http://127.0.0.1... address.');
        return;
      }
      const problem = finish(params);
      if (problem) console.log(`${problem} Paste the address from this run's sign-in.`);
    });
    server.on('request', (req, res) => {
      const params = new URL(req.url ?? '/', redirectUri).searchParams;
      if (params.get('state') !== state) {
        res.writeHead(400).end('That was not the sign-in this script started. Close this tab.');
        return;
      }
      const error = params.get('error');
      const got = params.get('code');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end(
        got ? 'Signed in. You can close this tab and go back to the terminal.' : `Sign-in failed: ${error ?? 'no code'}`,
      );
      finish(params);
    });
  });

  const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: redirectUri });
  if (!tokens.refresh_token) {
    console.error('\nGoogle did not return a refresh token. Remove this app from https://myaccount.google.com/permissions and run again.');
    process.exit(1);
  }
  console.log('\nThe refresh token (shown once; store it, then clear your terminal):\n');
  console.log(tokens.refresh_token);
  console.log('\nStore it as a secret. The command asks for the value; paste it there:\n');
  console.log('  firebase apphosting:secrets:set GOOGLE_ADS_REFRESH_TOKEN --project hybridx-hub\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
