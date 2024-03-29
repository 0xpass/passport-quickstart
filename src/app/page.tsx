"use client";
import { useState } from "react";
import { createPassportClient } from "@0xpass/passport-viem";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { usePassport } from "./hooks/usePassport";

const ENCLAVE_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvQOa1gkatuN6KjaS4KEWsVZAN9i4Cf0j9jlmBW5RwCJ3Bxo32McP7axt4Ev6sMWM24lpCgXgu68S9KBYRcrcEB6dRcaupFGd+ER7M518fiJ0VtCZ+XRnmwn9fqEvotp9DPZOysJkUQ60kugCRKwNvfZzAFcDiubwiqsUY2sCm943a/u9Hym51SEetG+ZFPJZFOBqwRSGkOgGZ+9Ac7ITE+bWLCZk9DlzRu+BIoDOFzXZIn+/0a0X8BnLtRY4g50aew4J+4OllQagBbhYnPMvYExYIEUx6bdjQicw0Js6s2pHr+SFAX23kQtbVOVxb5+KEGp1d+6Q4Gx7FBoyWI5qPQIDAQAB";

export default function Page() {
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [completingRegistration, setCompletingRegistration] = useState(false);
  const [authenticateSetup, setAuthenticateSetup] = useState(false);
  const [signMessageLoading, setSignMessageLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSignature, setMessageSignature] = useState("");
  const [authenticatedHeader, setAuthenticatedHeader] = useState({});
  const [challengeId, setChallengeId] = useState();
  const [credentialCreationOptions, setCredentialCreationOptions] = useState(
    {}
  );
  const [encryptedUser, setEncryptedUser] = useState();
  const [address, setAddress] = useState<string>();

  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL!;
  const fallbackProvider = http(alchemyUrl);

  const userInput = {
    username: username,
    userDisplayName: username,
  };

  const { passport } = usePassport({
    ENCLAVE_PUBLIC_KEY: ENCLAVE_PUBLIC_KEY,
    scope_id: "07907e39-63c6-4b0b-bca8-377d26445172",
  });

  async function initiateRegistration() {
    setRegistering(true);
    try {
      await passport.setupEncryption();
      const res = await passport.initiateRegistration(userInput);
      console.log(res);

      setChallengeId(res.challenge_id);
      setEncryptedUser(res.encrypted_user);
      setCredentialCreationOptions(res.cco_json);
      setCompletingRegistration(true);
    } catch (error) {
      console.error("Error registering:", error);
    } finally {
      setRegistering(false);
    }
  }

  async function completeRegistration() {
    setRegistering(true);
    try {
      await passport.setupEncryption();
      const res = await passport.completeRegistration(
        encryptedUser,
        challengeId,
        credentialCreationOptions
      );
      console.log(res);
      setCompletingRegistration(false);
      if (res.result.account_id) {
        setRegistering(false);
        setAuthenticating(true);
        await authenticate();
        setAuthenticating(false);
      }
    } catch (error) {
      console.error("Error registering:", error);
    } finally {
      setRegistering(false);
      setAuthenticating(false);
    }
  }

  async function authenticate() {
    setAuthenticating(true);
    try {
      await passport.setupEncryption();
      const [authenticatedHeader, address] = await passport.authenticate(
        userInput
      )!;
      setAuthenticatedHeader(authenticatedHeader);
      console.log(address);
      setAddress(address);
      setAuthenticated(true);
    } catch (error) {
      console.error("Error registering:", error);
    } finally {
      setAuthenticating(false);
    }
  }

  function createWalletClient() {
    return createPassportClient(authenticatedHeader, fallbackProvider, mainnet);
  }

  async function signMessage(message: string) {
    try {
      setSignMessageLoading(true);
      const client = createWalletClient();
      const response = await client.signMessage({
        account: "0x00",
        message,
      });

      setMessageSignature(response);
      setSignMessageLoading(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-white text-black">
      <div
        className={`text-2xl font-bold mb-8 ${
          authenticated ? "text-green-500" : "text-red-500"
        }`}
      >
        {authenticated ? "Authenticated" : "Not authenticated"}
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold underline">0xPass Quickstart</h1>
        <p className="mt-2 text-lg">
          This is a quickstart guide for the 0xPass Passport SDK.
        </p>

        <div className="flex flex-col mt-4 space-y-4">
          {authenticated ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold">Address</div>
                  <div>{address}</div>
                </div>
              </div>

              {messageSignature && (
                <div className="flex flex-col space-y-4 max-w-[60ch] break-words">
                  <div className="font-bold">Message Signature</div>
                  <div>{messageSignature}</div>
                </div>
              )}

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border border-1 rounded p-2 border-black mb-4 ml-2 text-center"
                placeholder="Message to sign"
              />
              <button
                onClick={async () => await signMessage(message)}
                disabled={signMessageLoading}
                className="border border-1 rounded p-2 border-black mb-4 ml-2"
              >
                {signMessageLoading ? "Signing..." : "Sign Message"}
              </button>
            </>
          ) : (
            <div className="mb-12 flex flex-col space-y-2 mt-8">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-1 rounded p-2 border-black mb-4 ml-2 text-center"
                placeholder="Enter unique username"
              />
              <button
                className="border border-1 rounded p-2 border-black mb-4 ml-2"
                onClick={() => {
                  if (authenticateSetup) {
                    authenticate();
                  } else if (completingRegistration) {
                    completeRegistration();
                  } else {
                    initiateRegistration();
                  }
                }}
                disabled={registering || authenticating}
              >
                {authenticateSetup
                  ? authenticating
                    ? "Authenticating..."
                    : "Authenticate"
                  : completingRegistration
                  ? registering
                    ? "Finalizing Registration..."
                    : "Click to complete registration"
                  : registering
                  ? "Setting up registration..."
                  : authenticating
                  ? "Authenticating..."
                  : "Initiate Registration"}
              </button>

              <span
                onClick={() => setAuthenticateSetup(!authenticateSetup)}
                className="cursor-pointer"
              >
                {authenticateSetup
                  ? "Register a Passkey?"
                  : "Already have a passkey?"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
