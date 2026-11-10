import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import LogoutButton from '@/app/admin/leads/LogoutButton';
import ArticleBody from '@/components/guides/ArticleBody';
import GuideEditor from '@/components/admin/guides/GuideEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSession } from '@/lib/admin-auth';
import { loginUrlFor } from '@/lib/admin-return';
import { canEdit, stillHasPlaceholders } from '@/lib/guides/review';
import { listBacklinkStates, listProposals, type LinkProposal } from '@/lib/guides/backlinks';
import { parseInline } from '@/lib/guides/inline';
import { HARVEST_EVERY_MS, getHarvest, getHarvestState, listMetrics } from '@/lib/guides/harvest/run';
import { asQuestion } from '@/lib/guides/harvest/analyse';
import { FLAG_WORDS, leadsByGuide, listClicks, performanceRows } from '@/lib/guides/performance';
import { engineOn, getRun } from '@/lib/guides/engine/run';
import { isDraftable, listTopics } from '@/lib/guides/queue';
import { DAY_NAMES, describeSlot, nextFreeSlot, type EngineSettings } from '@/lib/guides/slots';
import {
  getEngineSettings,
  getGuide,
  listAllGuides,
  listComments,
  listPublishedGuides,
  listRevisions,
  reviewAddress,
  takenSlots,
} from '@/lib/guides/store';
import { PILLARS, TOOLS, pillar as pillarOf } from '@/lib/guides/topics';
import type { Block, Guide, GuideStatus } from '@/lib/guides/types';
import {
  addTopicAction,
  approveGuide,
  commentOnGuide,
  decideLinkAction,
  createGuide,
  moveTopicAction,
  requeueTopicAction,
  seedTopicsAction,
  skipTopicAction,
  rejectGuide,
  resolveGuideComment,
  retireGuide,
  saveGuideEdit,
  saveSettings,
  unscheduleGuide,
} from '../actions';

// Article review (docs/content-engine-plan.md, step 3). Behind the same
// Firebase Auth allow-list as the other admin pages, checked on every request.
// A review email links to /admin/guides/<slug>; signed out, you are sent to
// sign in and brought back here.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Guides', robots: { index: false, follow: false } };

const BASE = '/admin/guides';
const RESERVED = new Set(['new', 'settings', 'topics', 'search', 'performance']);

const STATUS_WORDS: Record<GuideStatus, string> = {
  drafting: 'Being drafted',
  awaiting_review: 'Waiting for your review',
  revising: 'Being revised after your comment',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  retired: 'Retired',
  rejected: 'Turned down',
};

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function GuidesAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<Search>;
}) {
  const { view = [] } = await params;
  const search = await searchParams;
  const path = `${BASE}${view.length ? '/' + view.join('/') : ''}`;
  const session = await getAdminSession();
  if (!session) redirect(loginUrlFor(path + (one(search.action) ? `?action=${one(search.action)}` : '')));

  let body: React.ReactNode;
  if (view.length === 0) body = <Queue />;
  else if (view.length === 1 && view[0] === 'new') body = <NewArticle error={one(search.error)} />;
  else if (view.length === 1 && view[0] === 'settings') body = <Settings done={one(search.done)} error={one(search.error)} />;
  else if (view.length === 1 && view[0] === 'topics') body = <Topics done={one(search.done)} error={one(search.error)} />;
  else if (view.length === 1 && view[0] === 'search') body = <SearchView />;
  else if (view.length === 1 && view[0] === 'performance') body = <Performance />;
  else if (view.length === 1 && !RESERVED.has(view[0])) body = await Review({ slug: view[0], search });
  else if (view.length === 2 && view[1] === 'edit') body = await Edit({ slug: view[0] });
  else notFound();

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">
              <Link href={BASE}>Guides</Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {session.email} ·{' '}
              {session.lasting
                ? 'stays signed in for 14 days'
                : 'one-hour sign-in (14 days needs the one-off setup in docs/content-engine-plan.md, step 3)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={`${BASE}/topics`} className="underline underline-offset-4">
              Topics
            </Link>
            <Link href={`${BASE}/search`} className="underline underline-offset-4">
              Search
            </Link>
            <Link href={`${BASE}/performance`} className="underline underline-offset-4">
              Performance
            </Link>
            <Link href={`${BASE}/new`} className="underline underline-offset-4">
              New article
            </Link>
            <Link href={`${BASE}/settings`} className="underline underline-offset-4">
              Settings
            </Link>
            <Link href="/admin/leads" className="underline underline-offset-4">
              Leads
            </Link>
            <LogoutButton />
          </div>
        </header>
        {body}
      </div>
    </div>
  );
}

/* ── The queue ───────────────────────────────────────────────────────────── */

async function Queue() {
  const [guides, settings, taken, waitingLinks] = await Promise.all([
    listAllGuides(),
    getEngineSettings(),
    takenSlots(),
    listProposals({ status: 'proposed' }),
  ]);
  const linkTargets = [...new Set(waitingLinks.map((p) => p.target))];
  const next = nextFreeSlot(new Date(), taken, settings);
  const groups: { title: string; statuses: GuideStatus[]; empty: string }[] = [
    { title: 'Waiting for you', statuses: ['awaiting_review', 'revising', 'drafting'], empty: 'Nothing to review.' },
    { title: 'Scheduled', statuses: ['scheduled', 'approved'], empty: 'Nothing scheduled.' },
    { title: 'Published', statuses: ['published'], empty: 'Nothing published yet.' },
    { title: 'Turned down and retired', statuses: ['rejected', 'retired'], empty: 'None.' },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm">
        Next free slot: <strong>{describeSlot(next)}</strong>
        {settings.paused && <> · <strong>Paused</strong>: no new drafts until you resume it in settings.</>}
      </p>
      {linkTargets.length > 0 && (
        <section className="space-y-2 rounded-lg border-2 border-accent p-4 text-sm">
          <h2 className="font-headline text-lg font-bold">Links to check</h2>
          <ul className="space-y-1">
            {linkTargets.map((target) => (
              <li key={target}>
                <Link href={`${BASE}/${target}#links`} className="underline underline-offset-4">
                  {guides.find((g) => g.slug === target)?.title ?? target}
                </Link>{' '}
                · {waitingLinks.filter((p) => p.target === target).length} suggestion(s) from older articles
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map((group) => {
        const rows = guides
          .filter((g) => group.statuses.includes(g.status))
          .sort((a, b) =>
            group.title === 'Scheduled' ? (a.publishAt ?? '').localeCompare(b.publishAt ?? '') : 0,
          );
        return (
          <section key={group.title} className="space-y-3">
            <h2 className="font-headline text-lg font-bold">
              {group.title} <span className="font-normal text-muted-foreground">({rows.length})</span>
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{group.empty}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {rows.map((g) => (
                  <li key={g.slug}>
                    <Link href={`${BASE}/${g.slug}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-secondary/60">
                      <span className="font-semibold">{g.title}</span>
                      <span className="text-sm text-muted-foreground">{statusLine(g)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function statusLine(g: Guide): string {
  if (g.status === 'scheduled' && g.publishAt) return `Goes live ${describeSlot(g.publishAt)}`;
  if (g.status === 'published' && g.publishedAt) return `Published ${DATE_TIME.format(new Date(g.publishedAt))}`;
  return `${STATUS_WORDS[g.status]} · revision ${g.revision}, ${DATE_TIME.format(new Date(g.updatedAt))}`;
}

/* ── One article ─────────────────────────────────────────────────────────── */

const DONE: Record<string, (g: Guide) => string> = {
  scheduled: (g) => `Approved. It goes live ${g.publishAt ? describeSlot(g.publishAt) : 'at the next slot'}.`,
  published: () => 'Published. It is live now.',
  unscheduled: () => 'Taken out of its slot. It is waiting for review again.',
  rejected: () => 'Turned down.',
  retired: (g) => (g.redirectTo ? `Retired. Its readers now go to ${g.redirectTo}.` : 'Retired. Its page is gone.'),
  commented: () => 'Comment saved.',
  revising: () => 'Comment saved. The engine revises the article on its next hourly run, and emails you when it is ready.',
  saved: (g) => `Saved as revision ${g.revision}.`,
  'link-applied': () => 'Link accepted, and it is in: the older article has a new revision.',
  'link-accepted': () => 'Link accepted. It goes into the older article when this one goes live.',
  'link-skipped': () => 'Link skipped.',
  'link-stale': () => 'That paragraph has changed since the suggestion, so the link was not put in.',
};

const LINK_STATUS: Record<LinkProposal['status'], string> = {
  proposed: 'Waiting for you',
  accepted: 'Accepted: goes in when this article goes live',
  skipped: 'Skipped',
  applied: 'In',
  stale: 'Not put in',
};

/** The words of the new link in a suggested paragraph. */
function linkWords(p: LinkProposal): string {
  const path = `/guides/${p.target}`;
  for (const t of parseInline(p.after)) if (t.kind === 'link' && t.href.split('#')[0] === path) return t.text;
  return '';
}

function blockSummary(b: Block): string {
  const text =
    'text' in b ? b.text : b.type === 'workout' ? b.title : b.type === 'list' ? b.items[0] ?? '' : b.type === 'table' ? b.caption ?? b.header.join(', ') : b.type === 'faq' ? b.items[0]?.question ?? '' : b.type === 'calculator' ? b.tool : b.type === 'cta' ? b.variant : 'sources';
  return text.length > 60 ? text.slice(0, 57) + '…' : text;
}

async function Review({ slug, search }: { slug: string; search: Search }) {
  const guide = await getGuide(slug);
  if (!guide) notFound();
  const [comments, revisions, published, settings, taken, run, proposals, linkState] = await Promise.all([
    listComments(slug),
    listRevisions(slug),
    listPublishedGuides().catch(() => []),
    getEngineSettings(),
    takenSlots(),
    getRun(slug),
    listProposals({ target: slug }),
    listBacklinkStates().then((all) => all.find((s) => s.target === slug)),
  ]);
  const articles = new Set(published.map((g) => g.slug));
  const action = one(search.action);
  const done = one(search.done);
  const error = one(search.error);
  const reviewable = guide.status === 'awaiting_review' || guide.status === 'revising';
  const placeholders = stillHasPlaceholders(guide);
  const next = nextFreeSlot(new Date(), taken, settings);
  const open = comments.filter((c) => c.status === 'open');
  const highlight = (name: string) => (action === name ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : '');

  return (
    <div className="space-y-8">
      {done && DONE[done] && (
        <p role="status" className="rounded-md border-2 border-accent bg-accent/10 p-3 text-sm font-semibold">
          {DONE[done](guide)}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border-2 border-foreground p-3 text-sm font-semibold">
          {error}
        </p>
      )}

      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {pillarOf(guide.pillar).name} · {STATUS_WORDS[guide.status]} · revision {guide.revision}
        </p>
        <h2 className="font-headline text-2xl font-bold">{guide.title}</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {canEdit(guide.status) && (
            <Link href={`${BASE}/${slug}/edit`} className="underline underline-offset-4">
              Edit
            </Link>
          )}
          {guide.status === 'published' && (
            <Link href={`/guides/${slug}`} className="underline underline-offset-4">
              View live page
            </Link>
          )}
        </div>
      </section>

      {/* ── What you can do now ── */}
      {reviewable && (
        <section id="approve" className={`space-y-3 rounded-lg border p-4 ${highlight('approve')}`}>
          <h3 className="font-headline font-bold">Approve</h3>
          {placeholders ? (
            <p className="text-sm">
              This article still has placeholder text. <Link className="underline" href={`${BASE}/${slug}/edit`}>Edit it</Link> before approving.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form action={approveGuide}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="when" value="slot" />
                <Button type="submit" autoFocus={action === 'approve'}>
                  Approve for {describeSlot(next)}
                </Button>
              </form>
              <form action={approveGuide}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="when" value="now" />
                <Button type="submit" variant="outline">
                  Publish now
                </Button>
              </form>
            </div>
          )}
          {open.length > 0 && <p className="text-sm text-muted-foreground">There {open.length === 1 ? 'is 1 open comment' : `are ${open.length} open comments`} below.</p>}
        </section>
      )}

      {guide.status === 'scheduled' && guide.publishAt && (
        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="font-headline font-bold">Goes live {describeSlot(guide.publishAt)}</h3>
          <form action={unscheduleGuide}>
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit" variant="outline">
              Take it out of its slot
            </Button>
          </form>
        </section>
      )}

      {guide.status === 'rejected' && guide.rejectionReason && (
        <p className="rounded-lg border p-4 text-sm">
          <strong>Turned down:</strong> {guide.rejectionReason}
        </p>
      )}

      {/* ── What the checks and the reviewer found (drafts from the engine) ── */}
      {run && (run.checks || run.review || run.error) && (
        <section className="space-y-2 rounded-lg border p-4 text-sm">
          <h3 className="font-headline font-bold">What the checks and the reviewer found</h3>
          {run.error && <p>A step failed: {run.error}</p>}
          {run.checks && (
            <>
              <p>{run.checks.errors.length ? `${run.checks.errors.length} problem(s) still flagged` : 'All checks passed'} · {run.checks.words} words</p>
              <ul className="list-disc space-y-1 pl-5">
                {run.checks.errors.map((i, n) => (
                  <li key={`e${n}`}>
                    <strong>Problem{i.block ? ` (block ${i.block})` : ''}:</strong> {i.message}
                  </li>
                ))}
                {run.checks.warnings.map((i, n) => (
                  <li key={`w${n}`}>
                    For you to judge{i.block ? ` (block ${i.block})` : ''}: {i.message}
                  </li>
                ))}
              </ul>
            </>
          )}
          {run.review &&
            ('skipped' in run.review ? (
              <p>Second-model review skipped: {run.review.skipped}.</p>
            ) : (
              <>
                <p>
                  Reviewer: {run.review.verdict === 'publishable' ? 'publishable' : 'needs fixes'}. {run.review.summary}
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {run.review.notes.map((note, n) => (
                    <li key={n}>
                      <strong>{note.severity === 'serious' ? 'Serious' : 'Minor'}{note.block ? ` (block ${note.block})` : ''}:</strong> &ldquo;{note.quote}&rdquo; {note.problem}
                    </li>
                  ))}
                </ul>
              </>
            ))}
        </section>
      )}

      {/* ── Links from older articles to this one ── */}
      {(proposals.length > 0 || linkState) && (
        <section id="links" className="space-y-3 rounded-lg border p-4">
          <h3 className="font-headline font-bold">Links from older articles</h3>
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suggestions{linkState?.note ? `: ${linkState.note}` : '.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Each suggestion adds one link to this article inside an older one. Accepted links go in when this article is live, as a new
                revision of the older article.
              </p>
              <ul className="space-y-4">
                {proposals.map((p) => {
                  const source = published.find((g) => g.slug === p.source);
                  return (
                    <li key={p.id} className="space-y-2 rounded-md bg-secondary/40 p-3">
                      <p className="text-sm">
                        In{' '}
                        <Link className="font-semibold underline underline-offset-4" href={`${BASE}/${p.source}`}>
                          {source?.title ?? p.source}
                        </Link>
                        , block {p.block + 1} · <span className="text-muted-foreground">{LINK_STATUS[p.status]}{p.note ? ` (${p.note})` : ''}</span>
                      </p>
                      <ArticleBody slug={p.source} blocks={[{ type: 'paragraph', text: p.after }]} articles={new Set([...articles, p.target])} />
                      <p className="text-sm">
                        Link words: <strong>{linkWords(p)}</strong>
                      </p>
                      {(p.status === 'proposed' || p.status === 'accepted' || p.status === 'skipped') && (
                        <div className="flex flex-wrap gap-2">
                          {p.status !== 'accepted' && (
                            <form action={decideLinkAction}>
                              <input type="hidden" name="slug" value={slug} />
                              <input type="hidden" name="source" value={p.source} />
                              <input type="hidden" name="decision" value="accept" />
                              <Button type="submit" size="sm">
                                Accept
                              </Button>
                            </form>
                          )}
                          {p.status !== 'skipped' && (
                            <form action={decideLinkAction}>
                              <input type="hidden" name="slug" value={slug} />
                              <input type="hidden" name="source" value={p.source} />
                              <input type="hidden" name="decision" value="skip" />
                              <Button type="submit" size="sm" variant="outline">
                                Skip
                              </Button>
                            </form>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {/* ── The article, as it will appear, block by block ── */}
      <section className="space-y-4">
        <div className="space-y-1 rounded-lg bg-secondary/50 p-4 text-sm">
          <p>
            <strong>The point:</strong> {guide.point}
          </p>
          <p>
            <strong>Search description:</strong> {guide.description}
          </p>
        </div>
        <div className="space-y-6 rounded-lg border p-4 md:p-6">
          {guide.blocks.map((block, i) => (
            <div key={i}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Block {i + 1}</p>
              <ArticleBody slug={slug} blocks={[block]} articles={articles} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Comments ── */}
      <section id="comments" className="space-y-3">
        <h3 className="font-headline font-bold">Comments</h3>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {c.blockIndex === null ? 'Whole article' : `Block ${c.blockIndex + 1}`} · revision {c.revision} ·{' '}
                  {DATE_TIME.format(new Date(c.createdAt))} · {c.status === 'open' ? 'Open' : 'Done'}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.text}</p>
                {c.status === 'open' && (
                  <form action={resolveGuideComment} className="mt-2">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Mark done
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit(guide.status) && (
          <form id="comment" action={commentOnGuide} className={`space-y-2 rounded-lg border p-4 ${highlight('comment')}`}>
            <input type="hidden" name="slug" value={slug} />
            <label className="block text-sm font-semibold" htmlFor="comment-on">
              Comment on
            </label>
            <select id="comment-on" name="blockIndex" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
              <option value="">The whole article</option>
              {guide.blocks.map((b, i) => (
                <option key={i} value={i}>
                  Block {i + 1}: {blockSummary(b)}
                </option>
              ))}
            </select>
            <Textarea name="text" rows={3} placeholder="What should change?" autoFocus={action === 'comment'} aria-label="Comment" />
            <Button type="submit">Save comment</Button>
          </form>
        )}
      </section>

      {/* ── Turn down or retire ── */}
      {(reviewable || guide.status === 'scheduled') && (
        <form action={rejectGuide} className="space-y-2 rounded-lg border p-4">
          <input type="hidden" name="slug" value={slug} />
          <h3 className="font-headline font-bold">Turn it down</h3>
          <Textarea name="reason" rows={2} placeholder="Why? So the topic is not offered again." aria-label="Reason" />
          <Button type="submit" variant="outline">
            Turn down
          </Button>
        </form>
      )}
      {guide.status === 'published' && (
        <form action={retireGuide} className="space-y-2 rounded-lg border p-4">
          <input type="hidden" name="slug" value={slug} />
          <h3 className="font-headline font-bold">Retire it</h3>
          <p className="text-sm text-muted-foreground">Takes it off the site. Give a page to send its readers to, or leave empty to remove it.</p>
          <Input name="redirectTo" placeholder="/guides/another-article" aria-label="Send readers to" />
          <Button type="submit" variant="outline">
            Retire
          </Button>
        </form>
      )}

      <section className="space-y-2 text-sm text-muted-foreground">
        <h3 className="font-headline font-bold text-foreground">Revisions</h3>
        <ul>
          {revisions.map((r) => (
            <li key={r.revision}>
              Revision {r.revision} · saved {DATE_TIME.format(new Date(r.savedAt))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ── Editing ─────────────────────────────────────────────────────────────── */

async function Edit({ slug }: { slug: string }) {
  const guide = await getGuide(slug);
  if (!guide) notFound();
  if (!canEdit(guide.status)) redirect(`${BASE}/${slug}?error=${encodeURIComponent(`A ${guide.status} article cannot be edited.`)}`);
  return (
    <GuideEditor
      slug={slug}
      initial={{ title: guide.title, description: guide.description, point: guide.point, pillar: guide.pillar, blocks: guide.blocks }}
      save={saveGuideEdit}
    />
  );
}

/* ── A new article ───────────────────────────────────────────────────────── */

function NewArticle({ error }: { error?: string }) {
  return (
    <form action={createGuide} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-headline text-xl font-bold">New article</h2>
      {error && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-semibold">
          Title: the question it answers
        </label>
        <Input id="title" name="title" maxLength={70} placeholder="How do I train the sled push without a sled?" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="pillar" className="text-sm font-semibold">
          Topic
        </label>
        <select id="pillar" name="pillar" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Create and edit</Button>
    </form>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */

async function Settings({ done, error }: { done?: string; error?: string }) {
  const settings: EngineSettings = await getEngineSettings();
  return (
    <form action={saveSettings} className="space-y-5 rounded-lg border p-4">
      <h2 className="font-headline text-xl font-bold">Settings</h2>
      {done === 'saved' && (
        <p role="status" className="text-sm font-semibold">
          Saved.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Publishing days (UK time)</legend>
        <div className="flex flex-wrap gap-3">
          {DAY_NAMES.map((day, i) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="publishDays" value={i} defaultChecked={settings.publishDays.includes(i)} /> {day}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">Publishing time</span>
          <Input type="time" name="publishTime" defaultValue={settings.publishTime} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">Review emails from</span>
          <Input type="time" name="emailFrom" defaultValue={settings.emailFrom} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">until</span>
          <Input type="time" name="emailTo" defaultValue={settings.emailTo} />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Review emails go to</span>
        <Input type="email" name="reviewAddress" defaultValue={settings.reviewAddress} placeholder={reviewAddress({ ...settings, reviewAddress: '' }) || 'the first admin address'} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="paused" defaultChecked={settings.paused} />
        <span>
          <strong>Pause</strong>: no new drafts or review emails. Articles you have already approved still go live in their slots.
        </span>
      </label>
      <div className="space-y-1 rounded-md bg-secondary/50 p-3 text-sm">
        <p>
          <strong>Drafting engine:</strong>{' '}
          {engineOn() ? 'on (CONTENT_ENGINE_MODE is "on")' : 'off. It drafts nothing until CONTENT_ENGINE_MODE is set to "on" in apphosting.yaml.'}
        </p>
        <p>
          <strong>Second-model reviewer:</strong>{' '}
          {process.env.ANTHROPIC_API_KEY ? 'key present' : 'no key yet: drafts arrive without the second review, and say so'}
        </p>
      </div>
      <Button type="submit">Save settings</Button>
    </form>
  );
}

/* ── The topic queue ─────────────────────────────────────────────────────── */

const TOOL_NAMES: Record<string, string> = { 'week-planner': 'week planner', 'strength-test': 'strength and engine test', 'hyrox-pacer': 'HYROX pacer' };

async function Topics({ done, error }: { done?: string; error?: string }) {
  const topics = await listTopics();
  if (!topics.length) {
    return (
      <form action={seedTopicsAction} className="space-y-3 rounded-lg border p-4">
        <h2 className="font-headline text-xl font-bold">Topics</h2>
        <p className="text-sm">The queue is empty. The engine loads the starting list of 32 questions on its first run, or you can load it now.</p>
        <Button type="submit">Load the starting list</Button>
      </form>
    );
  }
  const queued = topics.filter((t) => t.status === 'queued');
  const history = topics.filter((t) => t.status !== 'queued');
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold">Topics</h2>
        <p className="text-sm text-muted-foreground">
          The engine drafts from the top, passing over topics whose tool is not built yet. Each week the search harvest puts your own
          questions and anything you moved up first, then topics people are searching for, highest score first, then the rest. Anything
          you move down stays at the back.
        </p>
      </div>
      {done && (
        <p role="status" className="rounded-md border-2 border-accent bg-accent/10 p-3 text-sm font-semibold">
          {done === 'added' ? 'Added to the front of the queue.' : done === 'skipped' ? 'Skipped. It will not be drafted.' : 'Back in the queue.'}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border-2 border-foreground p-3 text-sm font-semibold">
          {error}
        </p>
      )}
      <form action={addTopicAction} className="space-y-2 rounded-lg border p-4">
        <label htmlFor="question" className="block text-sm font-semibold">
          Your own question, drafted next
        </label>
        <Input id="question" name="question" maxLength={160} placeholder="How long should I rest between wall ball sets?" />
        <select name="pillar" aria-label="Topic" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit">Add to the front</Button>
      </form>

      <section className="space-y-2">
        <h3 className="font-headline font-bold">Queued ({queued.length})</h3>
        <ol className="divide-y rounded-lg border">
          {queued.map((t, i) => (
            <li key={t.id} className="space-y-2 px-4 py-3 text-sm">
              <p>
                <span className="font-semibold">{t.question}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {pillarOf(t.pillar).name}
                  {t.tool ? ` · tool: ${TOOLS[t.tool].name}` : ''}
                  {!isDraftable(t) && t.needs ? ` · waits for the ${TOOL_NAMES[t.needs] ?? t.needs}` : ''}
                  {t.source === 'jon' ? ' · yours' : ''}
                  {t.source === 'search' ? ' · from search' : ''}
                  {t.search && t.search.score > 0 ? ` · ${t.search.impressions} impressions, position ${t.search.position}` : ''}
                  {t.held ? ` · moved ${t.held} by you` : ''}
                  {t.failures ? ` · ${t.failures} failed attempt` : ''}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(['up', 'down'] as const).map((direction) => (
                  <form key={direction} action={moveTopicAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="direction" value={direction} />
                    <Button type="submit" size="sm" variant="ghost" disabled={direction === 'up' ? i === 0 : i === queued.length - 1}>
                      Move {direction}
                    </Button>
                  </form>
                ))}
                <form action={skipTopicAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <Input name="reason" placeholder="Why skip?" className="h-8 w-40" aria-label="Reason for skipping" />
                  <Button type="submit" size="sm" variant="outline">
                    Skip
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-headline font-bold">Drafted and skipped</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {history.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  {t.guideSlug ? <Link className="underline" href={`${BASE}/${t.guideSlug}`}>{t.question}</Link> : t.question}
                  <span className="text-muted-foreground">
                    {' '}
                    · {t.status === 'skipped' ? `skipped${t.skipReason ? `: ${t.skipReason}` : ''}` : t.status}
                  </span>
                </span>
                {t.status === 'skipped' && (
                  <form action={requeueTopicAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Put back
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ── Search Console ──────────────────────────────────────────────────────── */

const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' });

async function SearchView() {
  const [state, metrics, guides] = await Promise.all([getHarvestState(), listMetrics(), listAllGuides()]);
  const record = state.lastHarvestId ? await getHarvest(state.lastHarvestId) : null;
  const nextAt = state.lastHarvestAt ? new Date(Date.parse(state.lastHarvestAt) + HARVEST_EVERY_MS) : null;
  const groups = record?.groups ?? [];
  const refresh = groups.filter((g) => g.kind === 'refresh').slice(0, 20);
  const elsewhere = groups.filter((g) => g.kind === 'covered' && g.guideSlug && g.pages[0] && g.pages[0].page !== `/guides/${g.guideSlug}`).slice(0, 10);
  const added = new Set(record?.added.map((a) => a.question) ?? []);
  const fresh = groups.filter((g) => g.kind === 'new' && !added.has(asQuestion(g.top))).slice(0, 10);
  const owned = groups.filter((g) => g.kind === 'owned').slice(0, 10);
  const published = guides.filter((g) => g.status === 'published');
  const cell = 'px-3 py-2 text-left align-top';

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-headline text-xl font-bold">Search</h2>
        <p className="text-sm text-muted-foreground">
          What people search for, read from Search Console once a week: 28 days ending three days before the harvest.
        </p>
        <p className="text-sm">
          {record ? (
            <>
              Last harvest {DAY.format(new Date(record.at))} ({record.window.startDate} to {record.window.endDate}):{' '}
              <strong>{record.clicks}</strong> clicks, <strong>{record.impressions}</strong> impressions, {record.rows} rows.
              {nextAt && <> Next after {DAY.format(nextAt)}.</>}
            </>
          ) : (
            'No harvest yet. The first runs on the hourly job once the site can read Search Console.'
          )}
        </p>
        {state.error && (
          <p role="alert" className="rounded-md border-2 border-foreground p-3 text-sm">
            <strong>The last attempt failed:</strong> {state.error} It tries again a day after the attempt.
          </p>
        )}
        <p className="flex flex-wrap gap-4 text-sm">
          <a className="underline underline-offset-4" href="/api/admin/search-console-check">
            Check access
          </a>
          {record && (
            <a className="underline underline-offset-4" href={`/api/admin/search-console-export?harvest=${record.id}`}>
              Download as CSV
            </a>
          )}
        </p>
      </div>

      {record && (
        <>
          <section className="space-y-2">
            <h3 className="font-headline font-bold">Added to the queue ({record.added.length})</h3>
            {record.added.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {record.added.map((a) => (
                  <li key={a.id}>
                    {a.question} · {a.impressions} impressions · score {a.score}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing new was searched for often enough this time.</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-headline font-bold">Pages to improve ({refresh.length})</h3>
            <p className="text-sm text-muted-foreground">Ranking 4 to 20: close enough that a clearer answer can move them up. Highest score first.</p>
            <ul className="divide-y rounded-lg border text-sm">
              {refresh.map((g) => (
                <li key={g.key} className="space-y-1 px-4 py-3">
                  <p>
                    <strong>&ldquo;{g.top}&rdquo;</strong> · {g.impressions} impressions · position {g.position.toFixed(1)} · score {g.score}
                  </p>
                  <p className="text-muted-foreground">
                    {g.why}
                    {g.guideSlug && (
                      <>
                        {' '}
                        <Link className="underline" href={`${BASE}/${g.guideSlug}/edit`}>
                          Edit the article
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
              {!refresh.length && <li className="px-4 py-3 text-muted-foreground">None this week.</li>}
            </ul>
          </section>

          {elsewhere.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-headline font-bold">Answered, but searchers land elsewhere ({elsewhere.length})</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {elsewhere.map((g) => (
                  <li key={g.key}>
                    &ldquo;{g.top}&rdquo;: {g.why}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-headline font-bold">Other searches nothing answers yet</h3>
            <p className="text-sm text-muted-foreground">Below the bar for adding automatically, or past this week&rsquo;s five. Add any you want written.</p>
            <ul className="divide-y rounded-lg border text-sm">
              {fresh.map((g) => (
                <li key={g.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span>
                    <strong>&ldquo;{g.top}&rdquo;</strong> · {g.impressions} impressions · {pillarOf(g.pillar).name}
                  </span>
                  <form action={addTopicAction}>
                    <input type="hidden" name="question" value={asQuestion(g.top)} />
                    <input type="hidden" name="pillar" value={g.pillar} />
                    <Button type="submit" size="sm" variant="outline">
                      Add to the front
                    </Button>
                  </form>
                </li>
              ))}
              {!fresh.length && <li className="px-4 py-3 text-muted-foreground">None.</li>}
            </ul>
          </section>

          {owned.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-headline font-bold">Already in the top three</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {owned.map((g) => (
                  <li key={g.key}>
                    &ldquo;{g.top}&rdquo; · {g.page} · position {g.position.toFixed(1)} · {g.clicks} clicks
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="space-y-2">
        <h3 className="font-headline font-bold">Articles</h3>
        {published.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className={cell}>Article</th>
                  <th className={cell}>Clicks</th>
                  <th className={cell}>Impressions</th>
                  <th className={cell}>Position</th>
                  <th className={cell}>Indexed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {published.map((g) => {
                  const m = metrics.find((x) => x.slug === g.slug);
                  return (
                    <tr key={g.slug}>
                      <td className={cell}>
                        <Link className="underline" href={`${BASE}/${g.slug}`}>
                          {g.title}
                        </Link>
                        {m?.queries?.length ? <p className="text-xs text-muted-foreground">{m.queries.join(' · ')}</p> : null}
                      </td>
                      <td className={cell}>{m?.clicks ?? '–'}</td>
                      <td className={cell}>{m?.impressions ?? '–'}</td>
                      <td className={cell}>{m?.position ?? '–'}</td>
                      <td className={cell}>
                        {m?.index ? (m.index.verdict === 'PASS' ? 'Yes' : m.index.coverageState ?? m.index.verdict) : 'Not checked yet'}
                        {m?.index && <p className="text-xs text-muted-foreground">checked {DAY.format(new Date(m.index.checkedAt))}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing published yet.</p>
        )}
      </section>
    </div>
  );
}

/* ── Performance ─────────────────────────────────────────────────────────── */

async function Performance() {
  const [guides, metrics, clicks, leads] = await Promise.all([listAllGuides(), listMetrics(), listClicks(), leadsByGuide()]);
  const rows = performanceRows(guides, metrics, clicks, leads, new Date());
  const flagged = rows.filter((r) => r.flags.length);
  const cell = 'px-3 py-2 text-left align-top';
  const n = (v: number | undefined) => (v === undefined ? '–' : v);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-headline text-xl font-bold">Performance</h2>
        <p className="text-sm text-muted-foreground">
          Search numbers are the 28 days of the latest weekly harvest. Tool and call-to-action clicks are counted on the server for every
          reader, with nothing stored about them. Leads are free-plan sign-ups that came through an article&rsquo;s call to action.
        </p>
      </div>

      {flagged.length > 0 && (
        <section className="space-y-2 rounded-lg border-2 border-accent p-4 text-sm">
          <h3 className="font-headline font-bold">Needs a look ({flagged.length})</h3>
          <ul className="space-y-2">
            {flagged.map((r) => (
              <li key={r.slug}>
                <Link className="font-semibold underline" href={`${BASE}/${r.slug}`}>
                  {r.title}
                </Link>
                {r.flags.map((f) => (
                  <p key={f} className="text-muted-foreground">
                    {FLAG_WORDS[f]}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className={cell}>Article</th>
                <th className={cell}>Days live</th>
                <th className={cell}>Indexed</th>
                <th className={cell}>Clicks</th>
                <th className={cell}>Impressions</th>
                <th className={cell}>Position</th>
                <th className={cell}>Tool clicks</th>
                <th className={cell}>CTA clicks</th>
                <th className={cell}>Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.slug} className={r.flags.length ? 'bg-accent/10' : ''}>
                  <td className={cell}>
                    <Link className="underline" href={`${BASE}/${r.slug}`}>
                      {r.title}
                    </Link>
                  </td>
                  <td className={cell}>{r.days}</td>
                  <td className={cell}>{r.indexed === 'yes' ? 'Yes' : r.indexed === 'no' ? (r.coverage ?? 'No') : 'Not checked yet'}</td>
                  <td className={cell}>{n(r.clicks)}</td>
                  <td className={cell}>{n(r.impressions)}</td>
                  <td className={cell}>{n(r.position)}</td>
                  <td className={cell}>{r.toolClicks}</td>
                  <td className={cell}>{r.ctaClicks}</td>
                  <td className={cell}>{r.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing published yet.</p>
      )}
    </div>
  );
}
