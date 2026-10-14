import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = ["https://aufer.site", "https://www.aufer.site", "http://localhost:5173"];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60" },
  });

const safe = async (url: string) => {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "portfolio-proxy" } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
};

const PASSTHROUGH: Record<string, (id: string) => string> = {
  genshin: (id) => `https://enka.network/api/uid/${id}`,
  hsr: (id) => `https://enka.network/api/hsr/uid/${id}`,
  zzz: (id) => `https://enka.network/api/zzz/uid/${id}`,
  discord: (id) => `https://api.lanyard.rest/v1/users/${id}`,
};

// Peta ID foto profil → gambar milik Enka (di-cache selama instance function hidup)
const STORE_BASE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store";
const storeCache: Record<string, Record<string, Record<string, string>>> = {};
const getStore = async (path: string) => {
  if (storeCache[path]) return storeCache[path];
  const data = await safe(`${STORE_BASE}/${path}`);
  if (data) storeCache[path] = data;
  return data ?? {};
};

// Tambahkan `pfpUrl` (foto profil akun game yang sedang dipakai) ke respons Enka
const addProfilePicture = async (kind: string, data: any) => {
  try {
    if (kind === "genshin") {
      const pid = data?.playerInfo?.profilePicture?.id;
      const icon = pid ? (await getStore("pfps.json"))[String(pid)]?.iconPath : null;
      if (icon) data.pfpUrl = `https://enka.network/ui/${icon}.png`;
    } else if (kind === "hsr") {
      const pid = data?.detailInfo?.headIcon;
      const icon = pid ? (await getStore("hsr/pfps.json"))[String(pid)]?.Icon : null;
      if (icon) data.pfpUrl = `https://enka.network${icon}`;
    } else if (kind === "zzz") {
      const pid = data?.PlayerInfo?.SocialDetail?.ProfileDetail?.ProfileId;
      const icon = pid ? (await getStore("zzz/pfps.json"))[String(pid)]?.Icon : null;
      if (icon) data.pfpUrl = `https://enka.network${icon}`;
    }
  } catch { /* foto profil hanya pelengkap */ }
  return data;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);

  let kind = "", id = "";
  try {
    ({ kind, id } = await req.json());
  } catch {
    return json({ error: "invalid body" }, 400, origin);
  }
  id = String(id ?? "");

  // Minecraft memakai UUID (heksadesimal), bukan angka
  if (kind === "minecraft") {
    if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) return json({ error: "invalid id" }, 400, origin);
    const profile = await safe(`https://sessionserver.mojang.com/session/minecraft/profile/${id.replace(/-/g, "")}`);
    if (!profile) return json({ error: "upstream error" }, 502, origin);
    return json({ username: profile.name ?? "", uuid: profile.id ?? id }, 200, origin);
  }

  if (!/^\d{1,20}$/.test(id)) return json({ error: "invalid id" }, 400, origin);

  if (kind === "roblox-avatar") {
    const [user, thumb, head, followers, friends] = await Promise.all([
      safe(`https://users.roblox.com/v1/users/${id}`),
      safe(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`),
      safe(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`),
      safe(`https://friends.roblox.com/v1/users/${id}/followers/count`),
      safe(`https://friends.roblox.com/v1/users/${id}/friends/count`),
    ]);
    return json({
      id,
      username: user?.name ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: thumb?.data?.[0]?.imageUrl ?? "",
      headshotUrl: head?.data?.[0]?.imageUrl ?? "",
      followerCount: followers?.count ?? 0,
      friendCount: friends?.count ?? 0,
    }, 200, origin);
  }

  const build = PASSTHROUGH[kind];
  if (!build) return json({ error: "unknown kind" }, 400, origin);
  const data = await safe(build(id));
  if (data === null) return json({ error: "upstream error" }, 502, origin);
  return json(await addProfilePicture(kind, data), 200, origin);
});
