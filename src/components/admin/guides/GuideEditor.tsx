'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EditPayload } from '@/app/admin/guides/actions';
import { CTA_IDS, CTAS } from '@/lib/guides/ctas';
import { PILLARS, TOOLS, TOOL_IDS, type PillarId } from '@/lib/guides/topics';
import type { Block, BlockType } from '@/lib/guides/types';

/*
 * Editing an article without touching code: one small form per block. Lists,
 * workout steps and table rows are one per line; table cells are separated by
 * " | ". Saving runs the same schema the drafts must pass, and the problems
 * come back by block number. Nothing here is saved until Save.
 */

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const cells = (s: string) => s.split('|').map((c) => c.trim());

const NEW_BLOCK: Record<BlockType, () => Block> = {
  heading: () => ({ type: 'heading', level: 2, text: '' }),
  paragraph: () => ({ type: 'paragraph', text: '' }),
  list: () => ({ type: 'list', ordered: false, items: [] }),
  callout: () => ({ type: 'callout', kind: 'tip', text: '' }),
  workout: () => ({
    type: 'workout',
    title: '',
    beginner: { steps: [], rpe: '', rest: '' },
    racePace: { steps: [], rpe: '', rest: '' },
  }),
  table: () => ({ type: 'table', header: ['', ''], rows: [] }),
  calculator: () => ({ type: 'calculator', tool: TOOL_IDS[0] }),
  cta: () => ({ type: 'cta', variant: 'free-plan' }),
  faq: () => ({ type: 'faq', items: [{ question: '', answer: '' }] }),
  sources: () => ({ type: 'sources', items: [] }),
};

const LABEL: Record<BlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  list: 'List',
  callout: 'Callout',
  workout: 'Workout',
  table: 'Table',
  calculator: 'Tool',
  cta: 'Call to action',
  faq: 'Questions',
  sources: 'Sources',
};

export default function GuideEditor({
  slug,
  initial,
  save,
}: {
  slug: string;
  initial: EditPayload;
  save: (slug: string, payload: EditPayload) => Promise<{ ok: true } | { ok: false; errors: string[] }>;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<EditPayload>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState<BlockType>('paragraph');
  const [pending, start] = useTransition();

  const setBlock = (i: number, block: Block) => setDoc((d) => ({ ...d, blocks: d.blocks.map((b, j) => (j === i ? block : b)) }));
  const move = (i: number, by: number) =>
    setDoc((d) => {
      const blocks = [...d.blocks];
      const [b] = blocks.splice(i, 1);
      blocks.splice(i + by, 0, b);
      return { ...d, blocks };
    });
  const remove = (i: number) => setDoc((d) => ({ ...d, blocks: d.blocks.filter((_, j) => j !== i) }));

  const onSave = () =>
    start(async () => {
      let result: Awaited<ReturnType<typeof save>>;
      try {
        result = await save(slug, doc);
      } catch (e) {
        // A failure on the server (or the network) must still say something.
        result = { ok: false, errors: [`The save did not go through: ${e instanceof Error ? e.message : 'unknown error'}. Your edits are still here; try again.`] };
      }
      if (result.ok) {
        // Push alone: the article page is dynamic, so it is fetched fresh. A
        // router.refresh() straight after the push, inside this transition,
        // left the save button spinning for ever on Next 16 although the save
        // had gone through (12 November 2026).
        router.push(`/admin/guides/${slug}?done=saved`);
      } else {
        setErrors(result.errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <div role="alert" className="rounded-md border-2 border-foreground p-4 text-sm">
          <p className="font-semibold">Not saved. Fix these first:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4 rounded-lg border p-4">
        <Field label="Title (the question or claim, up to 70 characters)">
          <Input value={doc.title} maxLength={70} onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
        </Field>
        <Field label="The one point, in one sentence (not shown on the page)">
          <Textarea rows={2} value={doc.point} onChange={(e) => setDoc({ ...doc, point: e.target.value })} />
        </Field>
        <Field label="Search description (shown under the title in Google, up to 170 characters)">
          <Textarea rows={2} maxLength={170} value={doc.description} onChange={(e) => setDoc({ ...doc, description: e.target.value })} />
        </Field>
        <Field label="Topic">
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={doc.pillar}
            onChange={(e) => setDoc({ ...doc, pillar: e.target.value as PillarId })}
          >
            {PILLARS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <p className="text-sm text-muted-foreground">
        In text: <code>**bold**</code>, <code>*italic*</code>, and <code>[link text](/page)</code> to a page on this site.
      </p>

      {doc.blocks.map((block, i) => (
        <section key={i} className="space-y-3 rounded-lg border p-4" aria-label={`Block ${i + 1}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-headline text-sm font-bold uppercase tracking-wide">
              {i + 1} · {LABEL[block.type]}
            </h3>
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Move down" disabled={i === doc.blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Delete block" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(b) => setBlock(i, b)} />
        </section>
      ))}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-4">
        <Field label="Add a block">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={adding} onChange={(e) => setAdding(e.target.value as BlockType)}>
            {(Object.keys(LABEL) as BlockType[]).map((t) => (
              <option key={t} value={t}>
                {LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Button type="button" variant="outline" onClick={() => setDoc((d) => ({ ...d, blocks: [...d.blocks, NEW_BLOCK[adding]()] }))}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t bg-background py-4">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save as a new revision
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/admin/guides/${slug}`)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex gap-2">
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            aria-label="Heading size"
          >
            <option value={2}>Section</option>
            <option value={3}>Sub-section</option>
          </select>
          <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Heading text" />
        </div>
      );
    case 'paragraph':
      return <Textarea rows={4} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Paragraph" />;
    case 'list':
      return (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={block.ordered} onChange={(e) => onChange({ ...block, ordered: e.target.checked })} /> Numbered
          </label>
          <Textarea rows={4} value={block.items.join('\n')} onChange={(e) => onChange({ ...block, items: lines(e.target.value) })} aria-label="List items, one per line" placeholder="One item per line" />
        </>
      );
    case 'callout':
      return (
        <>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={block.kind}
            onChange={(e) => onChange({ ...block, kind: e.target.value as typeof block.kind })}
            aria-label="Callout kind"
          >
            <option value="tip">Tip</option>
            <option value="warning">Watch out</option>
            <option value="coach-note">Coach&apos;s note (yours)</option>
          </select>
          <Textarea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} aria-label="Callout text" />
        </>
      );
    case 'workout':
      return (
        <div className="space-y-3">
          <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Workout title" aria-label="Workout title" />
          <Input value={block.goal ?? ''} onChange={(e) => onChange({ ...block, goal: e.target.value || undefined })} placeholder="Goal (optional)" aria-label="Goal" />
          {(['beginner', 'racePace'] as const).map((key) => (
            <div key={key} className="space-y-2 rounded-md bg-secondary/50 p-3">
              <p className="text-sm font-semibold">{key === 'beginner' ? 'Beginner or first race' : 'Race pace'}</p>
              <Textarea
                rows={3}
                value={block[key].steps.join('\n')}
                onChange={(e) => onChange({ ...block, [key]: { ...block[key], steps: lines(e.target.value) } })}
                placeholder="One step per line"
                aria-label={`${key} steps`}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={block[key].rpe} onChange={(e) => onChange({ ...block, [key]: { ...block[key], rpe: e.target.value } })} placeholder="Effort, e.g. RPE 7" aria-label={`${key} effort`} />
                <Input value={block[key].rest} onChange={(e) => onChange({ ...block, [key]: { ...block[key], rest: e.target.value } })} placeholder="Rest, e.g. 90 s between sets" aria-label={`${key} rest`} />
              </div>
            </div>
          ))}
          <Textarea rows={2} value={block.notes ?? ''} onChange={(e) => onChange({ ...block, notes: e.target.value || undefined })} placeholder="Notes (optional)" aria-label="Notes" />
        </div>
      );
    case 'table':
      return (
        <div className="space-y-2">
          <Input value={block.caption ?? ''} onChange={(e) => onChange({ ...block, caption: e.target.value || undefined })} placeholder="Caption (optional)" aria-label="Caption" />
          <Input value={block.header.join(' | ')} onChange={(e) => onChange({ ...block, header: cells(e.target.value) })} placeholder="Column | Column | Column" aria-label="Header row" />
          <Textarea
            rows={4}
            value={block.rows.map((r) => r.join(' | ')).join('\n')}
            onChange={(e) => onChange({ ...block, rows: lines(e.target.value).map(cells) })}
            placeholder="One row per line, cells separated by |"
            aria-label="Rows"
          />
        </div>
      );
    case 'calculator':
      return (
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={block.tool} onChange={(e) => onChange({ ...block, tool: e.target.value as typeof block.tool })} aria-label="Tool">
          {TOOL_IDS.map((id) => (
            <option key={id} value={id}>
              {TOOLS[id].name}
            </option>
          ))}
        </select>
      );
    case 'cta':
      return (
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={block.variant} onChange={(e) => onChange({ ...block, variant: e.target.value as typeof block.variant })} aria-label="Call to action">
          {CTA_IDS.map((id) => (
            <option key={id} value={id}>
              {CTAS[id].headline}
            </option>
          ))}
        </select>
      );
    case 'faq':
      return (
        <div className="space-y-3">
          {block.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-md bg-secondary/50 p-3">
              <Input value={item.question} onChange={(e) => onChange({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} placeholder="Question" aria-label={`Question ${i + 1}`} />
              <Textarea rows={2} value={item.answer} onChange={(e) => onChange({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} placeholder="Answer" aria-label={`Answer ${i + 1}`} />
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>
                Remove question
              </Button>
            </div>
          ))}
          {block.items.length < 3 && (
            <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...block, items: [...block.items, { question: '', answer: '' }] })}>
              Add a question
            </Button>
          )}
        </div>
      );
    case 'sources':
      return (
        <Textarea
          rows={3}
          value={block.items.map((s) => [s.title, s.publisher ?? '', s.url ?? ''].join(' | ')).join('\n')}
          onChange={(e) =>
            onChange({
              ...block,
              items: lines(e.target.value).map((l) => {
                const [title, publisher, url] = cells(l);
                return { title, publisher: publisher || undefined, url: url || undefined };
              }),
            })
          }
          placeholder="Title | Publisher | https://link (one per line; checked to exist)"
          aria-label="Sources"
        />
      );
  }
}
