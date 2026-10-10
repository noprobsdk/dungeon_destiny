// FR-00003, FR-00004: the home page: who is signed in, and whether studio-api
// is running.
import { Stack, Text, Title } from "@mantine/core";
import type { SignedInPerson } from "@dungeon-destiny/contracts";
import { ServiceStatus } from "../status/ServiceStatus";

export function HomePage({ person }: { person: SignedInPerson }) {
  return (
    <Stack>
      <Title order={1}>Welcome to Content Studio</Title>
      <Text>
        Signed in as <strong>{person.email}</strong>.
      </Text>
      <ServiceStatus />
    </Stack>
  );
}
