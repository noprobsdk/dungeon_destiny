// FR-00004: small shared pieces for Content Studio's pages: permission checks
// for showing pages and buttons, the loading skeleton, and notifications.
// Hiding something here is never the only protection; studio-api checks every
// permission itself.
import { Skeleton, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { SignedInPerson } from "@dungeon-destiny/contracts";
import type { ReactNode } from "react";

export function can(person: SignedInPerson, permission: string): boolean {
  return person.superadmin || person.permissions.includes(permission);
}

export function LoadingRows({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <Stack aria-busy="true" aria-label={label} gap="xs">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={32} />
      ))}
    </Stack>
  );
}

export function NoPermission() {
  return (
    <Stack>
      <Title order={2}>No permission</Title>
      <Text>You do not have permission to use this page.</Text>
    </Stack>
  );
}

export function Require({ person, permission, children }: { person: SignedInPerson; permission: string; children: ReactNode }) {
  return can(person, permission) ? <>{children}</> : <NoPermission />;
}

export function notifySaved(message: string) {
  notifications.show({ color: "green", title: "Saved", message });
}

export function notifyFailed(message: string) {
  notifications.show({ color: "red", title: "Not saved", message });
}
