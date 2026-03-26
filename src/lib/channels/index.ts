import type { ChannelProvider } from "./types";
import whatsappProvider from "./whatsapp";
import emailProvider from "./email";

export type { ChannelProvider, SendParams, SendResult } from "./types";

const providers: Record<string, ChannelProvider> = {
  whatsapp: whatsappProvider,
  email: emailProvider,
};

export function getProvider(channel: string): ChannelProvider | null {
  return providers[channel] || null;
}

export { whatsappProvider, emailProvider };
