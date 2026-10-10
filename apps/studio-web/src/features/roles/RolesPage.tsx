// FR-00004: the Roles list, with each role's numbers of users and permissions.
import { Button, Group, Stack, Table, Text, Title } from "@mantine/core";
import type { RoleView, SignedInPerson } from "@dungeon-destiny/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { callApi } from "../../shared/api-client";
import { LoadingRows, can } from "../../shared/ui";

export function RolesPage({ person }: { person: SignedInPerson }) {
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => callApi<RoleView[]>("GET", "/api/roles") });
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Roles</Title>
        {can(person, "roles.manage") && (
          <Button component={Link} to="/roles/new">
            New role
          </Button>
        )}
      </Group>
      {roles.isPending ? (
        <LoadingRows label="Loading roles" />
      ) : roles.isError ? (
        <Text c="red">{roles.error.message}</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Role</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Users</Table.Th>
              <Table.Th>Permissions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(roles.data?.data ?? []).map((role) => (
              <Table.Tr key={role.id}>
                <Table.Td>
                  <Link to={`/roles/${role.id}`}>{role.name}</Link>
                </Table.Td>
                <Table.Td>{role.description}</Table.Td>
                <Table.Td>{role.userCount}</Table.Td>
                <Table.Td>{role.permissionNames.length}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
