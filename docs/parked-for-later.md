# Parked for later

Things decided to leave alone for now, with what picking each up involves. Add to the top;
delete an entry when it is done.

## `ADMIN_EMAILS` is in `apphosting.yaml` (parked 25 November 2026, Jon: "ok for now")

The repository is public, so the admin allow-list of email addresses in `apphosting.yaml` is
readable by anyone. It is an allow-list, not a credential, so it is low risk. To move it out:

1. Create the secret in the live project and grant the backend read access, *before* editing
   `apphosting.yaml` (a missing secret fails the whole build, see "Deploy gotchas" in `CLAUDE.md`):
   ```bash
   echo -n "a@example.com,b@example.com" | firebase apphosting:secrets:set ADMIN_EMAILS --project hybridx-hub
   firebase apphosting:secrets:grantaccess ADMIN_EMAILS --project hybridx-hub --backend hybridx-web-x
   ```
2. Change the `ADMIN_EMAILS` entry in `apphosting.yaml` from a `value:` to a `secret:` binding.

## `maxInstances: 1` in `apphosting.yaml`

No longer load-bearing: the rate limiter is shared through Firestore. Raise it to 3 to 5 once
`LEAD_TOKEN_SECRET` is confirmed set, or confirmation links minted on one instance fail on
another (see "Known constraints" in `CLAUDE.md`).

## Shop

- A pacing pack that is not branded for Glasgow, and a clearer buy panel (needs a product decision
  on a venue-neutral pack).
- VAT is handled outside the site: prices carry no VAT wording.
