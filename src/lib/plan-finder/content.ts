// src/lib/plan-finder/content.ts
//
// Typed access to funnel.json: every question, option, product and line of copy
// the plan finder shows. The JSON is the source of truth for wording and links;
// routing.ts holds the rules that read its ids.
//
// Option ids appear in tracked events and in shared result links, so they are
// permanent. Change a label here, never an id. To retire an option, stop
// rendering it and keep it in the file (docs/02 in handover/entry-funnel).

import raw from './funnel.json';

export type GoalId = 'first' | 'faster' | 'athx' | 'xenom' | 'ultra' | 'hybrid';
export type LevelId = 'new' | 'regular' | 'raced' | 'compete';
export type PlaceId = 'home' | 'gym' | 'both';
export type ObstacleId = 'structure' | 'generic' | 'run' | 'plateau' | 'injury' | 'time' | 'options' | 'none';
export type FormatId = 'free' | 'paper' | 'phone' | 'tools';
export type ProductId = 'free' | 'app' | 'home' | 'twelve' | 'elite' | 'athx' | 'ultra' | 'vdot' | 'rtp' | 'run12' | 'vo2';

export interface Option<Id extends string = string> {
  id: Id;
  label: string;
  sub?: string;
  /** How the option reads inside the explanation sentence ("you train at home"). */
  word?: string;
}

export interface Product {
  id: ProductId;
  /** `live` was seen working; `confirm` must be checked before launch. */
  status: 'live' | 'confirm';
  /** Lets the admin separate affiliate click-outs from tools and pages. */
  destinationType: string;
  kind: string;
  badge: string;
  /** Completes "Start with …" on the result heading. */
  head: string;
  title: string;
  meta: string;
  price: string;
  cta: string;
  href: string;
  affiliate: boolean;
}

export interface Funnel {
  version: string;
  catalogVersion: string;
  stations: string[];
  steps: Record<'1' | '2' | '3' | '4' | '5', { title: string; help: string; hint: string | null }>;
  goals: Option<GoalId>[];
  levels: Option<LevelId>[];
  places: Option<PlaceId>[];
  obstacles: Option<ObstacleId>[];
  formats: Option<FormatId>[];
  catalog: Record<ProductId, Product>;
  copy: {
    hero: {
      chip: string;
      meta: string;
      title: string;
      titleHighlight: string;
      lead: string;
      ticks: string[];
      q1Help: string;
      startTodayLine: string;
      startTodayLink: string;
    };
    skip: { label: string; hint: string };
    result: {
      chip: string;
      headPrefix: string;
      alsoUseful: string;
      changeAnswers: string;
      noFit: string;
      talkCta: string;
    };
    talk: { chip: string; title: string; titleHighlight: string; help: string; note: string; attachLabel: string };
    privacy: {
      tickOn: string;
      tickOff: string;
      trackingOn: string;
      trackingOnNoNote: string;
      trackingOff: string;
      linkLabel: string;
    };
    entry: { chip: string; skipLabel: string; continueLabel: string };
    skipWhy: { title: string; options: Option[]; thanks: string; dismiss: string };
    feedback: {
      title: string;
      fit: Option<'yes' | 'partly' | 'no'>[];
      whyTitle: string;
      reasons: Option[];
      send: string;
      thanks: string;
    };
  };
}

export const funnel = raw as unknown as Funnel;

export function findOption<Id extends string>(list: Option<Id>[], id: string | null | undefined): Option<Id> | null {
  return list.find((o) => o.id === id) ?? null;
}
