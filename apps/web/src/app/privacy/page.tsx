import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — mallGuide',
  description: 'How mallGuide collects, uses, and protects data from shoppers, mall managers, and tenants.',
};

const LAST_UPDATED = 'May 23, 2026';

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 mb-3">Legal</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-3">Privacy Policy</h1>
        <p className="text-sm text-ink-400 mb-10">Last updated {LAST_UPDATED}</p>

        <Section title="1. Who we are">
          <p>
            mallGuide is a mall ecosystem platform operated by yoGuide Ltd, a company
            registered in Rwanda with offices in Nyarugenge, downtown Kigali. References to “we”,
            “our”, or “us” in this policy mean yoGuide Ltd.
          </p>
          <p>
            For questions about this policy or about how your data is handled, write to{' '}
            <a className="text-primary-600 hover:text-primary-700 font-semibold" href="mailto:privacy@yoguide.com">
              privacy@yoguide.com
            </a>.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p>The product has three audiences. We collect different data for each.</p>
          <Bullet>
            <strong>Visitors</strong> — the public map at <code>map.plus/map/&lt;building&gt;</code> stores no
            personal account. We record anonymous search queries, map clicks, and floor-change events
            to surface patterns (e.g. failed searches) to building managers. Logs do not include
            cookies, fingerprints, or third-party trackers.
          </Bullet>
          <Bullet>
            <strong>Building managers and tenants</strong> — when you create an account, we store your
            name, work email, hashed password, organisation, and role. We log sign-ins, profile
            updates, and content changes for audit purposes.
          </Bullet>
          <Bullet>
            <strong>Lease and tenant records</strong> — kept private to the building&apos;s organisation.
            These are never shown on the public map or shared with other organisations.
          </Bullet>
        </Section>

        <Section title="3. How we use data">
          <p>We use data only to:</p>
          <Bullet>operate the product (rendering maps, authenticating users, processing search queries);</Bullet>
          <Bullet>improve the product (anonymised aggregate analytics shown to building managers);</Bullet>
          <Bullet>secure the platform (rate limiting, fraud detection, incident response);</Bullet>
          <Bullet>communicate with you about your account or material product changes.</Bullet>
          <p>We do not sell data. We do not run advertising on mallGuide and have no ad partners.</p>
        </Section>

        <Section title="4. Where data lives">
          <p>
            Production data is hosted on infrastructure in the European Union with provider-side
            encryption at rest. Backups are encrypted and retained for 30 days. We are working
            toward an additional region in East Africa for latency-sensitive deployments.
          </p>
        </Section>

        <Section title="5. Your rights">
          <p>
            You can request a copy of the data we hold about you, ask us to correct it, or ask us
            to delete it. Email <a className="text-primary-600 hover:text-primary-700 font-semibold" href="mailto:privacy@yoguide.com">privacy@yoguide.com</a>{' '}
            and we will respond within 30 days. If your account is deleted, we retain a minimal
            audit log for 12 months to satisfy fraud and compliance obligations.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We use one first-party cookie/localStorage entry to keep you signed in (<code>mapplus_auth</code>).
            We do not use third-party tracking cookies. Disabling localStorage will sign you out
            but will not break the public map.
          </p>
        </Section>

        <Section title="7. Changes to this policy">
          <p>
            We will update this policy if our practices change. Material changes are notified by
            email at least 14 days before they take effect. The current version is always
            available at <code>map.plus/privacy</code>.
          </p>
        </Section>
      </article>
    </MarketingShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold tracking-tight text-ink-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-ink-600 leading-relaxed">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 pl-1">
      <span className="w-1 h-1 rounded-full bg-ink-400 mt-2 flex-shrink-0" />
      <p>{children}</p>
    </div>
  );
}
