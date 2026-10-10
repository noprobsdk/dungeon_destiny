// FR-00004: the Users list, with search and a status filter. The SuperAdmin,
// defined in configuration, is shown as a fixed row.
import { Alert, Badge, Button, Group, List, SegmentedControl, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import type { AccessSyncReport, SignedInPerson, UserView } from "@dungeon-destiny/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { callApi } from "../../shared/api-client";
import { LoadingRows, can } from "../../shared/ui";

export function UsersPage({ person }: { person: SignedInPerson }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const users = useQuery({ queryKey: ["users"], queryFn: () => callApi<UserView[]>("GET", "/api/users") });
  // FR-00004: compares the Access group "Content Studio users" with the active users.
  const check = useMutation({ mutationFn: () => callApi<AccessSyncReport>("GET", "/api/access-sync") });
  const report = check.data?.data;
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
          <Group>
            <Button variant="default" loading={check.isPending} onClick={() => check.mutate()}>
              Check Access
            </Button>
            <Button component={Link} to="/users/new">
              New user
            </Button>
          </Group>
        )}
      </Group>
      {check.isError && (
        <Alert color="red" title="Access could not be checked">
          {check.error.message}
        </Alert>
      )}
      {report && (
        <Alert color={report.inSync ? "green" : "red"} title={report.inSync ? "Access matches the users" : "Access does not match the users"}>
          {report.inSync ? (
            <Text size="sm">Every active user is in the Access group, and nobody else is.</Text>
          ) : (
            <Stack gap="xs">
              {report.missingFromGroup.length > 0 && (
                <div>
                  <Text size="sm">Active users missing from the Access group:</Text>
                  <List size="sm">
                    {report.missingFromGroup.map((email) => (
                      <List.Item key={email}>{email}</List.Item>
                    ))}
                  </List>
                </div>
              )}
              {report.notActiveUsers.length > 0 && (
                <div>
                  <Text size="sm">In the Access group but not active users:</Text>
                  <List size="sm">
                    {report.notActiveUsers.map((email) => (
                      <List.Item key={email}>{email}</List.Item>
                    ))}
                  </List>
                </div>
              )}
              <Text size="sm">Saving any user change sends the full list to Access again and corrects this.</Text>
            </Stack>
          )}
        </Alert>
      )}
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
