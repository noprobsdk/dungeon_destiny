// FR-00004: Content Studio's layout: a dark side menu in the POC's colours,
// showing only the pages the signed-in person may use, a header with who is
// signed in, and Sign out through Cloudflare Access.
import { Anchor, AppShell, Group, NavLink, Stack, Text } from "@mantine/core";
import type { SignedInPerson } from "@dungeon-destiny/contracts";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { can } from "../shared/ui";
import { MUTED, POC_COLORS } from "./theme";

const PAGES = [
  { to: "/", label: "Home", permission: null },
  { to: "/users", label: "Users", permission: "users.view" },
  { to: "/roles", label: "Roles", permission: "roles.view" },
  { to: "/permissions", label: "Permissions", permission: "roles.view" },
] as const;

export function Layout({ person, children }: { person: SignedInPerson; children: ReactNode }) {
  const { pathname } = useLocation();
  const visible = PAGES.filter((page) => page.permission === null || can(person, page.permission));
  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 238, breakpoint: "sm" }} padding="lg">
      <AppShell.Header px="lg" bg={POC_COLORS.panel} style={{ borderColor: POC_COLORS.line }}>
        <Group h="100%" justify="flex-end" gap="md">
          <Text size="sm">
            {person.displayName} <Text span c={MUTED}>({person.email})</Text>
          </Text>
          <Anchor href="/cdn-cgi/access/logout" size="sm">
            Sign out
          </Anchor>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" bg={POC_COLORS.night} style={{ borderColor: POC_COLORS.nightSoft }}>
        <Stack gap={2}>
          <Text fw={700} c={POC_COLORS.goldBright} mb="md">
            Dungeon Destiny
            <Text span display="block" size="xs" c={POC_COLORS.nightText}>
              Content Studio
            </Text>
          </Text>
          {visible.map((page) => {
            const active = page.to === "/" ? pathname === "/" : pathname.startsWith(page.to);
            return (
              <NavLink
                key={page.to}
                component={Link}
                to={page.to}
                label={page.label}
                active={active}
                c={active ? POC_COLORS.goldBright : POC_COLORS.nightText}
                variant="subtle"
              />
            );
          })}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main bg={POC_COLORS.paper}>{children}</AppShell.Main>
    </AppShell>
  );
}
