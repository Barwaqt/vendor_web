'use client';

import { Notfound } from './components/notfound';

export default function VendorNotFound() {
  return (
    <Notfound
      homeHref="/dashboard"
      trackHref="/dashboard"
      helpHref="mailto:vendor-support@barwaqt.com"
      searchPlaceholder="Search products, orders or customers..."
      onSearch={(term) => {
        window.location.href = `/dashboard?search=${encodeURIComponent(term)}`;
      }}
    />
  );
}
