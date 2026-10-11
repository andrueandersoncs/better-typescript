/** Non-secret, fail-closed configuration for the personal remote deployment. */
export interface ProtectedDeploymentEnv {
  TASKR_WORKER_NAME?: string;
  TASKR_WORKERS_SUBDOMAIN?: string;
  TASKR_ACCESS_TEAM_DOMAIN?: string;
  TASKR_ACCESS_AUD?: string;
  TASKR_ALLOWED_EMAIL?: string;
  TASKR_PUBLIC_DEV?: string;
}
export function protectedDeploymentConfig(env: ProtectedDeploymentEnv) {
  const workerName = env.TASKR_WORKER_NAME;
  const subdomain = env.TASKR_WORKERS_SUBDOMAIN;
  const teamDomain = env.TASKR_ACCESS_TEAM_DOMAIN;
  const audience = env.TASKR_ACCESS_AUD;
  const email = env.TASKR_ALLOWED_EMAIL;
  const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!workerName || !label.test(workerName) || !subdomain || !label.test(subdomain)) {
    throw new Error("Remote deployment requires TASKR_WORKER_NAME and TASKR_WORKERS_SUBDOMAIN (DNS labels).");
  }
  if (!teamDomain || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(teamDomain) ||
      !audience || !/^[a-f0-9]{64}$/.test(audience) ||
      !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Remote deployment requires a verified Access team domain, application audience and allowed email.");
  }
  if (env.TASKR_PUBLIC_DEV !== undefined && env.TASKR_PUBLIC_DEV !== "0" && env.TASKR_PUBLIC_DEV !== "1") {
    throw new Error("TASKR_PUBLIC_DEV must be 0 or 1; public routing defaults to disabled.");
  }
  return {
    workerName,
    hostname: `${workerName}.${subdomain}.workers.dev`,
    publicRouting: env.TASKR_PUBLIC_DEV === "1",
    env: {
      TASKR_ACCESS_TEAM_DOMAIN: teamDomain,
      TASKR_ACCESS_AUD: audience,
      TASKR_ALLOWED_EMAIL: email.toLowerCase(),
    },
  };
}
