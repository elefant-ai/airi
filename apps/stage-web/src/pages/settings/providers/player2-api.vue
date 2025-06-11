<script setup lang="ts">
import type { SpeechProviderWithExtraOptions } from '@xsai-ext/shared-providers'
import type { UnElevenLabsOptions } from 'unspeech'

import {
  ProviderBaseUrlInput,
  ProviderBasicSettings,
  ProviderSettingsContainer,
  ProviderSettingsLayout,
  SpeechPlayground,
} from '@proj-airi/stage-ui/components'
import { FieldRange } from '@proj-airi/ui'
import { useProvidersStore, useSpeechStore } from '@proj-airi/stage-ui/stores'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const providersStore = useProvidersStore()
const speechStore = useSpeechStore()
const { providers } = storeToRefs(providersStore)

// Get provider metadata
const providerId = 'player2-api'
const providerMetadata = computed(() => providersStore.getProviderMetadata(providerId))

const speedRatio = ref<number>(1.0)

const apiKeyConfigured = computed(() => true)

const availableVoices = computed(() => {
  return speechStore.availableVoices[providerId] || []
})

async function handleGenerateSpeech(input: string, voiceId: string, _useSSML: boolean) {
  const provider = providersStore.getProviderInstance(providerId) as SpeechProviderWithExtraOptions<string, UnElevenLabsOptions>
  if (!provider)
    throw new Error('Failed to initialize speech provider')

  const providerConfig = providersStore.getProviderConfig(providerId)
  const model = providerConfig.model as string | undefined || 'player2-model'

  return await speechStore.speech(
    provider,
    model,
    input,
    voiceId,
    {
      ...providerConfig,
    },
  )
}

const baseUrl = computed({
  get: () => providers.value[providerId]?.baseUrl || '',
  set: (value) => {
    if (!providers.value[providerId])
      providers.value[providerId] = {}

    providers.value[providerId].baseUrl = value
  },
})

onMounted(() => {
  // Initialize provider if it doesn't exist
  providersStore.initializeProvider(providerId)

  // Initialize refs with current values
  baseUrl.value = providers.value[providerId]?.baseUrl || ''
})

onMounted(async () => {
  const providerConfig = providersStore.getProviderConfig(providerId)
  const providerMetadata = providersStore.getProviderMetadata(providerId)
  if (await providerMetadata.validators.validateProviderConfig(providerConfig))
    await speechStore.loadVoicesForProvider(providerId)
  else
    console.error('Failed to validate provider config', providerConfig)
})

// Watch settings and update the provider configuration
watch(speedRatio, () => {
  const providerConfig = providersStore.getProviderConfig(providerId)
  if (!providerConfig.audio)
    providerConfig.audio = {}

  (providerConfig.audio as any).speedRatio = speedRatio.value
})

watch([baseUrl], () => {
  providers.value[providerId] = {
    ...providers.value[providerId],
    baseUrl: baseUrl.value || '',
  }
})

watch(providers, async () => {
  const providerConfig = providersStore.getProviderConfig(providerId)
  const providerMetadata = providersStore.getProviderMetadata(providerId)
  if (await providerMetadata.validators.validateProviderConfig(providerConfig))
    await speechStore.loadVoicesForProvider(providerId)
  else
    console.error('Failed to validate provider config', providerConfig)
}, { immediate: true })

function handleResetSettings() {
  providers.value[providerId] = {
    ...(providerMetadata.value?.defaultOptions as any),
  }
}
</script>

<template>
  <ProviderSettingsLayout
    :provider-name="providerMetadata?.localizedName"
    :provider-icon="providerMetadata?.icon"
    :on-back="() => router.back()"
  >
    <div flex="~ col md:row gap-6">
      <ProviderSettingsContainer class="w-full md:w-[40%]">
        <ProviderBasicSettings
          :title="t('settings.pages.providers.common.section.basic.title')"
          :description="t('settings.pages.providers.common.section.basic.description')"
          :on-reset="handleResetSettings"
        >
          <ProviderBaseUrlInput v-model="baseUrl" placeholder="http://localhost:4315/v1/" />
        </ProviderBasicSettings>

        <div flex="~ col gap-6">
          <h2 class="text-lg text-neutral-500 md:text-2xl dark:text-neutral-400">
            {{ t('settings.pages.providers.common.section.voice.title') }}
          </h2>
          <div flex="~ col gap-4">
            <FieldRange
              v-model="speedRatio"
              :label="t('settings.pages.providers.provider.common.fields.field.speed.label')"
              :description="t('settings.pages.providers.provider.common.fields.field.speed.description')"
              :min="0.5"
              :max="2.0"
              :step="0.01"
            />
          </div>
        </div>
      </ProviderSettingsContainer>

      <div flex="~ col gap-6" class="w-full md:w-[60%]">
        <SpeechPlayground
          :available-voices="availableVoices"
          :generate-speech="handleGenerateSpeech"
          :api-key-configured="apiKeyConfigured"
          default-text="Hello! This is a test of the voice synthesis."
        />
      </div>
    </div>
  </ProviderSettingsLayout>
</template>

<route lang="yaml">
  meta:
    layout: settings
    stageTransition:
      name: slide
  </route>
