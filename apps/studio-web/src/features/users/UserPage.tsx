// FR-00004: create and edit a user: email address, name, roles, and status.
// While saving, Save shows a spinner and is disabled, so a change is never
// sent twice; a notification reports the result, and the form keeps its
// values after an error.
import { Badge, Button, Checkbox, Group, LoadingOverlay, Modal, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { RoleView, SignedInPerson, UserView } from "@dungeon-destiny/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { callApi } from "../../shared/api-client";
import { LoadingRows, can, notifyFailed, notifySaved } from "../../shared/ui";

type Values = { email: string; displayName: string; roleIds: string[] };

export function UserPage({ person }: { person: SignedInPerson }) {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const manage = can(person, "users.manage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const user = useQuery({
    queryKey: ["users", id],
    queryFn: () => callApi<UserView>("GET", `/api/users/${id}`),
    enabled: !isNew,
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => callApi<RoleView[]>("GET", "/api/roles"),
    enabled: can(person, "roles.view"),
  });

  const form = useForm<Values>({ initialValues: { email: "", displayName: "", roleIds: [] } });
  const loaded = user.data?.data;
  useEffect(() => {
    if (loaded) {
      form.setValues({ email: loaded.email, displayName: loaded.displayName, roleIds: loaded.roles.map((r) => r.id) });
      form.resetDirty();
    }
    // Only when a different user has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.id, loaded?.updatedAt]);

  const save = useMutation({
    mutationFn: (values: Values) =>
      isNew ? callApi<UserView>("POST", "/api/users", values) : callApi<UserView>("PATCH", `/api/users/${id}`, values),
    onSuccess: async (response) => {
      notifySaved(response.message);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      if (isNew && response.data) await navigate(`/users/${response.data.id}`);
    },
    onError: (error) => notifyFailed(error.message),
  });

  const status = useMutation({
    mutationFn: (next: "deactivate" | "reactivate") => callApi<UserView>("POST", `/api/users/${id}/${next}`),
    onSuccess: async (response) => {
      setConfirming(false);
      notifySaved(response.message);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      setConfirming(false);
      notifyFailed(error.message);
    },
  });

  if (!isNew && user.isPending) return <LoadingRows label="Loading user" />;
  if (!isNew && user.isError) return <Text c="red">{user.error.message}</Text>;
  const busy = save.isPending || status.isPending;
  const active = loaded?.status !== "deactivated";

  return (
    <Stack maw={560} pos="relative">
      <LoadingOverlay visible={busy} zIndex={10} />
      <Group justify="space-between">
        <Title order={1}>{isNew ? "New user" : (loaded?.displayName ?? "User")}</Title>
        {!isNew && <Badge color={active ? "green" : "red"}>{active ? "Active" : "Deactivated"}</Badge>}
      </Group>
      <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
        <Stack>
          <TextInput label="Email" type="email" required disabled={!manage} {...form.getInputProps("email")} />
          <TextInput label="Name" required disabled={!manage} {...form.getInputProps("displayName")} />
          <Checkbox.Group label="Roles" {...form.getInputProps("roleIds")}>
            <Stack gap="xs" mt="xs">
              {roles.isPending && can(person, "roles.view") ? (
                <LoadingRows label="Loading roles" rows={2} />
              ) : (
                (roles.data?.data ?? []).map((role) => (
                  <Checkbox key={role.id} value={role.id} label={role.name} description={role.description} disabled={!manage} />
                ))
              )}
            </Stack>
          </Checkbox.Group>
          {manage && (
            <Group>
              <Button type="submit" loading={save.isPending} disabled={busy}>
                Save
              </Button>
              {!isNew &&
                (active ? (
                  <Button variant="outline" color="red" onClick={() => setConfirming(true)} disabled={busy}>
                    Deactivate
                  </Button>
                ) : (
                  <Button variant="outline" loading={status.isPending} onClick={() => status.mutate("reactivate")}>
                    Reactivate
                  </Button>
                ))}
            </Group>
          )}
        </Stack>
      </form>
      <Modal opened={confirming} onClose={() => setConfirming(false)} title="Deactivate this user?">
        <Stack>
          <Text size="sm">They are removed from Cloudflare Access and can no longer sign in. You can reactivate them later.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button color="red" loading={status.isPending} onClick={() => status.mutate("deactivate")}>
              Yes, deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
