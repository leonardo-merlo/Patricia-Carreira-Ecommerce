"use client"

type IconName =
  | "home" | "box" | "layers" | "wrench" | "bag" | "search" | "plus" | "minus"
  | "chevDown" | "chevRight" | "chevUp" | "arrowUp" | "arrowDown" | "trendUp"
  | "check" | "checkCircle" | "x" | "xCircle" | "alert" | "alertCircle" | "info"
  | "bell" | "settings" | "logout" | "edit" | "trash" | "eye" | "upload" | "image"
  | "package" | "truck" | "user" | "users" | "money" | "cart" | "filter"
  | "download" | "history" | "list" | "moreH" | "sparkles" | "tag" | "factory"
  | "store" | "creditCard" | "fileText" | "plug" | "mail" | "mapPin" | "wallet"
  | "instagram"

interface AdminIconProps {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
}

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 9.5L8 3l5 6.5V13a1 1 0 01-1 1h-2.5v-3h-3v3H4a1 1 0 01-1-1V9.5z"/>,
  box: <><path d="M2.5 4.5L8 2l5.5 2.5L8 7 2.5 4.5z"/><path d="M2.5 4.5v6L8 13l5.5-2.5v-6"/><path d="M8 7v6"/></>,
  layers: <><path d="M8 2L2 5l6 3 6-3-6-3z"/><path d="M2 8l6 3 6-3"/><path d="M2 11l6 3 6-3"/></>,
  wrench: <path d="M11.5 2.5a3 3 0 00-3.9 3.9L2 12l2 2 5.6-5.6a3 3 0 003.9-3.9l-1.7 1.7-1.4-1.4 1.7-1.7-.6-.6z"/>,
  bag: <><path d="M3 5h10l-.5 8.5a1 1 0 01-1 1h-7a1 1 0 01-1-1L3 5z"/><path d="M5.5 5V3.5a2.5 2.5 0 015 0V5"/></>,
  search: <><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L13.5 13.5"/></>,
  plus: <><path d="M8 3v10M3 8h10"/></>,
  minus: <path d="M3 8h10"/>,
  chevDown: <path d="M4 6l4 4 4-4"/>,
  chevRight: <path d="M6 4l4 4-4 4"/>,
  chevUp: <path d="M4 10l4-4 4 4"/>,
  arrowUp: <><path d="M8 13V3"/><path d="M4 7l4-4 4 4"/></>,
  arrowDown: <><path d="M8 3v10"/><path d="M4 9l4 4 4-4"/></>,
  trendUp: <><path d="M2 11l4-4 3 3 5-5"/><path d="M10 5h4v4"/></>,
  check: <path d="M3 8.5L6.5 12 13 4.5"/>,
  checkCircle: <><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-4"/></>,
  x: <path d="M4 4l8 8M12 4l-8 8"/>,
  xCircle: <><circle cx="8" cy="8" r="6"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></>,
  alert: <><path d="M8 2L1.5 13h13L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor"/></>,
  alertCircle: <><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/></>,
  info: <><circle cx="8" cy="8" r="6"/><path d="M8 7v4"/><circle cx="8" cy="5" r="0.5" fill="currentColor"/></>,
  bell: <><path d="M3.5 11.5h9l-1-2v-3a3.5 3.5 0 00-7 0v3l-1 2z"/><path d="M6.5 13.5a1.5 1.5 0 003 0"/></>,
  settings: <><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M3 3l1.5 1.5M11.5 11.5L13 13M1 8h2M13 8h2M3 13l1.5-1.5M11.5 4.5L13 3"/></>,
  logout: <><path d="M9 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1h5a1 1 0 001-1v-1"/><path d="M6 8h8M11 5l3 3-3 3"/></>,
  edit: <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>,
  trash: <><path d="M3 4.5h10M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M4 4.5v8a1 1 0 001 1h6a1 1 0 001-1v-8"/></>,
  eye: <><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></>,
  upload: <><path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/><path d="M5 6l3-3 3 3M8 3v8"/></>,
  image: <><rect x="2" y="2" width="12" height="12" rx="1.5"/><circle cx="6" cy="6" r="1.2"/><path d="M14 11l-3-3-6 6"/></>,
  package: <><path d="M2.5 4.5L8 2l5.5 2.5v7L8 14l-5.5-2.5v-7z"/><path d="M2.5 4.5L8 7l5.5-2.5"/><path d="M8 7v7"/><path d="M5.25 3.25l5.5 2.5"/></>,
  truck: <><path d="M1.5 4.5h7v6h-7v-6z"/><path d="M8.5 6.5h3l2 2v2h-5v-4z"/><circle cx="4" cy="11.5" r="1.2"/><circle cx="11" cy="11.5" r="1.2"/></>,
  user: <><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.2 2.2-4 5-4s5 1.8 5 4"/></>,
  users: <><circle cx="6" cy="6" r="2"/><path d="M2 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"/><path d="M11 5a2 2 0 010 4M14 13c0-2-1.5-3-3-3"/></>,
  money: <><rect x="1.5" y="3.5" width="13" height="9" rx="1"/><circle cx="8" cy="8" r="1.5"/><circle cx="3.5" cy="8" r="0.5" fill="currentColor"/><circle cx="12.5" cy="8" r="0.5" fill="currentColor"/></>,
  cart: <><path d="M1.5 2.5h2l1.5 8h7l1.5-5.5h-9"/><circle cx="6" cy="13" r="1"/><circle cx="11" cy="13" r="1"/></>,
  filter: <path d="M1.5 3.5h13L9.5 9.5v4l-3-1.5v-2.5L1.5 3.5z"/>,
  download: <><path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/><path d="M5 8l3 3 3-3M8 11V3"/></>,
  history: <><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></>,
  list: <><path d="M5 4h9M5 8h9M5 12h9"/><circle cx="2.5" cy="4" r="0.5" fill="currentColor"/><circle cx="2.5" cy="8" r="0.5" fill="currentColor"/><circle cx="2.5" cy="12" r="0.5" fill="currentColor"/></>,
  moreH: <><circle cx="3.5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.5" cy="8" r="1" fill="currentColor"/></>,
  sparkles: <><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M4 12l2-2"/></>,
  tag: <><path d="M2 2h6l6 6-6 6-6-6V2z"/><circle cx="5" cy="5" r="1" fill="currentColor"/></>,
  factory: <><path d="M2 13h12V6L10 8.5V6L6 8.5V4L2 5.5V13z"/><rect x="4" y="10" width="2" height="3" fill="currentColor" stroke="none"/><rect x="7" y="10" width="2" height="3" fill="currentColor" stroke="none"/><rect x="10" y="10" width="2" height="3" fill="currentColor" stroke="none"/></>,
  store: <><path d="M2 6h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"/><path d="M1.5 3.5h13L13 6H3L1.5 3.5z"/><path d="M6 14v-5h4v5"/></>,
  creditCard: <><rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M1.5 7h13"/><path d="M4.5 10.5h3"/></>,
  fileText: <><path d="M4 1.5h6l3.5 3.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z"/><path d="M10 1.5V5h3.5"/><path d="M5 8.5h6M5 11h4"/></>,
  plug: <><path d="M6 2v3M10 2v3"/><path d="M5 5h6v2a3 3 0 01-6 0V5z"/><path d="M8 10v4"/></>,
  mail: <><rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M1.5 5.5l6.5 4 6.5-4"/></>,
  mapPin: <><path d="M8 2a4 4 0 014 4c0 2.5-4 8-4 8S4 8.5 4 6a4 4 0 014-4z"/><circle cx="8" cy="6" r="1.5"/></>,
  wallet: <><rect x="1.5" y="5" width="13" height="9" rx="1"/><path d="M5 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5"/><rect x="10" y="8" width="4.5" height="3" rx="0.5"/></>,
  instagram: <><rect x="2.5" y="2.5" width="11" height="11" rx="3"/><circle cx="8" cy="8" r="2.6"/><circle cx="11.2" cy="4.8" r="0.6" fill="currentColor"/></>,
}

export function AdminIcon({ name, size = 16, className = "", style }: AdminIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"icon " + className}
      style={style}
    >
      {paths[name] ?? null}
    </svg>
  )
}
