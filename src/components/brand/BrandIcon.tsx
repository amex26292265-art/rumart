/**
 * Premium, minimal, original SVG marks per category — clean geometric glyphs
 * (not trademarked logos), monochrome via currentColor so they sit well on the
 * brand-gradient tiles. Falls back to a neutral mark for unknown slugs.
 */
type Props = { slug?: string | null; className?: string };

const wrap = (children: React.ReactNode, className?: string) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    {children}
  </svg>
);

const letter = (t: string, className?: string) =>
  wrap(
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize="12"
      fontWeight="800"
      fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      fill="currentColor"
    >
      {t}
    </text>,
    className,
  );

const S = 1.7; // stroke width

export function BrandIcon({ slug, className }: Props) {
  switch (slug) {
    case "steam":
      return wrap(
        <>
          <circle cx="9" cy="9" r="3.2" stroke="currentColor" strokeWidth={S} />
          <circle cx="16.5" cy="15.5" r="2.2" stroke="currentColor" strokeWidth={S} />
          <path d="M4 14.5 9 12M11.7 10.7 15 13.6" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        </>,
        className,
      );
    case "fortnite":
      return letter("F", className);
    case "valorant":
      return wrap(
        <path d="M4 5 12 15 20 5 20 8 12 18 4 8Z" fill="currentColor" />,
        className,
      );
    case "ea":
      return letter("EA", className);
    case "gta":
      return wrap(
        <path
          d="m12 3 2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 15.7 7.35 17.9l.9-5.15L4.5 8.5l5.2-.8Z"
          fill="currentColor"
        />,
        className,
      );
    case "discord":
      return wrap(
        <>
          <path
            d="M7 7.5c1.5-1 3-1.3 5-1.3s3.5.3 5 1.3c1.3 1.6 2 3.7 2 6.3-1 1.2-2.4 2-3.8 2.2l-.8-1.3c.6-.2 1.2-.5 1.7-.9-2.6 1.3-5.6 1.3-8.2 0 .5.4 1.1.7 1.7.9L8.8 16C7.4 15.8 6 15 5 13.8c0-2.6.7-4.7 2-6.3Z"
            stroke="currentColor"
            strokeWidth={S}
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="12" r="1" fill="currentColor" />
          <circle cx="14.5" cy="12" r="1" fill="currentColor" />
        </>,
        className,
      );
    case "telegram":
      return wrap(
        <path d="M21 5 3 11.5l5 1.7 2 5.3 2.8-3.2L18 18Z" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />,
        className,
      );
    case "genshin":
      return wrap(
        <path
          d="M12 3c1 3.5 2.5 5 6 6-3.5 1-5 2.5-6 6-1-3.5-2.5-5-6-6 3.5-1 5-2.5 6-6Z"
          stroke="currentColor"
          strokeWidth={S}
          strokeLinejoin="round"
        />,
        className,
      );
    case "epicgames":
      return letter("E", className);
    case "roblox":
      return wrap(
        <path d="M8 4 20 7l-3 12L5 16Z M11 10l3 .8-.8 3-3-.8Z" fill="currentColor" fillRule="evenodd" />,
        className,
      );
    case "minecraft":
      return wrap(
        <>
          <rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth={S} />
          <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth={S} />
        </>,
        className,
      );
    case "supercell":
      return wrap(
        <path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />,
        className,
      );
    case "warface":
      return wrap(
        <>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth={S} />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </>,
        className,
      );
    case "battlenet":
      return wrap(
        <>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth={S} />
          <path d="M8 8c3 1 5 3 8 8-5-1-7-3-8-8Z" fill="currentColor" opacity="0.9" />
        </>,
        className,
      );
    case "uplay":
      return wrap(
        <path d="M12 4a8 8 0 1 0 7 4M9 12a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />,
        className,
      );
    case "vpn":
      return wrap(
        <path
          d="M12 3 5 6v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6Z"
          stroke="currentColor"
          strokeWidth={S}
          strokeLinejoin="round"
        />,
        className,
      );
    case "instagram":
      return wrap(
        <>
          <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" stroke="currentColor" strokeWidth={S} />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth={S} />
          <circle cx="16.4" cy="7.6" r="1" fill="currentColor" />
        </>,
        className,
      );
    case "tiktok":
      return wrap(
        <path
          d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46V12a1.5 1.5 0 1 0 1 1.4V4h2c.3 1.7 1.5 3 3.5 3.2V9c-1.3 0-2.5-.4-3.5-1.1"
          stroke="currentColor"
          strokeWidth={S}
          strokeLinejoin="round"
        />,
        className,
      );
    case "giftcards":
      return wrap(
        <>
          <rect x="4" y="9" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth={S} />
          <path d="M4 13h16M12 9v11M8.5 9C7 9 6 8 6 6.8 6 5.8 6.8 5 8 5c2 0 3 2 4 4 1-2 2-4 4-4 1.2 0 2 .8 2 1.8C18 8 17 9 15.5 9" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        </>,
        className,
      );
    default:
      return wrap(
        <path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />,
        className,
      );
  }
}
