import { spawnSync } from "child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

async function main() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  const jwtPrivateKey = privateKey.trimEnd().replace(/\n/g, " ");

  const vars = [
    ["SITE_URL", "http://localhost:5173"],
    ["JWT_PRIVATE_KEY", jwtPrivateKey],
    ["JWKS", jwks],
  ];

  for (const [name, value] of vars) {
    const result = spawnSync(
      "npx",
      ["convex", "env", "set", "--", name, value],
      { stdio: "inherit", cwd: process.cwd() },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    console.log(`Set ${name} on Convex deployment`);
  }

  console.log("Convex Auth keys configured.");
}

await main();
