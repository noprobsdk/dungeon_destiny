// FR-00003: who studio-api lets in. Only the SuperAdmin, whose email address is
// set at deploy time; when it is not set, nobody is let in.
export function isSuperAdmin(email: string, superAdminEmail: string): boolean {
  const expected = superAdminEmail.trim().toLowerCase();
  if (expected === "") return false;
  return email.trim().toLowerCase() === expected;
}
