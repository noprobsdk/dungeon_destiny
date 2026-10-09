// FR-00003: shows whether studio-api is running, from GET /api/health.
import type { DeploymentVersion } from "@dungeon-destiny/contracts";
import { useEffect, useState } from "react";
import { getApi } from "../../shared/api-client";

type Status = { state: "loading" } | { state: "running"; version: DeploymentVersion } | { state: "down" };

export function ServiceStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let active = true;
    void getApi<null>("/api/health").then((result) => {
      if (!active) return;
      if (result.kind === "response" && result.body.status === "ok") {
        setStatus({ state: "running", version: result.body.meta.version });
      } else {
        setStatus({ state: "down" });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (status.state === "loading") return <p className="status">Checking studio-api…</p>;
  if (status.state === "down") return <p className="status status-down">studio-api is not responding.</p>;
  return (
    <p className="status status-ok">
      studio-api is running, version <code>{status.version.tag || status.version.id}</code>.
    </p>
  );
}
