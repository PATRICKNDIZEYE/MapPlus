import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Terms of Service — mallGuide',
  description: 'The terms under which mallGuide may be used by shoppers, mall managers, and tenants.',
};

const LAST_UPDATED = 'May 23, 2026';

export default function TermsPage() {
  return (
    <MarketingShell>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 mb-3">Legal</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-3">Terms of Service</h1>
        <p className="text-sm text-ink-400 mb-10">Last updated {LAST_UPDATED}</p>

        <Section title="1. Acceptance">
          <p>
            By using mallGuide — the shopper app, the mall management console, the tenant hub, or the
            delivery app — you agree to these terms. If you do not agree, you may not use the service.
            These terms are governed by the laws of Rwanda.
          </p>
        </Section>

        <Section title="2. Accounts and roles">
          <p>
            mallGuide defines seven roles: super admin, organisation owner, building manager, floor manager,
            tenant admin, tenant staff, and public. Your role determines which features you can access.
            You are responsible for keeping your sign-in credentials secret and for any actions taken
            from your account.
          </p>
          <p>
            We may suspend an account that is being used to violate these terms, harm other users,
            or interfere with the service.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p>You agree not to:</p>
          <Bullet>scrape the public map at a rate that degrades service for other users;</Bullet>
          <Bullet>upload content (photos, descriptions, contact details) you do not have the right to publish;</Bullet>
          <Bullet>attempt to access another organisation&apos;s lease records, analytics, or admin data;</Bullet>
          <Bullet>reverse engineer, decompile, or otherwise inspect the service except where allowed by law;</Bullet>
          <Bullet>use the service to misrepresent a business that is not yours.</Bullet>
        </Section>

        <Section title="4. Building owners and tenants">
          <p>
            Building owners are responsible for the accuracy of floor plans, unit assignments, and
            lease data within their workspace. Tenants are responsible for the accuracy of their own
            shop profile. We provide moderation tools (verification, wrong-info reports) but do not
            guarantee accuracy of any content.
          </p>
        </Section>

        <Section title="5. Subscriptions and payment">
          <p>
            During the pilot phase, access for the CHIC Kigali deployment is provided free of charge.
            Future commercial terms will be agreed in writing between yoGuide Ltd and the
            building&apos;s organisation owner before any fees apply. There are no automatic charges
            during the pilot.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            mallGuide and its underlying software remain the property of yoGuide Ltd. Building owners
            and tenants retain ownership of the content they upload (logos, photos, descriptions,
            lease data) and grant us a non-exclusive licence to host and display that content
            within the service.
          </p>
        </Section>

        <Section title="7. Availability and warranties">
          <p>
            We target 99.9% uptime but do not guarantee uninterrupted service. mallGuide is provided
            “as is” without warranty of fitness for a particular purpose. Floor plans are reference
            documents — they are not authoritative substitutes for architectural, safety, or
            evacuation documentation.
          </p>
        </Section>

        <Section title="8. Liability">
          <p>
            To the extent permitted by law, our total liability for any claim arising from your use
            of the service is limited to the fees you paid for it in the 12 months preceding the claim.
            We are not liable for indirect, incidental, or consequential damages.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You may stop using the service at any time. We may terminate or suspend your account
            with reasonable notice. On termination, we will provide a reasonable window to export
            your organisation&apos;s data before it is deleted from active systems (audit logs may be
            retained per the Privacy Policy).
          </p>
        </Section>

        <Section title="10. Changes to these terms">
          <p>
            We may revise these terms over time. Material changes will be notified at least 14 days
            before they take effect. The current version is always available at <code>map.plus/terms</code>.
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
