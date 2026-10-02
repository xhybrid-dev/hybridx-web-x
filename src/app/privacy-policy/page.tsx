
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Metadata } from 'next';
import ConsentSettingsButton from '@/components/consent/ConsentSettingsButton';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy-policy' },
  title: 'Privacy Policy | HybridX Hub',
  description: 'Learn how HybridX Hub collects, uses, and protects your personal information and activity data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-border/60">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl md:text-4xl font-headline text-primary">Privacy Policy</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Last Updated: October 2, 2026
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">1. Introduction</h2>
                <p className="text-muted-foreground">
                  Welcome to HybridX Hub ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, including any services like our fitness calculators, training plan sign-ups, and our app.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">2. Information We Collect</h2>
                <p className="text-muted-foreground mb-4">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>Personal Data:</strong> Personally identifiable information, such as your name and email address, that you voluntarily give to us when you sign up for our training plans or mailing lists.
                  </li>
                  <li>
                    <strong>Data from Calculators:</strong> Information you provide to our fitness calculators, such as age, weight, height, gender, lift numbers, and race times. This data is processed in your browser to provide you with results and may be used in an aggregated, anonymous form for service improvement.
                  </li>
                  <li>
                    <strong>Derivative Data (Analytics):</strong> Information our servers automatically collect when you access the Site, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Site. We use Google Analytics for this purpose.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">3. How We Use Your Information</h2>
                <p className="text-muted-foreground">
                  Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>Deliver your personalized training plan via email.</li>
                  <li>Send you our newsletter or other marketing communications that you have opted into.</li>
                  <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
                  <li>Generate anonymized, aggregated data for internal analysis and service improvement.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">4. Disclosure of Your Information</h2>
                <p className="text-muted-foreground">
                  We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share information we have collected about you in certain situations:
                </p>
                 <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>
                    <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.
                  </li>
                  <li>
                    <strong>Third-Party Service Providers:</strong> We may share your data with third-party service providers that perform services for us or on our behalf, including data analysis (Google Analytics) and email delivery (for training plans and newsletters).
                  </li>
                </ul>
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

              <section>
                <h2 className="text-2xl font-headline text-primary mb-3">9. Contact Us</h2>
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
