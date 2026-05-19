function extractIncidentIdFromUrl(url) {
  const m = String(url || "").match(/\/incidents\/([a-zA-Z0-9]+)/i);
  return m ? m[1] : null;
}

function pickTitle(alert) {
  const candidates = [
    alert?.summary,
    alert?.body?.cef_details?.description,
    alert?.body?.cef_details?.message,
    alert?.body?.cef_details?.details?.description,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function pickTargets(alert) {
  const raw =
    alert?.body?.cef_details?.details?.targets ?? alert?.body?.details?.targets;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.filter((t) => t && typeof t === "object" && t.labels && typeof t.labels === "object");
}

function parsePdAlertsResponse(data) {
  const alerts = data?.alerts;
  if (!Array.isArray(alerts)) return null;

  for (const alert of alerts) {
    const title = pickTitle(alert);
    if (!title) continue;
    const targets = pickTargets(alert);
    return { title, targets: targets?.length ? targets : null };
  }
  return null;
}

export async function fetchIncidentFromPagerDutyApi(url, apiToken) {
  const incidentId = extractIncidentIdFromUrl(url);
  const token = apiToken?.trim();
  if (!incidentId || !token) {
    throw new Error("Missing incident ID or API token");
  }

  const response = await fetch(`https://api.pagerduty.com/incidents/${incidentId}/alerts`, {
    headers: {
      Authorization: `Token token=${token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`PagerDuty API ${response.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
  }

  const data = await response.json();
  const parsed = parsePdAlertsResponse(data);
  if (!parsed?.title) throw new Error("No alert title found in PagerDuty API response");

  return parsed;
}
