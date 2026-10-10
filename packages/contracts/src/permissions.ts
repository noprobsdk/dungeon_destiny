// FR-00004: Content Studio's permissions. The code that checks a permission
// and its explanation live together here. A migration copies this list into
// Content D1's `permissions` table; a test checks that both match. Each later
// Feature Request adds the permissions its screens need, with a description
// of what the permission allows and a purpose saying why it exists and who
// should have it.

export type PermissionDefinition = {
  readonly name: string;
  readonly area: string;
  readonly description: string;
  readonly purpose: string;
  readonly addedBy: string;
};

export const PERMISSIONS = [
  {
    name: "users.view",
    area: "Users",
    description: "See the list of Content Studio users, with their email addresses, names, roles, and status.",
    purpose:
      "For people who need to know who has access to Content Studio, such as team leads and support. It shows email addresses, so give it only to people who need them.",
    addedBy: "FR-00004",
  },
  {
    name: "users.manage",
    area: "Users",
    description:
      "Create users, change their names, email addresses, and roles, deactivate and reactivate them, and check that the Access group matches the users.",
    purpose:
      "For the people responsible for Content Studio access. It controls who can sign in and what they can do, so give it to as few people as possible.",
    addedBy: "FR-00004",
  },
  {
    name: "roles.view",
    area: "Roles",
    description: "See the roles, the permissions each role has, and the permission list with descriptions and purposes.",
    purpose: "For people who need to understand what each role allows before asking for access or reviewing it.",
    addedBy: "FR-00004",
  },
  {
    name: "roles.manage",
    area: "Roles",
    description: "Create, change, and delete roles, and choose which permissions each role has.",
    purpose:
      "For the people responsible for Content Studio access. Changing a role changes what every user with that role can do, so give it to as few people as possible.",
    addedBy: "FR-00004",
  },
] as const satisfies readonly PermissionDefinition[];

export type PermissionName = (typeof PERMISSIONS)[number]["name"];

export const PERMISSION_NAMES: readonly PermissionName[] = PERMISSIONS.map((permission) => permission.name);

export function isPermissionName(value: string): value is PermissionName {
  return (PERMISSION_NAMES as readonly string[]).includes(value);
}
