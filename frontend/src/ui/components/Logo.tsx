import { strings } from '../strings'

export function Logo() {
  return (
    <div className="logo" aria-label={strings.logo.ariaLabel}>
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" />
        <path d="M8 16h16M16 8v16" />
      </svg>
      <span>{strings.logo.name}</span>
    </div>
  )
}
