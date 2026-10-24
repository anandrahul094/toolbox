import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL_UPDATED, SITE_NAME, SITE_URL } from '../site'
import { setMeta } from './meta'

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="legal">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <span>{title}</span></nav>
      <h1>{title}</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}</p>
      {children}
      <p className="muted">Questions about this page? <Link to="/feedback">Contact us through the feedback page</Link>.</p>
    </article>
  )
}

export function Privacy() {
  useEffect(() => setMeta(`Privacy policy — ${SITE_NAME}`, `How ${SITE_NAME} handles your data: tools run in your browser and your files are never uploaded.`), [])
  return (
    <LegalPage title="Privacy policy">
      <p>{SITE_NAME} ({SITE_URL.replace(/^https?:\/\//, '')}) is a collection of free online tools. This policy explains what information is handled when you use it. In short: <b>the files and text you put into tools never leave your device</b>, and we collect as little as possible.</p>

      <h2>Files and text you use in tools</h2>
      <p>Every tool runs entirely in your web browser. Images, PDFs, documents and text you open in a tool are processed on your own device and are <b>not uploaded</b> to our servers or anyone else’s. We cannot see them, and they are gone when you close the page.</p>

      <h2>Information stored in your browser</h2>
      <p>To make the site convenient, your browser’s local storage keeps:</p>
      <ul>
        <li>your pinned tools (“bench”), pockets and settings such as theme;</li>
        <li>recently used tools and searches — you can turn this off or clear it in <Link to="/settings">Settings</Link>;</li>
        <li>ratings you give, and feedback that hasn’t been sent yet;</li>
        <li>a random identifier so you can change a rating you already gave.</li>
      </ul>
      <p>This stays on your device. You can export or delete it at any time in Settings, or by clearing your browser’s site data.</p>

      <h2>Accounts (optional)</h2>
      <p>You can use every tool without an account. If you create one, we store your name, email address and a securely hashed password (or your Google account identifier if you sign in with Google). We use your email only to sign you in, confirm your account and reset your password.</p>

      <h2>Feedback, tool requests and ratings</h2>
      <p>When you send feedback, request a tool, report a problem or rate a tool, we store what you write, the tool it relates to, the time, and your email address if you choose to give it. Ratings are shown publicly only as averages. Please don’t include passwords or other sensitive personal information in messages.</p>

      <h2>Service providers</h2>
      <ul>
        <li><b>Supabase</b> stores accounts, feedback and ratings.</li>
        <li><b>Google Fonts</b> provides the typefaces; your browser requests them from Google when a page loads.</li>
        <li><b>ExchangeRate-API</b> supplies the daily rate table for the Currency Converter. Only the table is downloaded; the amounts you enter are not sent.</li>
        <li><b>jsDelivr</b> serves the text-recognition engine and language data the first time you use Image to Text. Your images are not sent.</li>
        <li>Our hosting provider serves the website and may keep standard technical logs (such as IP address and browser type) for security.</li>
      </ul>
      <p>We do not sell your information, show ads, or use analytics or advertising trackers.</p>

      <h2>How long we keep data</h2>
      <p>Account details are kept until you delete your account. Feedback and ratings are kept while they help us improve the site. You can ask us to delete your account or anything you sent us at any time.</p>

      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your personal information, or withdraw consent, by contacting us through the <Link to="/feedback">feedback page</Link>. Depending on where you live (for example under India’s Digital Personal Data Protection Act or the EU GDPR), you may have further rights, and we will respond to requests within a reasonable time.</p>

      <h2>Children</h2>
      <p>{SITE_NAME} is not directed at children under 13, and we don’t knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we’ll update the date at the top of this page.</p>
    </LegalPage>
  )
}

export function Terms() {
  useEffect(() => setMeta(`Terms of use — ${SITE_NAME}`, `The terms for using ${SITE_NAME}'s free online tools.`), [])
  return (
    <LegalPage title="Terms of use">
      <p>By using {SITE_NAME} you agree to these terms. If you don’t agree, please don’t use the site.</p>

      <h2>The service</h2>
      <p>{SITE_NAME} provides free online tools that run in your browser. We may add, change or remove tools at any time, and the site may sometimes be unavailable.</p>

      <h2>Your content and responsibility</h2>
      <ul>
        <li>You keep all rights to the files and text you use. Because tools run on your device, we don’t receive them.</li>
        <li>Only process files you own or have permission to use. In particular, don’t use the watermark or background tools to remove watermarks, logos or credits from other people’s work without permission.</li>
        <li>Don’t use the site for anything illegal, to harm others, or to attack, overload or interfere with the service.</li>
      </ul>

      <h2>Accounts</h2>
      <p>If you create an account, keep your password safe and give accurate information. You can delete your account at any time. We may suspend accounts that break these terms.</p>

      <h2>Results and calculators</h2>
      <p>Tools are provided to help you, but results may contain errors. Financial, tax, salary and health calculators give <b>estimates only</b> and are not professional advice — check important figures with a qualified professional or official source. Always keep a copy of your original files.</p>

      <h2>No warranty</h2>
      <p>The site is provided “as is” and “as available”, without warranties of any kind, to the extent permitted by law.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent permitted by law, we are not liable for any indirect or consequential loss, lost data or lost profits arising from your use of the site. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>Feedback</h2>
      <p>If you send ideas or feedback, we may use them to improve the site without any obligation to you.</p>

      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version. Continuing to use the site after changes means you accept them.</p>
    </LegalPage>
  )
}
