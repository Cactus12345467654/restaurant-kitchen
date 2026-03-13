// Re-export from the canonical auth service.
// Kept for backward compatibility with any imports of "@/auth/google".
export { loginWithGoogle, loadGoogleIdentityScript, GOOGLE_CLIENT_ID } from "./service";
