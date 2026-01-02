/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Aether Studio Cloud Service (V5 - Programmatic Auth Edition)
 * Implements persistent auth via Service Account JSON stored in Secret Manager.
 */

export const DEFAULT_PROJECT_ID = 'veo-prompt-machine'; 
export const DEFAULT_SECRET_NAME = 'GCP-VEO-PROMPT';
export const DEFAULT_BUCKET = 'veo-prompt-machine';

// --- Programmatic Auth Utilities ---

/**
 * Encodes a string or object to Base64URL (no padding, URL safe)
 */
function base64url(source: string | Uint8Array | object): string {
    let encoded = '';
    if (typeof source === 'object' && !(source instanceof Uint8Array)) {
        encoded = btoa(JSON.stringify(source));
    } else if (typeof source === 'string') {
        encoded = btoa(source);
    } else {
        // Uint8Array
        let binary = '';
        const len = (source as Uint8Array).byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode((source as Uint8Array)[i]);
        }
        encoded = btoa(binary);
    }
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Imports an RS256 private key from PKCS#8 format (standard GCS JSON format)
 */
async function importPrivateKey(pem: string) {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter)).replace(/\s/g, '');
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );
}

/**
 * Generates an OAuth Access Token from a Service Account JSON
 */
export async function getAccessTokenFromServiceAccount(saJson: any): Promise<{ access_token: string; expires_in: number }> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
        iss: saJson.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    };

    const encodedHeader = base64url(header);
    const encodedClaim = base64url(claim);
    const signatureInput = `${encodedHeader}.${encodedClaim}`;
    
    const privateKey = await importPrivateKey(saJson.private_key);
    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${base64url(new Uint8Array(signature))}`;

    const response = await fetch(saJson.token_uri || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OAuth Exchange Failed: ${err.error_description || err.error}`);
    }

    return await response.json();
}

// --- GCS Registry & Asset Retrieval ---

export const updateWorldRegistry = async (token: string, update: any) => {
    const path = 'registry/world_graph.json';
    let registry: { projects: string[], last_sync?: string } = { projects: [] };
    
    try {
        const current = await fetch(`https://storage.googleapis.com/storage/v1/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(path)}?alt=media`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (current.ok) {
            registry = await current.json();
        }
    } catch (e) {
        console.warn("World Graph not found, creating new index.");
    }

    // Merge logic: ensure unique project entries
    const updatedProjects = Array.from(new Set([...(registry.projects || []), ...(update.projects || [])]));
    const merged = { ...registry, ...update, projects: updatedProjects };
    
    await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${DEFAULT_BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
    });
};

/**
 * Loads the entire state of a legacy project from the vault.
 */
export const legacyProjectInstaller = async (projectSlug: string, token: string) => {
    const path = `projects/${projectSlug}/state.json`;
    const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(path)}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Project ${projectSlug} not found in vault.`);
    return await response.json();
};

export const listProjectsFromVault = async (token: string) => {
    const url = `https://storage.googleapis.com/storage/v1/b/${DEFAULT_BUCKET}/o?prefix=projects/&delimiter=/`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.prefixes || []).map((p: string) => p.replace('projects/', '').replace('/', ''));
};

export const vaultAssetToLibrary = async (type: string, name: string, base64: string, metadata: any, token: string) => {
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    const basePath = `library/assets/${type}/${safeName}`;
    
    // 1. Image reference
    await uploadToGCS(`${basePath}/visual_id.png`, base64, 'image/png', token);
    
    // 2. Semantic Artifact (Narrative + Relationships)
    const artifact = { 
        ...metadata, 
        vault_id: `art_${Date.now()}`,
        source_type: type,
        semantic_version: '1.0'
    };
    
    await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${DEFAULT_BUCKET}/o?uploadType=media&name=${encodeURIComponent(basePath + '/artifact.json')}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(artifact)
    });

    return `https://storage.googleapis.com/${DEFAULT_BUCKET}/${basePath}/visual_id.png`;
};

// --- Base Operations ---

export const uploadToGCS = async (path: string, base64Data: string, mimeType: string, token: string) => {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${DEFAULT_BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': mimeType },
    body: blob
  });

  if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'GCS Upload Failed');
  }
  return `https://storage.googleapis.com/${DEFAULT_BUCKET}/${path}`;
};

export const proxyVeoToVault = async (veoUrl: string, projectSlug: string, unitId: string, token: string) => {
    const fileRes = await fetch(veoUrl);
    const blob = await fileRes.blob();
    const path = `projects/${projectSlug}/units/${unitId}/clip.mp4`;
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${DEFAULT_BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': blob.type },
        body: blob
    });
    return `https://storage.googleapis.com/${DEFAULT_BUCKET}/${path}`;
};

export const fetchSecretKey = async (token: string) => {
  const SM_PROJECT_ID = '126146302540';
  const url = `https://secretmanager.googleapis.com/v1/projects/${SM_PROJECT_ID}/secrets/${DEFAULT_SECRET_NAME}/versions/latest:access`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Secret Manager failed.');
  const data = await response.json();
  const secretContent = atob(data.payload.data);
  return secretContent;
};
