// FR-00004: the input schemas and result types shared by Content Studio's
// pages (studio-web) and its API (studio-api). The same Zod schema checks a
// form in the browser and the untrusted input in studio-api.
import { z } from "zod";
import { PERMISSION_NAMES } from "./permissions";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a plain email address.");

const displayName = z.string().trim().min(1, "Enter a name.").max(100);

const id = z.uuid();

export const createUserInput = z
  .object({
    email,
    displayName,
    roleIds: z.array(id).max(50),
  })
  .strict();
export type CreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = z
  .object({
    email: email.optional(),
    displayName: displayName.optional(),
    roleIds: z.array(id).max(50).optional(),
  })
  .strict();
export type UpdateUserInput = z.infer<typeof updateUserInput>;

export const roleInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a role name.")
      .max(60)
      .regex(/^[a-z0-9-]+$/, "Use only lower-case letters, digits, and hyphens, for example 3d-editor."),
    description: z.string().trim().max(500),
    permissionNames: z.array(z.enum(PERMISSION_NAMES as [string, ...string[]])).max(200),
  })
  .strict();
export type RoleInput = z.infer<typeof roleInput>;

export const updateRoleInput = roleInput.partial().strict();
export type UpdateRoleInput = z.infer<typeof updateRoleInput>;

export const idInput = id;

export type UserStatus = "active" | "deactivated";

export type RoleSummary = { id: string; name: string };

export type UserView = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: RoleSummary[];
  createdAt: string;
  updatedAt: string;
};

export type RoleView = {
  id: string;
  name: string;
  description: string;
  permissionNames: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PermissionView = {
  name: string;
  area: string;
  description: string;
  purpose: string;
  addedBy: string;
  roles: RoleSummary[];
};

// The signed-in person, as GET /api/me returns it.
export type SignedInPerson = {
  email: string;
  displayName: string;
  superadmin: boolean;
  roles: RoleSummary[];
  permissions: string[];
};

// GET /api/access-sync: how the Access group differs from the active users.
export type AccessSyncReport = {
  inSync: boolean;
  missingFromGroup: string[];
  notActiveUsers: string[];
};
