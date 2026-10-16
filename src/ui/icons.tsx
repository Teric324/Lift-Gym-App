import type { SVGProps } from 'react';

/** 24 px line icons for the bottom navigation. They take their colour from the text. */
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

/** The bolt: outlined, and filled when the tab is active (the stylesheet sets the fill). */
export function BoltIcon() {
  return (
    <Icon className="icon icon--bolt">
      <path d="M13.5 2L4.5 13.5H11L10 22L19.5 9.5H13Z" />
    </Icon>
  );
}

export function HistoryIcon() {
  return (
    <Icon className="icon">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8M12 7.5V12l3 2" />
    </Icon>
  );
}

export function ListIcon() {
  return (
    <Icon className="icon">
      <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Icon>
  );
}

export function SlidersIcon() {
  return (
    <Icon className="icon">
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="8" cy="17" r="2.5" />
    </Icon>
  );
}

/** Three bars: the handle to drag a row by. */
export function GripIcon() {
  return (
    <Icon className="icon">
      <path d="M5 8h14M5 12h14M5 16h14" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon className="icon" strokeWidth="3">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}
