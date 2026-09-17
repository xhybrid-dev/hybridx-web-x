import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { adminFirestore } from '@/lib/firebase-admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

const SOURCE_LABELS: Record<string, string> = {
  free_hyrox_plan: 'Free Hyrox Plan',
  sign_up: 'Sign Up Page',
  build_a_bigger_engine: 'Build a Bigger Engine',
  hyrox_rules_card: 'Race Day Rules Card',
};

interface LeadRow {
  id: string;
  source: string;
  email: string;
  name: string | null;
  createdAt: string;
  extra: Record<string, unknown>;
}

async function fetchLeads(source?: string): Promise<LeadRow[]> {
  const collection = adminFirestore.collection('leads');
  const query = source
    ? collection.where('source', '==', source).orderBy('createdAt', 'desc').limit(500)
    : collection.orderBy('createdAt', 'desc').limit(500);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : '';
    return {
      id: doc.id,
      source: data.source || '',
      email: data.email || '',
      name: data.name || null,
      createdAt,
      extra: data.extra || {},
    };
  });
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { source } = await searchParams;
  const leads = await fetchLeads(source);

  const tabs = [
    { label: 'All', value: undefined },
    { label: 'Free Hyrox Plan', value: 'free_hyrox_plan' },
    { label: 'Sign Up Page', value: 'sign_up' },
    { label: 'Build a Bigger Engine', value: 'build_a_bigger_engine' },
    { label: 'Race Day Rules Card', value: 'hyrox_rules_card' },
  ];

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-headline font-bold text-primary">Leads</h1>
            <p className="text-sm text-muted-foreground">Signed in as {session.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/admin/leads/export${source ? `?source=${source}` : ''}`}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </a>
            </Button>
            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/admin/leads?source=${tab.value}` : '/admin/leads'}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                source === tab.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{leads.length} lead{leads.length === 1 ? '' : 's'}</CardTitle>
            <CardDescription>Most recent 500, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{SOURCE_LABELS[lead.source] || lead.source}</td>
                    <td className="py-2 pr-4">{lead.name || '—'}</td>
                    <td className="py-2 pr-4">{lead.email}</td>
                    <td className="py-2 pr-4 text-muted-foreground max-w-xs truncate">
                      {Object.entries(lead.extra)
                        .filter(([, v]) => v && (typeof v !== 'object' || Object.keys(v).length))
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
