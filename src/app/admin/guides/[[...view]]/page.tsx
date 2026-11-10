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
const RESERVED = new Set(['new', 'settings', 'topics']);

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
  const [guides, settings, taken] = await Promise.all([listAllGuides(), getEngineSettings(), takenSlots()]);
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
};

function blockSummary(b: Block): string {
  const text =
    'text' in b ? b.text : b.type === 'workout' ? b.title : b.type === 'list' ? b.items[0] ?? '' : b.type === 'table' ? b.caption ?? b.header.join(', ') : b.type === 'faq' ? b.items[0]?.question ?? '' : b.type === 'calculator' ? b.tool : b.type === 'cta' ? b.variant : 'sources';
  return text.length > 60 ? text.slice(0, 57) + '…' : text;
}

async function Review({ slug, search }: { slug: string; search: Search }) {
  const guide = await getGuide(slug);
  if (!guide) notFound();
  const [comments, revisions, published, settings, taken, run] = await Promise.all([
    listComments(slug),
    listRevisions(slug),
    listPublishedGuides().catch(() => []),
    getEngineSettings(),
    takenSlots(),
    getRun(slug),
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
        <p className="text-sm text-muted-foreground">The engine drafts from the top, passing over topics whose tool is not built yet.</p>
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
