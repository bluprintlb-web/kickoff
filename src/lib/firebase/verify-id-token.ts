import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies a Firebase Auth ID token server-side without the heavier
// firebase-admin SDK (which needs a service-account private key — a
// sensitive secret nobody's supplied). Firebase ID tokens are just RS256
// JWTs signed by Google's "securetoken" service account; verifying the
// signature against its public JWKS plus checking issuer/audience is the
// same check firebase-admin does internally, just without the extra
// dependency or secret.
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export interface FirebaseIdTokenClaims {
  uid: string;
  email?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  name?: string;
  picture?: string;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseIdTokenClaims> {
  if (!PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
  }

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  if (typeof payload.sub !== "string") {
    throw new Error("Firebase ID token is missing a subject claim.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: payload.email_verified === true,
    phoneNumber:
      typeof payload.phone_number === "string"
        ? payload.phone_number
        : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
