// FR-00004: the Users list, with search and a status filter. The SuperAdmin,
// defined in configuration, is shown as a fixed row.
import { Badge, Button, Group, SegmentedControl, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import type { SignedInPerson, UserView } from "@dungeon-destiny/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { callApi } from "../../shared/api-client";
import { LoadingRows, can } from "../../shared/ui";

export function UsersPage({ person }: { person: SignedInPerson }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const users = useQuery({ queryKey: ["users"], queryFn: () => callApi<UserView[]>("GET", "/api/users") });
  const list = (users.data?.data ?? []).filter(
    (user) =>
      (status === "all" || user.status === status) &&
      `${user.email} ${user.displayName}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Users</Title>
        {can(person, "users.manage") && (
          <Button component={Link} to="/users/new">
            New user
          </Button>
        )}
      </Group>
      <Group>
        <TextInput placeholder="Search by email or name" value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
        <SegmentedControl
          value={status}
          onChange={setStatus}
          data={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "deactivated", label: "Deactivated" },
          ]}
        />
      </Group>
      {users.isPending ? (
        <LoadingRows label="Loading users" />
      ) : users.isError ? (
        <Text c="red">{users.error.message}</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Roles</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Text size="sm">SuperAdmin (defined in configuration, cannot be changed here)</Text>
              </Table.Td>
              <Table.Td>
                <Badge color="green">Active</Badge>
              </Table.Td>
            </Table.Tr>
            {list.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Link to={`/users/${user.id}`}>{user.email}</Link>
                </Table.Td>
                <Table.Td>{user.displayName}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {user.roles.map((role) => (
                      <Badge key={role.id} variant="light">
                        {role.name}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={user.status === "active" ? "green" : "red"}>
                    {user.status === "active" ? "Active" : "Deactivated"}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
