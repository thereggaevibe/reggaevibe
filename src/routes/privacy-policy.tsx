import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

const title = "Privacy Policy — Reggae Vibe Radio";
const description =
  "How Reggae Vibe Media collects, uses and protects your data across the Reggae Vibe Radio app and website, and how to request deletion.";

const EFFECTIVE_DATE = "September 27, 2026";

type Section = {
  id: string;
  heading: string;
  body: string[];
  bullets?: { label: string; text: string }[];
  list?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "collection",
    heading: "1. Information Collection and Use",
    body: [
      "While using our Service, we may collect certain information to provide, maintain, and improve our audio streaming and digital publishing features.",
    ],
    bullets: [
      {
        label: "Usage Data & Device Information",
        text: "When you access the app, we or our integrated infrastructure tools may automatically collect device details (such as device type, operating system version, and general network connection metrics) to ensure proper audio playback compatibility.",
      },
      {
        label: "Log Data",
        text: "Information your device sends whenever you use the application, including app performance diagnostics and interaction logs.",
      },
      {
        label: "Voluntary Information",
        text: "If you contact us directly via email or web forms, we collect your name, email address, and message contents to respond to your inquiries.",
      },
    ],
  },
  {
    id: "use",
    heading: "2. Use of Collected Data",
    body: ["Reggae Vibe Media uses the collected data for the following purposes:"],
    list: [
      "To provide and maintain the Reggae Vibe Radio streaming functionality.",
      "To monitor app performance, stability, and fix technical bugs or crashes.",
      "To improve user experience, content delivery, and app features.",
      "To communicate with you regarding customer support, updates, or informational announcements.",
    ],
  },
  {
    id: "third-party",
    heading: "3. Third-Party Services and SDKs",
    body: [
      "Our app utilizes third-party infrastructure and streaming frameworks (such as audio stream metadata providers and hosting services) to deliver audio content. These third-party tools may collect technical data in accordance with their own respective privacy policies.",
      "We ensure that any third-party code or SDK integrated into our app complies strictly with Google Play’s User Data policies. We do not sell, rent, or trade your personal or sensitive user data to third parties.",
    ],
  },
  {
    id: "security",
    heading: "4. Data Security",
    body: [
      "We take the security of your data seriously. All data transmitted between the Reggae Vibe Radio app and our servers is protected using modern, secure cryptography (HTTPS/SSL encryption in transit).",
    ],
  },
  {
    id: "deletion",
    heading: "5. Account and Data Deletion Policy",
    body: [
      "If you have interacted with our services or submitted data to us and wish to have your information removed, you have the right to request data deletion.",
    ],
    bullets: [
      {
        label: "How to Request Deletion",
        text: "You can request the permanent deletion of any personal data associated with your interaction by contacting us directly at our support channels listed below. Upon receiving a request, we will promptly and permanently delete your information from our active records.",
      },
    ],
  },
  {
    id: "children",
    heading: "6. Children's Privacy",
    body: [
      "Our Service does not target or knowingly collect any personally identifiable information from children under the age of 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately so we can remove it.",
    ],
  },
  {
    id: "changes",
    heading: "7. Changes to This Privacy Policy",
    body: [
      'We may update our Privacy Policy from time to time. Any changes will be posted directly on this page with an updated "Effective Date." We encourage you to review this page periodically for any updates.',
    ],
  },
  {
    id: "contact",
    heading: "8. Contact Us",
    body: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact Reggae Vibe Media:",
    ],
    bullets: [
      { label: "Email", text: "mail@thereggaevibe.com" },
      { label: "Website", text: "reggaevibe.org" },
      { label: "Operator", text: "Reggae Vibe Media / Express Media Design" },
    ],
  },
];

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://reggaeviberadio.com/privacy-policy" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: "https://reggaeviberadio.com/privacy-policy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-8 text-gold" />
        <h1 className="text-4xl md:text-5xl">Privacy Policy</h1>
      </div>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Reggae Vibe Media (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Reggae Vibe
        Radio mobile application and the website reggaevibe.org (the &ldquo;Service&rdquo;).
      </p>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of
        personal data when you use our Service and the choices you have associated with that data. We comply
        fully with the Google Play Developer Program Policies, including the User Data guidelines.
      </p>
      <p className="mt-5 inline-flex rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
        Effective Date: {EFFECTIVE_DATE}
      </p>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="panel sticky top-24 hidden lg:block">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-gold">On this page</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted-foreground transition-colors hover:text-foreground">
                  {section.heading.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-8">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="panel scroll-mt-24 p-6 md:p-8">
              <h2 className="text-xl md:text-2xl">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.label} className="border-l-2 border-gold/50 pl-4">
                      <span className="text-sm font-bold text-foreground">{bullet.label}:</span>{" "}
                      <span className="text-sm leading-relaxed text-muted-foreground">{bullet.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.list && (
                <ul className="mt-4 space-y-2">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
