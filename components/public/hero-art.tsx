/**
 * Decorative hero illustration (pure SVG, ~2 KB, no data, no claims):
 * a stack of books, a document card and a course card floating over soft glows.
 */
export function HeroArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <svg viewBox="0 0 440 400" className="h-auto w-full" role="presentation" focusable="false">
        <defs>
          <linearGradient id="ha-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#818cf8" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="ha-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="ha-c" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
          <radialGradient id="ha-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity=".45" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="220" cy="210" r="190" fill="url(#ha-glow)" />
        <ellipse cx="220" cy="352" rx="150" ry="18" fill="#000" opacity=".25" />

        {/* back panel: course card */}
        <g transform="rotate(-6 150 130)">
          <rect x="52" y="52" width="210" height="130" rx="22" fill="#fff" fillOpacity=".08" stroke="#fff" strokeOpacity=".18" />
          <rect x="72" y="74" width="38" height="38" rx="11" fill="url(#ha-a)" />
          <rect x="122" y="80" width="104" height="9" rx="4.5" fill="#fff" fillOpacity=".55" />
          <rect x="122" y="98" width="64" height="8" rx="4" fill="#fff" fillOpacity=".25" />
          <rect x="72" y="132" width="170" height="8" rx="4" fill="#fff" fillOpacity=".2" />
          <rect x="72" y="150" width="120" height="8" rx="4" fill="#fff" fillOpacity=".2" />
        </g>

        {/* books */}
        <g>
          <rect x="120" y="290" width="200" height="40" rx="10" fill="url(#ha-b)" />
          <rect x="132" y="306" width="120" height="6" rx="3" fill="#fff" fillOpacity=".55" />
          <rect x="140" y="246" width="176" height="40" rx="10" fill="url(#ha-a)" />
          <rect x="154" y="262" width="96" height="6" rx="3" fill="#fff" fillOpacity=".55" />
          <rect x="128" y="202" width="188" height="40" rx="10" fill="url(#ha-c)" />
          <rect x="142" y="218" width="110" height="6" rx="3" fill="#fff" fillOpacity=".6" />
          <path d="M296 202v40" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* front panel: document */}
        <g transform="rotate(5 330 170)">
          <rect x="262" y="96" width="140" height="176" rx="20" fill="#fff" />
          <path d="M364 96h0a38 38 0 0 1 38 38v0h-38a0 0 0 0 1 0 0V96Z" fill="#e0e7ff" />
          <rect x="282" y="120" width="60" height="9" rx="4.5" fill="#4338ca" />
          <rect x="282" y="146" width="100" height="7" rx="3.5" fill="#cbd5e1" />
          <rect x="282" y="164" width="86" height="7" rx="3.5" fill="#cbd5e1" />
          <rect x="282" y="182" width="96" height="7" rx="3.5" fill="#cbd5e1" />
          <rect x="282" y="214" width="62" height="26" rx="13" fill="url(#ha-a)" />
          <rect x="294" y="224" width="38" height="6" rx="3" fill="#fff" />
        </g>

        {/* sparkles */}
        <g fill="#c7d2fe">
          <circle cx="60" cy="250" r="4" />
          <circle cx="400" cy="60" r="5" />
          <circle cx="94" cy="360" r="3" />
          <path d="M392 330l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        </g>
      </svg>
    </div>
  );
}
