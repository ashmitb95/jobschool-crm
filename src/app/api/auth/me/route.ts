import { NextRequest } from "next/server";
import { getSessionUser, getUserPipelines, getUserOrg } from "@/lib/auth";
import { apiSuccess, apiUnauthorized } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return apiUnauthorized();

  const [pipelinesData, org] = await Promise.all([
    getUserPipelines(user.id, user.role, user.orgId),
    getUserOrg(user.orgId),
  ]);

  return apiSuccess({
    user,
    pipelines: pipelinesData,
    org: org
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
          settings: org.settings ? JSON.parse(org.settings) : null,
        }
      : null,
  });
}
