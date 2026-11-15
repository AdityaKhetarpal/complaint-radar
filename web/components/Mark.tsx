// The logo: a radar sweep over three complaint "blips"
export default function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".45" />
      <path d="M16 16 L16 3 A13 13 0 0 1 27.3 9.5 Z" fill="var(--accent)" opacity=".85" />
      <circle cx="21.5" cy="9" r="2" fill="currentColor" />
      <circle cx="9.5" cy="20" r="1.6" fill="currentColor" opacity=".6" />
      <circle cx="19" cy="23" r="1.3" fill="currentColor" opacity=".6" />
    </svg>
  );
}
