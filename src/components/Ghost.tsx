/** The spirit: glows and breathes while the voice is speaking, so anyone helping knows to listen. */
export function Ghost({ speaking }: { speaking: boolean }) {
  return (
    <div className="ghost" data-speaking={speaking} aria-hidden="true">
      <svg viewBox="0 0 100 120">
        <defs>
          <radialGradient id="ghostBody" cx="0.45" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#e7e2f5" />
            <stop offset="1" stopColor="#b9b0d6" />
          </radialGradient>
        </defs>
        <path d="M50 6C27 6 14 24 14 46v58c0 4 4 6 7 3l7-7 8 8c2 2 5 2 7 0l7-7 7 7c2 2 5 2 7 0l8-8 7 7c3 3 7 1 7-3V46C86 24 73 6 50 6z" fill="url(#ghostBody)" />
        <ellipse className="ghost__eye" cx="38" cy="46" rx="6" ry="8" fill="#1b1028" />
        <ellipse className="ghost__eye" cx="62" cy="46" rx="6" ry="8" fill="#1b1028" />
        <ellipse className="ghost__mouth" cx="50" cy="68" rx="7" ry="5" fill="#1b1028" />
      </svg>
    </div>
  );
}
