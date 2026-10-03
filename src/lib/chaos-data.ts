export const projectConfig = {
  // Set to official project URLs. Null renders an unavailable state.
  socialUrl: null as string | null,
  communityUrl: null as string | null,
};

export function systemState(index: number) {
  return index >= 65 ? "HIGHLY UNSTABLE" : index >= 35 ? "UNSTABLE" : "LOW INSTABILITY";
}
