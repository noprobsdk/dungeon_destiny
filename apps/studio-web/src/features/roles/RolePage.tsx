// FR-00004: create and edit a role: its name, description, and permissions.
// The permissions are a checklist grouped by area, each with its description
// and purpose, so it is clear what is granted and why. A role can be deleted
// only while no user has it.
import { Button, Checkbox, Group, LoadingOverlay, Modal, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { roleInput } from "@dungeon-destiny/contracts";
import type { PermissionView, RoleView, SignedInPerson } from "@dungeon-destiny/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MUTED } from "../../app/theme";
import { callApi } from "../../shared/api-client";
import { serverFieldErrors, validateWith } from "../../shared/form";
import { LoadingRows, can, notifyFailed, notifySaved } from "../../shared/ui";

type Values = { name: string; description: string; permissionNames: string[] };

function byArea(permissions: PermissionView[]): [string, PermissionView[]][] {
  const areas = new Map<string, PermissionView[]>();
  for (const permission of permissions) {
    areas.set(permission.area, [...(areas.get(permission.area) ?? []), permission]);
  }
  return [...areas];
}

export function RolePage({ person }: { person: SignedInPerson }) {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const manage = can(person, "roles.manage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const role = useQuery({
    queryKey: ["roles", id],
    queryFn: () => callApi<RoleView>("GET", `/api/roles/${id}`),
    enabled: !isNew,
  });
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () => callApi<PermissionView[]>("GET", "/api/permissions"),
  });

  const form = useForm<Values>({
    initialValues: { name: "", description: "", permissionNames: [] },
    validate: validateWith<Values>(roleInput),
  });
  const loaded = role.data?.data;
  useEffect(() => {
    if (loaded) {
      form.setValues({ name: loaded.name, description: loaded.description, permissionNames: loaded.permissionNames });
      form.resetDirty();
    }
    // Only when a different role has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded?.id, loaded?.updatedAt]);

  const save = useMutation({
    mutationFn: (values: Values) =>
      isNew ? callApi<RoleView>("POST", "/api/roles", values) : callApi<RoleView>("PATCH", `/api/roles/${id}`, values),
    onSuccess: async (response) => {
      notifySaved(response.message);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await queryClient.invalidateQueries({ queryKey: ["permissions"] });
      // FR-00004: back to the list after a successful save.
      await navigate("/roles");
    },
    onError: (error) => {
      const fields = serverFieldErrors(error);
      form.setErrors(fields);
      notifyFailed(Object.keys(fields).length > 0 ? `${error.message} Check the highlighted fields.` : error.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => callApi<null>("DELETE", `/api/roles/${id}`),
    onSuccess: async (response) => {
      setConfirming(false);
      notifySaved(response.message);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await navigate("/roles");
    },
    onError: (error) => {
      setConfirming(false);
      notifyFailed(error.message);
    },
  });

  if (!isNew && role.isPending) return <LoadingRows label="Loading role" />;
  if (!isNew && role.isError) return <Text c="red">{role.error.message}</Text>;
  const busy = save.isPending || remove.isPending;

  return (
    <Stack maw={720} pos="relative">
      <LoadingOverlay visible={busy} zIndex={10} />
      <Title order={1}>{isNew ? "New role" : `Role: ${loaded?.name ?? ""}`}</Title>
      <form noValidate onSubmit={form.onSubmit((values) => save.mutate(values), () => notifyFailed("Check the highlighted fields."))}>
        <Stack>
          <TextInput
            label="Role name"
            description="Lower-case letters, digits, and hyphens, for example content-author."
            withAsterisk
            disabled={!manage}
            {...form.getInputProps("name")}
          />
          <Textarea label="Description" disabled={!manage} {...form.getInputProps("description")} />
          <Checkbox.Group label="Permissions" {...form.getInputProps("permissionNames")}>
            {permissions.isPending ? (
              <LoadingRows label="Loading permissions" rows={3} />
            ) : (
              byArea(permissions.data?.data ?? []).map(([area, list]) => (
                <Stack key={area} gap="xs" mt="md">
                  <Title order={4}>{area}</Title>
                  {list.map((permission) => (
                    <Stack key={permission.name} gap={2}>
                      <Checkbox value={permission.name} label={permission.name} description={permission.description} disabled={!manage} />
                      <Text size="xs" c={MUTED} pl={32}>
                        Purpose: <span>{permission.purpose}</span>
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              ))
            )}
          </Checkbox.Group>
          <Group>
            {manage && (
              <Button type="submit" loading={save.isPending} disabled={busy}>
                Save
              </Button>
            )}
            {manage && !isNew && (
              <Button
                variant="outline"
                color="red"
                onClick={() => setConfirming(true)}
                disabled={busy || (loaded?.userCount ?? 0) > 0}
                title={(loaded?.userCount ?? 0) > 0 ? "Remove this role from its users first." : undefined}
              >
                Delete
              </Button>
            )}
            <Button component={Link} to="/roles" variant="default" disabled={busy}>
              Back
            </Button>
          </Group>
        </Stack>
      </form>
      <Modal opened={confirming} onClose={() => setConfirming(false)} title="Delete this role?">
        <Stack>
          <Text size="sm">The role and its permission choices are removed. No user has it.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button color="red" loading={remove.isPending} onClick={() => remove.mutate()}>
              Yes, delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
