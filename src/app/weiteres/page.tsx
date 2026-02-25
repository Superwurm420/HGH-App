const LINKS = [
  {
    title: 'Schul-Website',
    url: 'https://holztechnik-hildesheim.de/',
    subtitle: 'holztechnik-hildesheim.de',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10L12 4l9 6" />
        <path d="M5 10v9h14v-9" />
        <path d="M9 19v-5h6v5" />
      </svg>
    ),
  },
  {
    title: 'Nextcloud',
    url: 'https://hgh-hi.regio-box.net/',
    subtitle: 'hgh-hi.regio-box.net',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.5A3.5 3.5 0 0 0 7 18z" />
      </svg>
    ),
  },
];

const INSTAGRAM = [
  { title: 'Schule', handle: '@hgh.hildesheim', url: 'https://www.instagram.com/hgh.hildesheim/' },
  { title: 'HT21', handle: '@usf_ht21', url: 'https://www.instagram.com/usf_ht21' },
  { title: 'HT22', handle: '@usf_ht22', url: 'https://www.instagram.com/usf_ht22' },
];

function InstagramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </svg>
  );
}

export default function WeiteresPage() {
  return (
    <>
      <div className="card surface">
        <h2 className="text-lg font-bold mb-3">Links</h2>
        <nav className="space-y-2" aria-label="Wichtige Links">
          {LINKS.map((link) => (
            <a
              key={link.url}
              className="link-card"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="link-icon" aria-hidden="true">{link.icon}</span>
              <div>
                <div className="text-sm font-semibold">{link.title}</div>
                <div className="text-xs text-muted">{link.subtitle}</div>
              </div>
              <span className="link-arrow" aria-hidden="true">{'\u2197'}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="card surface mt-3">
        <h2 className="text-lg font-bold mb-3">Instagram</h2>
        <nav className="space-y-2" aria-label="Instagram">
          {INSTAGRAM.map((ig) => (
            <a
              key={ig.url}
              className="link-card"
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="link-icon" aria-hidden="true"><InstagramIcon /></span>
              <div>
                <div className="text-sm font-semibold">{ig.title}</div>
                <div className="text-xs text-muted">{ig.handle}</div>
              </div>
              <span className="link-arrow" aria-hidden="true">{'\u2197'}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="card surface mt-3">
        <h2 className="text-lg font-bold mb-3">Informationen</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">Installation</h3>
            <ul className="space-y-1 text-muted">
              <li><strong>Android:</strong> Browser-Menü &rarr; &bdquo;App installieren&ldquo;</li>
              <li><strong>iOS:</strong> Teilen &rarr; &bdquo;Zum Home-Bildschirm&ldquo;</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
