
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Metadata } from 'next';
import ConsentSettingsButton from '@/components/consent/ConsentSettingsButton';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy-policy' },
  title: 'Privacy Policy',
  description: 'Learn how HybridX Hub collects, uses, and protects your personal information and activity data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-border/60">
            <CardHeader className="text-center pb-8">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Privacy Policy</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Last updated: 25 November 2026
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Written from what the code does (the lead outbox, the rate limiter, the two Gemini tools,
                  the order records). For Jon's review before it is relied on: the legal name and address of
                  the controller (Art. 13(1)(a)) are not in this repository and still need adding to section 1,
                  and the transfer and retention wording should be checked against the providers' current terms. */}
              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">1. Who we are</h2>
                <p className="text-muted-foreground">
                  HybridX Hub (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) runs hybridx.club: HYROX and hybrid training plans, books,
                  free calculators and guides. We decide how and why the personal information described here is used, which makes us
                  the &quot;controller&quot; under UK data protection law. You can reach us at{' '}
                  <a className="underline" href="mailto:training@hybridx.club">training@hybridx.club</a>. The HybridX app at
                  app.hybridx.club is our own separate service; this policy covers this website.
                </p>
              </section>

              <section id="what-we-collect">
                <h2 className="text-2xl font-headline text-primary mb-3">2. What we collect, why, and on what basis</h2>
                <p className="text-muted-foreground mb-4">
                  We collect only what each of these needs. Most of the site, including the calculators, works without giving us any
                  personal information at all.
                </p>
                <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                  <li>
                    <strong>Sign-ups and free downloads</strong> (the free plan, books and guides, race cards and similar): your name,
                    your email address and, where the form asks, a race date. We use them to give you the file or plan you asked for
                    and, where you agreed on the form, to send training emails. Our basis is your consent for the emails, which you can
                    withdraw at any time with the unsubscribe link in each one, and our legitimate interest in delivering what you asked
                    for. A few downloads are sent only after you confirm your address with a button in an email, so that nobody can sign
                    you up but you. The free plan is built in your browser, but the race you chose, its date and how you chose it are stored with your sign-up, so the emails can count down to your race.
                  </li>
                  <li>
                    <strong>Messages to us</strong> (the contact form and the plan finder&apos;s &quot;Talk to us&quot;): your name, email
                    address and message, used to reply to you. Our basis is our legitimate interest in answering people who write to us.
                  </li>
                  <li>
                    <strong>Calculators:</strong> what you type into a calculator (age, weight, lifts, race times) is worked out in your
                    browser and is not sent to us. There are two exceptions, the split-time calculator&apos;s elevation advice and the treadmill
                    workout converter: the text or route details you enter there are sent through our server to Google&apos;s Gemini
                    service to produce the answer. They are not joined to your name or email address, and we do not use them to
                    profile you. Please leave out health details and anything that identifies you.
                  </li>
                  <li>
                    <strong>Keeping the site safe:</strong> when a form or one of those two tools is used, we make a one-way scrambled
                    code from your IP address and keep it for an hour, with a count of how often it has been used, to stop one source
                    flooding us with sign-ups or requests. An hourly clean-up then deletes it. The code cannot be turned back into your address. Our basis is our legitimate interest in keeping the service
                    working and free from abuse. Our host also keeps ordinary server logs.
                  </li>
                  <li>
                    <strong>Analytics:</strong> only if you accept the banner; see section 5.
                  </li>
                  <li>
                    <strong>Plan finder, purchases and the online store:</strong> see sections 6 and 7 and the store section below.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">3. Who receives it</h2>
                <p className="text-muted-foreground">
                  We do not sell your personal information. We share it only with the services that help us run the site, who may use
                  it only for us:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>
                    <strong>Google</strong> (Firebase App Hosting and database, where sign-ups and messages are stored; Google Analytics
                    if you accept it; the Gemini service for the two tools in section 2).
                  </li>
                  <li>
                    <strong>Brevo</strong>, which sends the emails you ask for, and <strong>our mailing system</strong> in the HybridX app,
                    which we run ourselves and which keeps your subscription details and your choices, including who has unsubscribed.
                  </li>
                  <li>
                    <strong>Stripe</strong> for card payments, <strong>Ecwid</strong> (Lightspeed Commerce) for the apparel store, and{' '}
                    <strong>Anthropic</strong> for the monthly summary of plan finder notes (sections 6 and 7 and the store section say
                    what each receives).
                  </li>
                  <li>
                    <strong>Authorities or advisers</strong>, where the law requires it or to protect our rights or other people&apos;s safety.
                  </li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  <strong>Links to other sites.</strong> Our books are sold by Amazon, and some links to them are affiliate links: if you buy, we
                  earn a small commission at no cost to you. When you follow one, Amazon&apos;s own privacy notice applies to what it
                  collects. Amazon does not tell us who you are. Links to Instagram and other sites work the same way.
                </p>
              </section>

              <section id="transfers">
                <h2 className="text-2xl font-headline text-primary mb-3">4. Transfers outside the UK</h2>
                <p className="text-muted-foreground">
                  Some of the services above, Google, Stripe, Anthropic and Lightspeed in particular, process information in the United
                  States and other countries. Where they do, they rely on a legal transfer mechanism recognised in the UK, such as the UK
                  Government&apos;s data bridge, the UK addendum to the standard contractual clauses, or the international data transfer
                  agreement, so that your information has equivalent protection. You can ask us for details.
                </p>
              </section>

              <section id="store">
                <h2 className="text-2xl font-headline text-primary mb-3">Our online store (Ecwid)</h2>
                <p className="text-muted-foreground">
                  The apparel shelves at <code>/store</code> are run by Ecwid, an online store service from Lightspeed Commerce. They
                  load only after you press &quot;Load the store&quot;. Once loaded, Ecwid receives your IP address and browser details
                  and sets its own cookies so that your basket and checkout work, and it handles the order, your delivery details and
                  your payment as our service provider. The consent banner on this site does not cover the store: pressing the button is
                  how you choose to use it. If you do not press it, nothing is sent to Ecwid.
                </p>
              </section>

              <section id="cookies">
                <h2 className="text-2xl font-headline text-primary mb-3">5. Cookies and Analytics</h2>
                <p className="text-muted-foreground">
                  We ask before using analytics. The first time you visit, a banner asks whether you accept. If you accept, we load Google Analytics, which sets its own cookies (named <code>_ga</code> and <code>_ga_</code> followed by an id) to count visits and see which pages are used, and our plan finder records anonymous statistics about how it is used. If you reject, neither runs, and the site works the same.
                </p>
                <p className="text-muted-foreground mt-4">
                  Your choice is kept in your browser&apos;s local storage, not in a cookie, so that we do not ask again on every page. It holds no identifier. You can change or withdraw your choice at any time; withdrawing it removes the Google Analytics cookies from this site.
                </p>
                <div className="mt-4">
                  <ConsentSettingsButton className="inline-flex min-h-11 items-center rounded-lg border border-primary px-5 font-headline font-bold text-primary hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors">
                    Change cookie settings
                  </ConsentSettingsButton>
                </div>
              </section>

              <section id="plan-finder">
                <h2 className="text-2xl font-headline text-primary mb-3">6. The Plan Finder</h2>
                <p className="text-muted-foreground">
                  Our plan finder asks five questions and recommends a plan, book or tool. If you accept analytics in our cookie banner, we save your answers (your goal, your experience, where you train, what has got in the way and how you like to follow a plan) together with a few facts about your visit: the website you came from, whether you are on a phone, tablet or computer, which parts of the page you looked at, and which links you clicked. If your browser sends a Global Privacy Control or Do Not Track signal, the plan finder saves none of this, whatever you choose in the banner.
                </p>
                <p className="text-muted-foreground mt-4">
                  We do not save your name, email address, IP address or any identifier stored on your device with these answers. Each page load gets a new random number that is kept only while the page is open, so we cannot tell who you are or recognise you when you come back. A race date is saved only as a range of weeks, never as a date. We use this information to see how people use the site and to improve our plans and our website.
                </p>
                <p className="text-muted-foreground mt-4">
                  If you type a note in the plan finder, we remove email addresses, phone numbers, links and postcodes from it before it is saved, and we delete the note after 90 days. Please leave out health details. Once a month, the notes from that month, without anything else about you, may be sent to an AI service (Anthropic) to summarise the common themes for us. The rest of the plan finder data is deleted after 400 days; only totals are kept after that.
                </p>
                <p className="text-muted-foreground mt-4">
                  If you choose to send us a message through the plan finder&apos;s &quot;Talk to us&quot; form, we use your name, email address and message to reply to you. They are kept separately from the answers above and are never linked to them, and we keep them for up to 12 months after we last dealt with your message. You can ask us what we hold about you, or ask us to delete it, at training@hybridx.club. Because the plan finder answers cannot be linked to a person, we cannot look them up for you.
                </p>
                <p className="text-muted-foreground mt-4">
                  The site runs on Google Firebase App Hosting, the plan finder information is stored in Google Firebase, messages to us are delivered by Brevo, and the monthly note summary uses Anthropic. They process this information on our behalf.
                </p>
              </section>

              {/* DRAFT for Jon's review (docs/shop-setup.md): the shop's orders. */}
              <section id="purchases">
                <h2 className="text-2xl font-headline text-primary mb-3">7. Purchases</h2>
                <p className="text-muted-foreground">
                  When you buy a download from us, payment is taken by Stripe on its own checkout page. Stripe collects your card details, name, email address and billing address. We never see or store your card number. Stripe passes us your email address, your billing country, the country your card was issued in, what you bought and what you paid.
                </p>
                <p className="text-muted-foreground mt-4">
                  We store that information as an order record in Google Firebase, together with a record of your consent to immediate download, the time of each download, the version downloaded and a one-way scrambled form of your IP address, which lets us limit downloads without keeping the address itself. We use it to give you your download page, to send you your download link by email (delivered by Brevo), to answer your questions, to handle refunds and disputes, and to meet our tax and accounting obligations. Your files are kept in Google Firebase Storage.
                </p>
                <p className="text-muted-foreground mt-4">
                  The legal basis is the contract with you, and for tax records our legal obligation. We keep order records for six years after the end of the tax year of the purchase, as UK tax law requires. Buying does not add you to any mailing list. You can ask us what we hold about you at training@hybridx.club.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">8. Security of Your Information</h2>
                <p className="text-muted-foreground">
                  We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                </p>
              </section>

              <section id="retention">
                <h2 className="text-2xl font-headline text-primary mb-3">9. How long we keep it</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>Subscription details:</strong> while you are subscribed. When you unsubscribe we keep your email address on a
                    list of people not to email, so that we do not email you again; if you ask us to delete your information we remove
                    the rest.
                  </li>
                  <li>
                    <strong>Messages:</strong> as long as we need to answer you and deal with anything that follows.
                  </li>
                  <li>
                    <strong>Order records:</strong> six years after the end of the tax year of the purchase (section 7).
                  </li>
                  <li>
                    <strong>Plan finder answers and notes:</strong> as section 6 describes; notes are deleted after 90 days.
                  </li>
                  <li>
                    <strong>Abuse-prevention codes:</strong> an hour, then cleared by the next hourly clean-up.
                  </li>
                  <li>
                    <strong>Analytics:</strong> Google Analytics keeps its data for the retention period set in our Google Analytics
                    account; ask us if you want to know what it is set to.
                  </li>
                </ul>
              </section>

              <section id="your-rights">
                <h2 className="text-2xl font-headline text-primary mb-3">10. Your rights</h2>
                <p className="text-muted-foreground">
                  You can ask us to show you the personal information we hold about you, to correct it, to delete it, to restrict how we
                  use it, or to give it to you in a portable form. You can object to our use of it where we rely on legitimate interests,
                  and you can withdraw consent at any time (unsubscribing does so for emails, and the cookie settings button above does so
                  for analytics) without affecting what we did before. We do not make decisions about you by automated means that have
                  legal or similarly significant effects.
                </p>
                <p className="text-muted-foreground mt-4">
                  Email{' '}
                  <a className="underline" href="mailto:training@hybridx.club">training@hybridx.club</a> and we will reply within one month.
                  If you are not happy with how we have handled your information, you have the right to complain to the UK Information
                  Commissioner&apos;s Office at{' '}
                  <a className="underline" href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer">ico.org.uk/make-a-complaint</a>{' '}
                  or on 0303 123 1113. We would like the chance to put things right first.
                </p>
              </section>

              <section id="children">
                <h2 className="text-2xl font-headline text-primary mb-3">11. Children</h2>
                <p className="text-muted-foreground">
                  The site is not aimed at children under 13 and we do not knowingly collect their information. If you think a child has
                  given us theirs, tell us and we will delete it.
                </p>
              </section>

              <section id="changes">
                <h2 className="text-2xl font-headline text-primary mb-3">12. Changes to this policy</h2>
                <p className="text-muted-foreground">
                  If we change how we use your information we will update this page and the date at the top, and where the change matters
                  to you we will tell you directly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">13. Contact us</h2>
                <p className="text-muted-foreground">
                  If you have questions or comments about this Privacy Policy, please contact us at: training@hybridx.club
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
