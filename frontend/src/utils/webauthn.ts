import type { WebAuthnRegisterOptions, WebAuthnAuthOptions } from '../types';

/**
 * Checks if the current client platform/browser supports WebAuthn and Passkeys.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Converts a Base64URL string into an ArrayBuffer.
 */
export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Converts an ArrayBuffer into a Base64URL string.
 */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface WebAuthnRegisterPayload {
  credentialId: string;
  publicKey: string;
  rawId: string;
  clientDataJSON: string;
  attestationObject: string;
  deviceName?: string;
  algorithm?: string;
}

export interface WebAuthnAssertionPayload {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

/**
 * Prompts the guardian to register their biometric authenticator (Touch ID, Windows Hello, Face ID, etc.).
 */
export async function createPasskeyCredential(
  options: WebAuthnRegisterOptions,
  deviceName: string = 'Platform Biometrics'
): Promise<WebAuthnRegisterPayload> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this browser.');
  }

  const publicKeyCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(options.challenge),
    rp: {
      name: options.rp.name,
      id: options.rp.id === 'localhost' ? undefined : options.rp.id,
    },
    user: {
      id: base64UrlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams.map((p) => ({
      type: p.type as 'public-key',
      alg: p.alg,
    })),
    timeout: options.timeout || 60000,
    attestation: (options.attestation as AttestationConveyancePreference) || 'none',
    authenticatorSelection: {
      authenticatorAttachment: (options.authenticatorSelection?.authenticatorAttachment as AuthenticatorAttachment) || 'platform',
      userVerification: (options.authenticatorSelection?.userVerification as UserVerificationRequirement) || 'preferred',
      requireResidentKey: options.authenticatorSelection?.requireResidentKey ?? false,
    },
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCreationOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Authenticator creation was cancelled or returned empty.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const rawIdBase64 = bufferToBase64Url(credential.rawId);
  const clientDataJSONBase64 = bufferToBase64Url(response.clientDataJSON);
  const attestationObjectBase64 = bufferToBase64Url(response.attestationObject);

  // Extract public key or DER representation if available, otherwise use rawId
  let publicKeyBase64 = rawIdBase64;
  if ('getPublicKey' in response && typeof (response as any).getPublicKey === 'function') {
    const pkBuffer = (response as any).getPublicKey();
    if (pkBuffer) {
      publicKeyBase64 = bufferToBase64Url(pkBuffer);
    }
  }

  return {
    credentialId: credential.id,
    rawId: rawIdBase64,
    publicKey: publicKeyBase64,
    clientDataJSON: clientDataJSONBase64,
    attestationObject: attestationObjectBase64,
    deviceName,
    algorithm: 'ES256',
  };
}

/**
 * Prompts the guardian for biometric co-signing assertion (Touch ID, Windows Hello, Face ID).
 */
export async function getPasskeyAssertion(
  options: WebAuthnAuthOptions
): Promise<WebAuthnAssertionPayload> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this browser.');
  }

  const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(options.challenge),
    timeout: options.timeout || 60000,
    rpId: options.rpId === 'localhost' ? undefined : options.rpId,
    userVerification: (options.userVerification as UserVerificationRequirement) || 'preferred',
    allowCredentials: options.allowCredentials?.map((cred) => ({
      id: base64UrlToBuffer(cred.id),
      type: cred.type as 'public-key',
    })),
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyRequestOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('Biometric verification cancelled or unavailable.');
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const clientDataJSONBase64 = bufferToBase64Url(response.clientDataJSON);
  const authenticatorDataBase64 = bufferToBase64Url(response.authenticatorData);
  const signatureBase64 = bufferToBase64Url(response.signature);

  return {
    credentialId: assertion.id,
    clientDataJSON: clientDataJSONBase64,
    authenticatorData: authenticatorDataBase64,
    signature: signatureBase64,
  };
}
