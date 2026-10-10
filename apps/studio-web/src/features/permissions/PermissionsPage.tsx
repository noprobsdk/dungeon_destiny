// FR-00004: the read-only permission list. Permissions are defined in code,
// each with what it allows and why it exists; this page shows them with the
// roles that have them.
import { Badge, Code, Group, Stack, Table, Text, Title } from "@mantine/core";
import type { PermissionView } from "@dungeon-destiny/contracts";
import { useQuery } from "@tanstack/react-query";
import { MUTED } from "../../app/theme";
import { callApi } from "../../shared/api-client";
import { LoadingRows } from "../../shared/ui";

export function PermissionsPage() {
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () => callApi<PermissionView[]>("GET", "/api/permissions"),
  });
  return (
    <Stack>
      <Title order={1}>Permissions</Title>
      <Text c={MUTED} size="sm">
        Permissions are defined in code by the Feature Request that needs them. Choose which roles have them on each role&apos;s page.
      </Text>
      {permissions.isPending ? (
        <LoadingRows label="Loading permissions" />
      ) : permissions.isError ? (
        <Text c="red">{permissions.error.message}</Text>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Permission</Table.Th>
              <Table.Th>Area</Table.Th>
              <Table.Th>What it allows</Table.Th>
              <Table.Th>Purpose</Table.Th>
              <Table.Th>Added by</Table.Th>
              <Table.Th>Roles</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(permissions.data?.data ?? []).map((permission) => (
              <Table.Tr key={permission.name}>
                <Table.Td>
                  <Code>{permission.name}</Code>
                </Table.Td>
                <Table.Td>{permission.area}</Table.Td>
                <Table.Td>{permission.description}</Table.Td>
                <Table.Td>{permission.purpose}</Table.Td>
                <Table.Td>{permission.addedBy}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {permission.roles.map((role) => (
                      <Badge key={role.id} variant="light">
                        {role.name}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
