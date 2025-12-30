export function isAdminEmail(email) {
  const normalized = email?.toLowerCase?.().trim?.() || "";
  if (!normalized) return false;

  const raw = [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL].filter(Boolean).join(",");
  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(normalized);
}

export function isAdminSession(session) {
  return isAdminEmail(session?.user?.email);
}

