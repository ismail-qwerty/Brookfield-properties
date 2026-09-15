import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BrandLogo } from '../../components/ui';

const BRAND = 'Blackstone';

const SECTIONS = [
  {
    title: 'Account Registration',
    clauses: [
      `All members must be at least 18 years of age to register and create an account on ${BRAND}.`,
      `Each phone number may only be used to register and verify a single account on ${BRAND}. Users are not permitted to create multiple accounts using the same phone number.`,
      'Users must not link or rebind the same wallet to multiple platform accounts. Any unauthorized use of the same wallet across different accounts may result in appropriate action, including account restrictions or other measures as deemed necessary by the platform.',
    ],
  },
  {
    title: 'Platform Usage',
    clauses: [
      'The system randomly assigns Exclusive Package Lots to active users. Once an Exclusive Package Lot has been allocated, users are not permitted to modify, cancel, or abandon the assigned lots.',
      'Any inappropriate, unauthorized, or fraudulent use of an account is strictly prohibited. The platform reserves the right to take appropriate action, including account restrictions, suspension, termination, and pursuing legal remedies where necessary.',
      'The platform may require additional verification steps, such as identity verification or address verification, before allowing users to use certain features.',
      'Users must not share their account information, including login credentials and redemption codes, with anyone else.',
      "The platform reserves the right to restrict or terminate a user's access to certain features or services if the user violates any of the Terms & Conditions.",
      'Users agree to receive communications from the platform, including account related messages, notifications, updates, and information regarding Exclusive Package Deals or other platform services. These communications are necessary to provide important account updates and service related information.',
    ],
  },
  {
    title: 'Data Orders',
    clauses: [
      'Users must ensure that all assigned Lot Orders are fully completed before requesting account redemption or resetting their account.',
      'Accounts with a balance below $50 are not eligible to accept or generate Lot Orders. Users must maintain a minimum account balance of $50 before initiating any Lot Orders. The minimum redemption amount available on the platform is $50.',
      'Users must complete all assigned Lot Orders within 48 hours of acceptance. If a user is unable to complete the assigned Lot Orders within the required timeframe, they must contact customer service immediately. Failure to complete orders or notify customer service within the specified period may result in appropriate action by the platform.',
      'Daily Lots may include 0 to 3 Exclusive Package Data Bundles, which are assigned randomly by the system in 1 to 3 high rebates. The availability and quantity of Exclusive Package Data Bundles may vary for each user and each daily Lot assignment.',
      'Users must complete all assigned Lot Orders within the specified timeframe. Failure to complete Lots within the required period may result in account restrictions, including possible permanent account freezing. In such cases, access to account funds and withdrawal services may be limited in accordance with platform policies. Users are encouraged to contact customer service promptly if they encounter difficulties completing assigned Lots.',
    ],
  },
  {
    title: 'Governing Law and Jurisdiction',
    body: "The platform operates in accordance with the applicable laws and regulations of the country in which it operates. All users must comply with relevant legal requirements and agree to respect and follow the platform's Terms & Conditions, policies, and guidelines. Any violation of applicable laws or platform rules may result in appropriate action being taken by the platform.",
  },
  {
    title: 'Recharge Policy',
    clauses: [
      'Users may recharge their accounts through the approved payment methods provided by the platform. Users are responsible for ensuring that all recharge information is accurate before completing any transaction.',
      'Users need to recharge their accounts using the same wallet. Using a different wallet to recharge the same account will cause the account to be frozen.',
    ],
  },
  {
    title: 'Contact Information',
    body: `If you have any questions regarding these Terms & Conditions, please contact ${BRAND} Live Chat and Telegram PR.`,
  },
];

const slug = (title) => title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');

export default function Terms() {
  const { isAuthenticated } = useAuth();
  const loggedIn = isAuthenticated();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black">
        <div className="wrap flex items-center justify-between h-20">
          <Link to={loggedIn ? '/dashboard' : '/'} className="flex items-center">
            <BrandLogo textClassName="text-[16px]" />
          </Link>
          <Link
            to={loggedIn ? '/dashboard' : '/user-login'}
            className="text-[13px] tracking-wide text-white/60 hover:text-white transition-colors"
          >
            {loggedIn ? 'Back to dashboard' : 'Sign in'}
          </Link>
        </div>
      </header>

      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Legal</div>
          <h1 className="display text-white">Terms &amp; Conditions</h1>
        </div>
      </div>

      <main className="wrap py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Contents */}
          <nav className="lg:col-span-3 lg:sticky lg:top-8 self-start" aria-label="Sections">
            <div className="text-[11px] uppercase tracking-[0.18em] mb-4" style={{ color: 'var(--ink-45)' }}>
              Contents
            </div>
            <ol className="space-y-2.5 text-[14px]">
              {SECTIONS.map((s, i) => (
                <li key={s.title}>
                  <a href={`#${slug(s.title)}`} className="hover:underline" style={{ color: 'var(--ink-70)' }}>
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="lg:col-span-9 max-w-[760px]">
            <p className="text-[16px] md:text-[17px] leading-relaxed mb-12" style={{ color: 'var(--ink-70)' }}>
              Welcome to {BRAND}. Please read these Terms &amp; Conditions carefully before using our platform. By
              registering an account or using our services, you acknowledge that you have read, understood, and agreed
              to be bound by these Terms &amp; Conditions.
            </p>

            {SECTIONS.map((s, i) => (
              <section
                key={s.title}
                id={slug(s.title)}
                className="scroll-mt-8 pt-10 pb-2 border-t"
                style={{ borderColor: 'var(--rule)' }}
              >
                <h2 className="font-serif text-[24px] md:text-[28px] leading-tight mb-6">
                  <span style={{ color: 'var(--ink-25)' }}>{i + 1}.</span> {s.title}
                </h2>

                {s.body && (
                  <p className="text-[15px] leading-relaxed mb-8" style={{ color: 'var(--ink-70)' }}>
                    {s.body}
                  </p>
                )}

                {s.clauses && (
                  <ol className="space-y-5 mb-8">
                    {s.clauses.map((c, j) => (
                      <li key={j} className="flex gap-4">
                        <span className="text-[13px] font-semibold tnum pt-0.5 w-8 flex-shrink-0">
                          {i + 1}.{j + 1}
                        </span>
                        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ink-70)' }}>
                          {c}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}

            <div className="mt-6 border-l-2 border-black bg-[var(--paper-alt)] px-5 py-4 text-[14px] leading-relaxed">
              By using {BRAND}, you acknowledge that you have read, understood, and agreed to these Terms &amp; Conditions.
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
