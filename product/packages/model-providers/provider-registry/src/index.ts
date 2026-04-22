import type { ChatRequest, ChatStreamEvent } from "@ai-os/conversation-core";
import type {
  ProviderCatalogEntry,
  ModelInfo,
  ModelProvider,
  ModelProviderConfig,
  ModelProviderRequest,
  ProviderProtocol,
  ProviderRuntime,
  ProviderStatus,
} from "@ai-os/provider-protocol";
import {
  detectProviderProtocol as detectProtocol,
  getProviderCatalogEntry as getCatalogEntry,
  listProviderCatalog as listCatalogEntries,
} from "@ai-os/provider-protocol";

export class ProviderRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderRegistryError";
  }
}

export class ProviderRegistry {
  private readonly providers = new Map<ProviderProtocol, ModelProvider>();

  register(provider: ModelProvider): void {
    if (this.providers.has(provider.protocol)) {
      throw new ProviderRegistryError(`Provider protocol already registered: ${provider.protocol}`);
    }
    this.providers.set(provider.protocol, provider);
  }

  get(protocol: ProviderProtocol): ModelProvider {
    const provider = this.providers.get(protocol);
    if (!provider) {
      throw new ProviderRegistryError(`No provider registered for protocol: ${protocol}`);
    }
    return provider;
  }

  testConnection(config: ModelProviderConfig, runtime: ProviderRuntime): Promise<ProviderStatus> {
    return this.get(config.protocol).testConnection(this.createRequest(config, runtime));
  }

  listCatalog(): ProviderCatalogEntry[] {
    return listCatalogEntries();
  }

  describe(protocol: ProviderProtocol): ProviderCatalogEntry {
    return getCatalogEntry(protocol);
  }

  detectProtocol(baseUrl: string): ProviderProtocol | undefined {
    return detectProtocol(baseUrl);
  }

  listModels(config: ModelProviderConfig, runtime: ProviderRuntime): Promise<ModelInfo[]> {
    return this.get(config.protocol).listModels(this.createRequest(config, runtime));
  }

  streamChat(
    config: ModelProviderConfig,
    runtime: ProviderRuntime,
    chat: ChatRequest,
  ): AsyncIterable<ChatStreamEvent> {
    return this.get(config.protocol).streamChat(this.createRequest(config, runtime), chat);
  }

  private createRequest(config: ModelProviderConfig, runtime: ProviderRuntime): ModelProviderRequest {
    return { config, runtime };
  }
}
